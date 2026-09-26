const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const HOUR_MS = 60 * 60 * 1000;
const schedulerPath = path.resolve(__dirname, '../services/jobs/job-sync.service.js');
const scriptPath = path.resolve(__dirname, '../scripts/import-jobicy.js');
const successfulImport = { inserted: 4, updated: 2, skipped: 1 };

// An explicit dependency allowlist keeps these tests entirely offline: neither
// the real importer nor MySQL is loaded, and every timer is manually advanced.
const loadScheduler = ({ env = {}, importer = async () => successfulImport } = {}) => {
  const timers = [];
  const messages = [];
  let calls = 0;
  const fakeModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(schedulerPath, 'utf8'), {
    module: fakeModule,
    process: { env },
    require(name) {
      assert.equal(name, './jobicy-import.service');
      return { importJobicyJobs: (...args) => { calls += 1; return importer(...args); } };
    },
    setTimeout(callback, delay) {
      const timer = { callback, delay, cleared: false, fired: false, unreferenced: false,
        unref() { this.unreferenced = true; } };
      timers.push(timer);
      return timer;
    },
    clearTimeout(timer) { timer.cleared = true; },
    console: { log: (text) => messages.push(text), warn: (text) => messages.push(text) },
  }, { filename: schedulerPath });

  return {
    start: fakeModule.exports.startJobSync,
    get calls() { return calls; },
    timers,
    messages,
    pending: () => timers.filter((timer) => !timer.cleared && !timer.fired),
    fire() {
      const timer = timers.find((item) => !item.cleared && !item.fired);
      assert.ok(timer, 'expected a pending timer');
      timer.fired = true;
      return timer.callback();
    },
  };
};

test('enabled scheduler returns immediately, imports later, and releases timer references', async () => {
  const scheduler = loadScheduler();
  const stop = scheduler.start();
  assert.equal(typeof stop, 'function');
  assert.equal(scheduler.calls, 0);
  assert.equal(scheduler.pending()[0].delay, 1000);
  assert.equal(scheduler.pending()[0].unreferenced, true);

  await scheduler.fire();
  assert.equal(scheduler.calls, 1);
  assert.match(scheduler.messages[0], /4 imported, 2 updated, 1 skipped/);
  assert.equal(scheduler.pending()[0].delay, 6 * HOUR_MS);
  assert.equal(scheduler.pending()[0].unreferenced, true);
  stop();
  assert.equal(scheduler.pending().length, 0);
});

test('JOB_SYNC_ENABLED=false disables all timers and imports', () => {
  const scheduler = loadScheduler({ env: { JOB_SYNC_ENABLED: ' FALSE ' } });
  scheduler.start()();
  assert.equal(scheduler.calls, 0);
  assert.equal(scheduler.timers.length, 0);
});

for (const [configured, expectedHours] of [['2.5', 2.5], ['0', 1], ['-2', 1], ['invalid', 6], ['Infinity', 6]]) {
  test(`scheduler interval ${configured} resolves to ${expectedHours} hours`, async () => {
    const scheduler = loadScheduler({ env: { JOB_SYNC_INTERVAL_HOURS: configured } });
    const stop = scheduler.start();
    await scheduler.fire();
    assert.equal(scheduler.pending()[0].delay, expectedHours * HOUR_MS);
    stop();
  });
}

test('large configured intervals cannot overflow setTimeout into a retry loop', async () => {
  const scheduler = loadScheduler({ env: { JOB_SYNC_INTERVAL_HOURS: '9999999' } });
  const stop = scheduler.start();
  await scheduler.fire();
  assert.equal(scheduler.pending()[0].delay, 2 ** 31 - 1);
  stop();
});

test('repeated starts share one scheduler and pending imports never overlap', async () => {
  let finish;
  const scheduler = loadScheduler({ importer: () => new Promise((resolve) => { finish = resolve; }) });
  const stop = scheduler.start();
  assert.equal(scheduler.start(), stop);
  assert.equal(scheduler.pending().length, 1);
  const running = scheduler.fire();
  await Promise.resolve();
  assert.equal(scheduler.calls, 1);
  assert.equal(scheduler.pending().length, 0);

  finish(successfulImport);
  await running;
  assert.equal(scheduler.pending().length, 1);
  stop();
});

test('stop before initial timer prevents all imports', async () => {
  const scheduler = loadScheduler();
  const stop = scheduler.start();
  stop();
  stop();
  assert.equal(scheduler.pending().length, 0);
  // Even an already queued callback must honor the stopped flag.
  await scheduler.timers[0].callback();
  assert.equal(scheduler.calls, 0);
});

