const assert = require('node:assert/strict');
const test = require('node:test');
const OpenAI = require('openai');
const { toOpenAIError, sendOpenAIError } = require('../services/ai/openai.errors');

const TEST_API_KEY = 'sk-test-key-never-send-to-openai';
const TEST_MODEL = 'gpt-4o-mini';
const servicePath = require.resolve('../services/ai/openai.service');

test.beforeEach((t) => {
  const environment = {
    OPENAI_API_KEY: TEST_API_KEY,
    OPENAI_MODEL: TEST_MODEL,
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_LOG: 'off',
  };
  const originals = Object.fromEntries(Object.keys(environment).map((key) => [key, process.env[key]]));
  Object.assign(process.env, environment);
  const cachedService = require.cache[servicePath];
  delete require.cache[servicePath];
  t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Unexpected fetch: all OpenAI requests must be mocked');
  });
  t.after(() => {
    for (const [key, value] of Object.entries(originals)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    if (cachedService) require.cache[servicePath] = cachedService;
    else delete require.cache[servicePath];
  });
});

const loadService = (t, fetchImplementation) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', fetchImplementation);
  return { ...require(servicePath), fetchMock };
};

const analysis = () => ({
  strengths: ['JavaScript projects'],
  weaknesses: ['Project outcomes are unclear'],
  suggestions: ['Describe measurable project outcomes'],
  missingSkills: ['Testing'],
  overallFeedback: 'The projects provide a useful starting point.',
  actionPlan: [{ priority: 'Cao', action: 'Add project outcomes', expectedImpact: 'Clearer evidence of skills' }],
});

const jsonResponse = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', ...headers },
});
const completion = () => jsonResponse({
  id: 'chatcmpl-test',
  object: 'chat.completion',
  model: TEST_MODEL,
  choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(analysis()) } }],
});
const providerFailure = (code, status = 429, headers = {}) => jsonResponse({
  error: { code, type: code, message: 'PRIVATE_PROVIDER_DIAGNOSTIC' },
}, status, headers);
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
const apiResponse = () => ({
  headers: {},
  setHeader(name, value) { this.headers[name] = value; },
  status(value) { this.statusCode = value; return this; },
  json(value) { this.body = value; return this; },
});

test('analysis sends one schema request and returns the full public analysis', async (t) => {
  const { analyzeCV, fetchMock } = loadService(t, async () => completion());
  assert.deepEqual(await analyzeCV('JavaScript student CV'), { success: true, data: analysis() });
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(String(url), 'https://api.openai.com/v1/chat/completions');
  const request = JSON.parse(options.body);
  assert.equal(request.model, TEST_MODEL);
  assert.equal(request.response_format.type, 'json_schema');
  assert.equal(request.response_format.json_schema.strict, true);
  assert.equal(request.response_format.json_schema.name, 'cv_analysis');
  assert.match(request.messages[1].content, /JavaScript student CV/);
  assert.equal(options.headers.get('authorization'), `Bearer ${TEST_API_KEY}`);
  assert.equal(options.body.includes(TEST_API_KEY), false);
});

