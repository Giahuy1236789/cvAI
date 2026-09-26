const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const scriptPath = path.resolve(__dirname, '../scripts/check-ai.js');
const source = fs.readFileSync(scriptPath, 'utf8');
const fileSettings = { OPENAI_API_KEY: 'private-test-file-key', OPENAI_MODEL: 'test-model' };

// Execute only the CLI source, with a separate process environment and an
// explicit module allowlist. Neither real dotenv nor the AI service is loaded.
function loadCheck({ env = {}, parsed = fileSettings, args = [], cli = false, failure } = {}) {
  const calls = [];
  const messages = { log: [], warn: [], error: [] };
  const fakeProcess = { env: { ...env }, argv: ['node', scriptPath, ...args] };
  const fakeModule = { exports: {} };
  let dotenvOptions;
  const service = {
    OPENAI_MODEL: env.OPENAI_MODEL || parsed.OPENAI_MODEL,
    checkOpenAIConnection: async () => {
      calls.push({ operation: 'metadata' });
      if (failure) throw failure;
      return { model: 'test-model' };
    },
    checkOpenAIChat: async () => {
      calls.push({ operation: 'chat' });
      if (failure) throw failure;
      return { model: 'test-model', jsonSchema: true };
    },
    analyzeCV: async (content) => {
      calls.push({ operation: 'analysis', content });
      if (failure) throw failure;
      return { success: true, data: { overallFeedback: 'Sample feedback', actionPlan: [{ action: 'Add outcomes' }] } };
    },
  };
  const fakeRequire = (name) => {
    if (name === 'node:path') return path;
    if (name === 'dotenv') return {
      config(options) {
        dotenvOptions = options;
        for (const [key, value] of Object.entries(parsed)) {
          if (fakeProcess.env[key] === undefined) fakeProcess.env[key] = value;
        }
        return { parsed: { ...parsed } };
      },
    };
    if (name === '../services/ai/openai.service') return service;
    if (name === '../services/ai/openai.errors') return {
      isOpenAIError: (error) => error?.code?.startsWith('OPENAI_'),
    };
    throw new Error(`Unexpected dependency in CLI test: ${name}`);
  };
  fakeRequire.main = cli ? fakeModule : undefined;
  vm.runInNewContext(source, {
    require: fakeRequire,
    module: fakeModule,
    process: fakeProcess,
    __dirname: path.dirname(scriptPath),
    URL,
    console: Object.fromEntries(Object.keys(messages).map((level) => [
      level, (...parts) => messages[level].push(parts.join(' ')),
    ])),
  }, { filename: scriptPath });
  return { main: fakeModule.exports.main, calls, messages, process: fakeProcess, dotenvOptions };
}

test('--config reports configuration without making an API request', async () => {
  const check = loadCheck();
  await check.main(['--config']);
  assert.deepEqual(check.calls, []);
  assert.equal(check.dotenvOptions.path, path.resolve(__dirname, '../.env'));
  assert.equal(check.dotenvOptions.quiet, true);
  const configuration = JSON.parse(check.messages.log[0]);
  assert.equal(configuration.apiHost, 'api.openai.com');
  assert.equal(configuration.keyConfigured, true);
  assert.equal(configuration.keySource, 'backend/.env');
  assert.equal(check.messages.log.join('\n').includes(fileSettings.OPENAI_API_KEY), false);
});

test('--chat checks Chat Completions directly without reading model metadata', async () => {
  const check = loadCheck();
  await check.main(['--chat']);
  assert.deepEqual(check.calls, [{ operation: 'chat' }]);
  assert.equal(JSON.parse(check.messages.log[2]).success, true);
});

test('--smoke analyzes only the sample CV without reading model metadata', async () => {
  const check = loadCheck();
  await check.main(['--smoke']);
  assert.equal(check.calls.length, 1);
  assert.equal(check.calls[0].operation, 'analysis');
  assert.match(check.calls[0].content, /JavaScript, React/);
  const result = JSON.parse(check.messages.log[2]);
  assert.equal(result.success, true);
  assert.equal(result.feedback, 'Sample feedback');
  assert.equal(result.actions, 1);
});

test('no flag checks metadata only and does not claim inference quota is available', async () => {
  const check = loadCheck();
  await check.main([]);
  assert.deepEqual(check.calls, [{ operation: 'metadata' }]);
  assert.match(check.messages.log.join('\n'), /chưa xác nhận hạn mức tạo nội dung/);
});

test('unsupported or combined flags fail before making an API request', async () => {
  for (const args of [['--unknown'], ['--chat', '--smoke'], ['--config', 'extra']]) {
    const check = loadCheck();
    await assert.rejects(check.main(args), { code: 'CHECK_USAGE' });
    assert.deepEqual(check.calls, []);
    assert.deepEqual(check.messages.log, []);
  }
});

test('environment override warnings identify variable names without leaking credentials', async () => {
  const parsed = {
    ...fileSettings,
    OPENAI_ORG_ID: 'private-file-organization',
    OPENAI_PROJECT_ID: 'private-file-project',
  };
  const env = {
    OPENAI_API_KEY: 'private-process-key',
    OPENAI_ORG_ID: 'private-process-organization',
    OPENAI_PROJECT_ID: 'private-process-project',
  };
  const check = loadCheck({ env, parsed });
  await check.main(['--config']);
  assert.deepEqual(check.calls, []);
  assert.equal(check.messages.warn.length, 1);
  for (const name of Object.keys(env)) assert.ok(check.messages.warn[0].includes(name));
  const output = Object.values(check.messages).flat().join('\n');
  for (const secret of [...Object.values(env), parsed.OPENAI_API_KEY, parsed.OPENAI_ORG_ID, parsed.OPENAI_PROJECT_ID]) {
    assert.equal(output.includes(secret), false);
  }
  const configuration = JSON.parse(check.messages.log[0]);
  assert.equal(configuration.keySource, 'process environment');
  assert.equal(configuration.organizationConfigured, true);
  assert.equal(configuration.projectConfigured, true);
});

test('CLI quota errors set failure status and provide billing diagnostics without retrying', async () => {
  const failure = Object.assign(new Error('Insufficient API quota.'), {
    code: 'OPENAI_QUOTA_EXCEEDED',
    provider: { code: 'insufficient_quota', requestId: 'req-test' },
  });
  const check = loadCheck({ cli: true, args: ['--chat'], failure });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(check.calls, [{ operation: 'chat' }]);
  assert.equal(check.process.exitCode, 1);
  const diagnostic = check.messages.error.join('\n');
  assert.match(diagnostic, /OPENAI_QUOTA_EXCEEDED/);
  assert.match(diagnostic, /insufficient_quota/);
  assert.match(diagnostic, /req-test/);
  assert.match(diagnostic, /platform\.openai\.com\/settings\/organization\/billing\/overview/);
  assert.match(diagnostic, /platform\.openai\.com\/settings\/organization\/limits/);
  assert.doesNotMatch(diagnostic, /yêu cầu chờ/);
});
