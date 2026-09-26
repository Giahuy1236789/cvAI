const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const backendDirectory = path.resolve(__dirname, '..');
const serverPath = path.join(backendDirectory, 'server.js');
const expectedEnvPath = path.join(backendDirectory, '.env');

// Run the real startup and dotenv loader in isolation. Replace every .env read
// with test data, and stub application dependencies before they can start I/O.
function inspectStartup() {
  const fs = require('node:fs');
  const path = require('node:path');
  const Module = require('node:module');
  const envReads = [];
  const originalRead = fs.readFileSync;
  fs.readFileSync = function (file, ...args) {
    if (typeof file === 'string' && path.basename(file) === '.env') {
      envReads.push(path.resolve(file));
      return 'OPENAI_API_KEY=test-file-key\nOPENAI_MODEL=test-file-model\n';
    }
    return originalRead.call(this, file, ...args);
  };

  const middleware = () => {};
  const app = { use() {}, get() {}, listen() { throw new Error('HTTP must not start in this test'); } };
  const express = () => app;
  express.json = express.urlencoded = express.static = () => middleware;
  const originalLoad = Module._load;
  Module._load = function (request, ...args) {
    if (request === 'express') return express;
    if (request === 'cors') return () => middleware;
    if (request === './config/database') {
      return { initializeDatabase: () => new Promise(() => {}) };
    }
    if (request.startsWith('./routes/')) return middleware;
    return originalLoad.call(this, request, ...args);
  };

  require(process.argv[1]);
  process.stdout.write(JSON.stringify({
    envReads,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
  }));
}

for (const [location, cwd] of [
  ['workspace', path.dirname(backendDirectory)],
  ['backend', backendDirectory],
]) {
  for (const existingKey of [undefined, 'test-process-key']) {
    test(`startup from ${location} loads backend/.env and ${existingKey ? 'preserves the process key' : 'uses the file key'}`, () => {
      const result = spawnSync(process.execPath, ['-e', `(${inspectStartup.toString()})();`, serverPath], {
        cwd,
        encoding: 'utf8',
        timeout: 5000,
        // Do not inherit any real API key, dotenv setting, or database secret.
        env: { DOTENV_CONFIG_QUIET: 'true', ...(existingKey ? { OPENAI_API_KEY: existingKey } : {}) },
      });
      assert.ifError(result.error);
      assert.equal(result.status, 0, result.stderr);
      const startup = JSON.parse(result.stdout);
      assert.deepEqual(startup.envReads, [expectedEnvPath]);
      assert.equal(startup.apiKey, existingKey || 'test-file-key');
      assert.equal(startup.model, 'test-file-model');
    });
  }
}