test('quota exhaustion makes no automatic SDK retry and does not claim a temporary delay', async (t) => {
  const { analyzeCV, fetchMock } = loadService(t, async () => providerFailure('insufficient_quota'));
  await assert.rejects(analyzeCV('Quota failure CV'), (error) => {
    assert.equal(error.code, 'OPENAI_QUOTA_EXCEEDED');
    assert.equal(error.status, 402);
    assert.equal(error.retryAfterSeconds, undefined);
    assert.equal(`${error.message}${JSON.stringify(error)}`.includes('PRIVATE_PROVIDER_DIAGNOSTIC'), false);
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('chat diagnostic verifies inference with a tiny schema request without models.read', async (t) => {
  const { checkOpenAIChat, fetchMock } = loadService(t, async () => jsonResponse({
    choices: [{ message: { content: '{"ok":true}' } }],
  }));
  assert.deepEqual(await checkOpenAIChat(), { model: TEST_MODEL, chat: true, structuredOutput: true });
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(String(url), 'https://api.openai.com/v1/chat/completions');
  const request = JSON.parse(options.body);
  assert.equal(request.model, TEST_MODEL);
  assert.equal(request.max_tokens, 32);
  assert.equal(request.response_format.type, 'json_schema');
  assert.equal(request.response_format.json_schema.strict, true);
  assert.equal(options.headers.get('authorization'), `Bearer ${TEST_API_KEY}`);
});

test('model metadata access does not hide a quota failure on the chat endpoint', async (t) => {
  const { checkOpenAIConnection, checkOpenAIChat, fetchMock } = loadService(t, async (url) => {
    if (String(url).includes('/models/')) return jsonResponse({ id: TEST_MODEL });
    return providerFailure('insufficient_quota');
  });
  assert.deepEqual(await checkOpenAIConnection(), { model: TEST_MODEL });
  await assert.rejects(checkOpenAIChat(), { code: 'OPENAI_QUOTA_EXCEEDED', status: 402 });
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('chat diagnostic rejects syntactically valid JSON that does not confirm success', async (t) => {
  const { checkOpenAIChat } = loadService(t, async () => jsonResponse({
    choices: [{ message: { content: '{"ok":false}' } }],
  }));
  await assert.rejects(checkOpenAIChat(), { code: 'OPENAI_INVALID_RESPONSE' });
});

test('fixing quota lets the next chat request succeed without a cached billing failure', async (t) => {
  let calls = 0;
  const { checkOpenAIChat, fetchMock } = loadService(t, async () => ++calls === 1
    ? providerFailure('insufficient_quota')
    : jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] }));
  await assert.rejects(checkOpenAIChat(), { code: 'OPENAI_QUOTA_EXCEEDED' });
  assert.equal((await checkOpenAIChat()).chat, true);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('forbidden API access is reported as permission denied without expiring application login', async (t) => {
  const { checkOpenAIConnection, checkOpenAIChat, fetchMock } = loadService(t, async () => providerFailure('insufficient_permissions', 403));
  await assert.rejects(checkOpenAIConnection(), { code: 'OPENAI_PERMISSION_DENIED', status: 503 });
  await assert.rejects(checkOpenAIChat(), { code: 'OPENAI_PERMISSION_DENIED', status: 503 });
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('quota messages distinguish depleted credits from project and organization limits', () => {
  for (const [code, expected] of [
    ['credit_balance_exhausted', /hết số dư API/],
    ['project_spend_limit_exceeded', /project.*giới hạn chi tiêu/],
    ['organization_spend_limit_exceeded', /tổ chức.*giới hạn chi tiêu/],
    ['organization_usage_limit_exceeded', /giới hạn sử dụng được cấp/],
    ['billing_not_active', /chưa được kích hoạt/],
    ['billing_hard_limit_reached', /giới hạn thanh toán/],
  ]) {
    const error = toOpenAIError({ status: 429, code, type: 'insufficient_quota', message: TEST_API_KEY });
    assert.equal(error.code, 'OPENAI_QUOTA_EXCEEDED');
    assert.match(error.message, expected);
    const res = apiResponse();
    sendOpenAIError(res, error);
    assert.match(res.body.message, expected);
    assert.equal(res.body.provider, undefined);
    assert.equal(res.body.retryAfterSeconds, undefined);
    assert.equal(res.headers['Retry-After'], undefined);
    assert.equal(JSON.stringify(res.body).includes(TEST_API_KEY), false);
  }
});

test('provider Retry-After blocks all inference until its deadline and then permits recovery', async (t) => {
  let now = 1700000000000;
  t.mock.method(Date, 'now', () => now);
  let calls = 0;
  const { analyzeCV, improveCV, fetchMock } = loadService(t, async () => {
    calls += 1;
    return calls === 1
      ? providerFailure('rate_limit_exceeded', 429, { 'retry-after': '120', 'x-request-id': 'req-rate-limit-test' })
      : completion();
  });
  await assert.rejects(analyzeCV('First CV'), { code: 'OPENAI_RATE_LIMITED', retryAfterSeconds: 120 });
  assert.equal(fetchMock.mock.callCount(), 1);
  now += 12500;
  await assert.rejects(analyzeCV('Different CV'), { code: 'OPENAI_RATE_LIMITED', retryAfterSeconds: 108 });
  await assert.rejects(improveCV('Other endpoint CV'), { code: 'OPENAI_RATE_LIMITED', retryAfterSeconds: 108 });
  assert.equal(fetchMock.mock.callCount(), 1);
  now += 107499;
  await assert.rejects(analyzeCV('First CV'), { code: 'OPENAI_RATE_LIMITED', retryAfterSeconds: 1 });
  now += 1;
  assert.deepEqual(await analyzeCV('First CV'), { success: true, data: analysis() });
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('identical simultaneous analysis shares a network request and later analysis can run again', async (t) => {
  const pending = deferred();
  const started = deferred();
  let calls = 0;
  const { analyzeCV, fetchMock } = loadService(t, async () => {
    calls += 1;
    started.resolve();
    return calls === 1 ? pending.promise : completion();
  });
  const first = analyzeCV('Shared CV');
  const second = analyzeCV('Shared CV');
  await started.promise;
  assert.equal(fetchMock.mock.callCount(), 1);
  pending.resolve(completion());
  assert.deepEqual(await Promise.all([first, second]), [
    { success: true, data: analysis() }, { success: true, data: analysis() },
  ]);
  assert.deepEqual(await analyzeCV('Shared CV'), { success: true, data: analysis() });
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('rejected shared analysis clears the pending request so retry can recover', async (t) => {
  const pending = deferred();
  const started = deferred();
  let calls = 0;
  const { analyzeCV, fetchMock } = loadService(t, async () => {
    calls += 1;
    started.resolve();
    return calls === 1 ? pending.promise : completion();
  });
  const first = assert.rejects(analyzeCV('Retry shared CV'), { code: 'OPENAI_UNAVAILABLE' });
  const second = assert.rejects(analyzeCV('Retry shared CV'), { code: 'OPENAI_UNAVAILABLE' });
  await started.promise;
  assert.equal(fetchMock.mock.callCount(), 1);
  pending.reject(new TypeError('fetch failed'));
  await Promise.all([first, second]);
  assert.deepEqual(await analyzeCV('Retry shared CV'), { success: true, data: analysis() });
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('different analysis inputs keep separate network requests', async (t) => {
  const { analyzeCV, fetchMock } = loadService(t, async () => completion());
  await Promise.all([analyzeCV('First student CV'), analyzeCV('Second student CV')]);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('changing API key resets the old client cooldown', async (t) => {
  let calls = 0;
  const { analyzeCV, fetchMock } = loadService(t, async () => {
    calls += 1;
    return calls === 1 ? providerFailure('rate_limit_exceeded', 429, { 'retry-after': '60' }) : completion();
  });
  await assert.rejects(analyzeCV('Key change CV'), { code: 'OPENAI_RATE_LIMITED' });
  process.env.OPENAI_API_KEY = 'sk-another-test-key';
  assert.deepEqual(await analyzeCV('Key change CV'), { success: true, data: analysis() });
  assert.equal(fetchMock.mock.callCount(), 2);
  assert.equal(fetchMock.mock.calls[1].arguments[1].headers.get('authorization'), 'Bearer sk-another-test-key');
});

test('provider authentication errors use HTTP 503 without expiring application login', async (t) => {
  const { analyzeCV, fetchMock } = loadService(t, async () => providerFailure('invalid_api_key', 401));
  await assert.rejects(analyzeCV('Invalid provider key CV'), (error) => {
    assert.equal(error.code, 'OPENAI_API_KEY_INVALID');
    assert.equal(error.status, 503);
    const res = apiResponse();
    assert.equal(sendOpenAIError(res, error), true);
    assert.equal(res.statusCode, 503);
    assert.equal(res.body.code, 'OPENAI_API_KEY_INVALID');
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('actual SDK connection and timeout classes retain their distinct classifications', () => {
  for (const [cause, code, status] of [
    [new OpenAI.APIConnectionError({ message: 'Connection unavailable' }), 'OPENAI_UNAVAILABLE', 503],
    [new OpenAI.APIConnectionTimeoutError({ message: 'Request expired' }), 'OPENAI_TIMEOUT', 504],
  ]) {
    const error = toOpenAIError(cause);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
  }
});

for (const [name, cause] of [
  ['top-level code', { code: 'insufficient_quota' }],
  ['top-level type', { type: 'insufficient_quota' }],
  ['nested code', { error: { code: 'insufficient_quota' } }],
  ['nested type', { error: { type: 'insufficient_quota' } }],
  ['billing hard limit', { code: 'billing_hard_limit_reached' }],
  ['billing inactive', { error: { type: 'billing_not_active' } }],
  ['credit balance exhausted', { code: 'credit_balance_exhausted' }],
  ['organization spend limit', { code: 'organization_spend_limit_exceeded' }],
  ['project spend limit', { code: 'project_spend_limit_exceeded' }],
  ['organization usage limit', { code: 'organization_usage_limit_exceeded' }],
  ['billing message', { message: 'You exceeded your current quota, please check your plan and billing details.' }],
  ['nested balance message', { error: { message: 'Insufficient credits for this request.' } }],
]) {
  test(`quota classification recognizes ${name} even when Retry-After is supplied`, () => {
    const error = toOpenAIError({ status: 429, headers: { 'retry-after': '30' }, ...cause });
    assert.equal(error.code, 'OPENAI_QUOTA_EXCEEDED');
    assert.equal(error.status, 402);
    assert.equal(error.retryAfterSeconds, undefined);
  });
}

test('unknown HTTP 429 reports usage limits without inventing a reset time', () => {
  const error = toOpenAIError({ status: 429, error: { message: 'PRIVATE_UNKNOWN_PROVIDER_DIAGNOSTIC' } });
  assert.equal(error.code, 'OPENAI_USAGE_LIMIT');
  assert.equal(error.retryAfterSeconds, undefined);
  const res = apiResponse();
  sendOpenAIError(res, error);
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.code, 'OPENAI_USAGE_LIMIT');
  assert.equal(res.body.retryAfterSeconds, undefined);
  assert.equal(res.headers['Retry-After'], undefined);
  assert.equal(JSON.stringify(res.body).includes('PRIVATE_UNKNOWN_PROVIDER_DIAGNOSTIC'), false);
});

test('known rate limits without a provider deadline do not invent a delay', () => {
  for (const cause of [
    { error: { code: 'rate_limit_exceeded' } },
    { code: 'rate_limit_exceeded' },
    { code: 'slow_down' },
    { type: 'rate_limit_error' },
  ]) {
    const error = toOpenAIError({ status: 429, ...cause });
    assert.equal(error.code, 'OPENAI_RATE_LIMITED');
    assert.equal(error.retryAfterSeconds, undefined);
  }
});

test('Retry-After supports header objects, milliseconds, HTTP dates and preserves long delays', (t) => {
  const now = Date.UTC(2026, 0, 1, 0, 0, 0);
  t.mock.method(Date, 'now', () => now);
  for (const [headers, expected] of [
    [{ 'Retry-After': '180' }, 180],
    [new Headers({ 'retry-after-ms': '1501', 'retry-after': '60' }), 2],
    [{ 'retry-after': new Date(now + 90000).toUTCString() }, 90],
  ]) {
    const error = toOpenAIError({ status: 429, code: 'rate_limit_exceeded', headers });
    assert.equal(error.retryAfterSeconds, expected);
    const res = apiResponse();
    sendOpenAIError(res, error);
    assert.equal(res.headers['Retry-After'], String(expected));
    assert.equal(res.body.retryAfterSeconds, expected);
  }
});

test('malformed or expired Retry-After does not produce a retry delay', () => {
  for (const value of ['', 'invalid', '-1', '0', 'Infinity', 'Wed, 01 Jan 2020 00:00:00 GMT']) {
    const error = toOpenAIError({ status: 429, code: 'rate_limit_exceeded', headers: { 'retry-after': value } });
    assert.equal(error.retryAfterSeconds, undefined, value);
  }
});

test('rate-limit reset fallback uses only exhausted resources and waits for all of them', () => {
  const tokenHeaders = {
    'x-ratelimit-remaining-tokens': '0',
    'x-ratelimit-reset-tokens': '1m30s',
    'x-ratelimit-remaining-requests': '2',
    'x-ratelimit-reset-requests': '1h',
  };
  for (const retryAfter of [undefined, 'invalid']) {
    const headers = { ...tokenHeaders, ...(retryAfter ? { 'retry-after': retryAfter } : {}) };
    const error = toOpenAIError({ status: 429, headers });
    assert.equal(error.code, 'OPENAI_RATE_LIMITED');
    assert.equal(error.retryAfterSeconds, 90);
  }
  const bothExhausted = toOpenAIError({ status: 429, headers: {
    ...tokenHeaders, 'x-ratelimit-remaining-requests': '0',
  } });
  assert.equal(bothExhausted.retryAfterSeconds, 3600);
});

test('missing, malformed or nonexhausted reset headers do not invent a delay', () => {
  for (const headers of [
    {},
    { 'x-ratelimit-reset-tokens': '1m30s' },
    { 'x-ratelimit-remaining-tokens': '0' },
    { 'x-ratelimit-remaining-tokens': '2', 'x-ratelimit-reset-tokens': '1m30s' },
    { 'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-reset-tokens': 'invalid' },
    { 'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-reset-tokens': '-1s' },
    { 'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-reset-tokens': '0s' },
  ]) {
    const error = toOpenAIError({ status: 429, headers });
    assert.equal(error.code, 'OPENAI_USAGE_LIMIT', JSON.stringify(headers));
    assert.equal(error.retryAfterSeconds, undefined);
  }
});

test('only safe provider identifiers survive classification and no diagnostics reach the client', () => {
  const privateText = 'PRIVATE_CV_AND_PROVIDER_PAYLOAD';
  const error = toOpenAIError({
    status: 429,
    code: 'rate_limit_exceeded',
    type: 'requests',
    message: `${privateText} ${TEST_API_KEY}`,
    error: { message: privateText, cv: privateText },
    headers: { 'x-request-id': 'req_safe-123', 'retry-after': '3' },
  });
  assert.deepEqual(error.provider, { status: 429, code: 'rate_limit_exceeded', type: 'requests', requestId: 'req_safe-123' });
  assert.equal(`${error.message}${JSON.stringify(error)}`.includes(privateText), false);
  assert.equal(`${error.message}${JSON.stringify(error)}`.includes(TEST_API_KEY), false);
  const res = apiResponse();
  sendOpenAIError(res, error);
  assert.equal(res.body.provider, undefined);
  assert.equal(JSON.stringify(res.body).includes('req_safe-123'), false);
  assert.equal(JSON.stringify(res.body).includes(privateText), false);
  const unsafe = toOpenAIError({ status: 429, code: TEST_API_KEY, type: 'private value with spaces', requestID: TEST_API_KEY });
  assert.deepEqual(unsafe.provider, { status: 429, code: undefined, type: undefined, requestId: undefined });
});