test('stop during an import prevents rescheduling once the import finishes', async () => {
  let finish;
  const scheduler = loadScheduler({ importer: () => new Promise((resolve) => { finish = resolve; }) });
  const stop = scheduler.start();
  const running = scheduler.fire();
  await Promise.resolve();
  stop();
  finish(successfulImport);
  await running;
  assert.equal(scheduler.pending().length, 0);
});

test('restarting while a stopped scheduler finishes cannot start a second import', async () => {
  let finish;
  const scheduler = loadScheduler({ importer: () => new Promise((resolve) => { finish = resolve; }) });
  const stop = scheduler.start();
  const running = scheduler.fire();
  await Promise.resolve();
  stop();
  const stopRestarted = scheduler.start();
  await scheduler.fire();
  assert.equal(scheduler.calls, 1);
  assert.equal(scheduler.pending()[0].delay, 6 * HOUR_MS);
  finish(successfulImport);
  await running;
  assert.equal(scheduler.pending().length, 1);
  stopRestarted();
});

test('synchronous importer errors are caught, logged safely, and retried after the interval', async () => {
  const scheduler = loadScheduler({ importer() { throw new Error('private-provider-token'); } });
  const stop = scheduler.start();
  await scheduler.fire();
  assert.match(scheduler.messages[0], /Sync failed/);
  assert.equal(scheduler.messages.join(' ').includes('private-provider-token'), false);
  assert.equal(scheduler.pending()[0].delay, 6 * HOUR_MS);
  stop();
});

for (const [retryAfterSeconds, expectedHours] of [[30, 6], [8 * 3600, 8], ['invalid', 6]]) {
  test(`source rate limit retryAfterSeconds=${retryAfterSeconds} avoids a busy retry`, async () => {
    const scheduler = loadScheduler({ importer: async () => {
      throw Object.assign(new Error('Rate limited'), { code: 'IMPORT_RATE_LIMIT', retryAfterSeconds });
    } });
    const stop = scheduler.start();
    await scheduler.fire();
    assert.match(scheduler.messages[0], /Sync deferred/);
    assert.equal(scheduler.pending()[0].delay, expectedHours * HOUR_MS);
    stop();
  });
}

const loadImportScript = ({ failInitialize = false, failImport = false, failClose = false } = {}) => {
  const calls = [];
  const messages = [];
  const fakeProcess = {};
  const fakeModule = { exports: {} };
  let dotenvOptions;
  const fakeRequire = (name) => {
    if (name === 'node:path') return path;
    if (name === 'dotenv') return { config(options) { dotenvOptions = options; } };
    if (name === '../config/database') return {
      initializeDatabase: async () => {
        calls.push('initialize');
        if (failInitialize) throw new Error('Database unavailable');
      },
      pool: { end: async () => {
        calls.push('close');
        if (failClose) throw new Error('Close failed');
      } },
    };
    if (name === '../services/jobs/jobicy-import.service') return {
      importJobicyJobs: async (...args) => {
        assert.equal(args.length, 0, 'the importer must own count configuration');
        calls.push('import');
        if (failImport) throw new Error('Source unavailable');
        return successfulImport;
      },
    };
    throw new Error(`Unexpected CLI dependency: ${name}`);
  };
  vm.runInNewContext(fs.readFileSync(scriptPath, 'utf8'), {
    require: fakeRequire,
    module: fakeModule,
    process: fakeProcess,
    __dirname: path.dirname(scriptPath),
    console: { log: (text) => messages.push(text), error: (text) => messages.push(text) },
  }, { filename: scriptPath });
  return { run: fakeModule.exports.run, calls, messages, dotenvOptions, process: fakeProcess };
};

test('CLI loads backend/.env by absolute path and initializes/imports/closes in order', async () => {
  const script = loadImportScript();
  assert.equal(script.dotenvOptions.path, path.resolve(__dirname, '../.env'));
  assert.equal(script.dotenvOptions.quiet, true);
  assert.deepEqual(script.calls, []);
  await script.run();
  assert.deepEqual(script.calls, ['initialize', 'import', 'close']);
  assert.match(script.messages[0], /4 imported, 2 updated, 1 skipped/);
  assert.equal(script.process.exitCode, undefined);
});

for (const failure of ['failInitialize', 'failImport', 'failClose']) {
  test(`CLI failure ${failure} still closes the pool and reports a failed exit`, async () => {
    const script = loadImportScript({ [failure]: true });
    await script.run();
    assert.equal(script.calls.at(-1), 'close');
    assert.equal(script.process.exitCode, 1);
    if (failure !== 'failClose') assert.equal(script.messages.some((message) => /import complete/.test(message)), false);
  });
}
