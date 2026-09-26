const assert = require('node:assert/strict');
const { test } = require('node:test');

const TEST_API_KEY = 'test-gemini-key-never-send-to-google';
process.env.GEMINI_API_KEY = TEST_API_KEY;

// Exercise the default deadline regardless of the shell's local configuration.
const configuredTimeout = process.env.GEMINI_TIMEOUT_MS;
delete process.env.GEMINI_TIMEOUT_MS;
const {
  generateCVContent,
  analyzeCV,
  improveCV,
  recommendJobsWithAI,
  checkGeminiConnection,
  GEMINI_MODEL,
} = require('../services/ai/gemini.service');
if (configuredTimeout !== undefined) process.env.GEMINI_TIMEOUT_MS = configuredTimeout;

const analysis = () => ({
  cvScore: 72,
  skillScore: 80,
  experienceScore: 60,
  educationScore: 90,
  projectScore: 70,
  strengths: ['JavaScript'],
  weaknesses: ['Limited experience'],
  suggestions: ['Describe project outcomes'],
  missingSkills: ['Testing'],
  overallFeedback: 'A useful starting point.',
  actionPlan: [{ priority: 'Cao', action: 'Add project outcomes', expectedImpact: 'Clearer evidence' }],
});

const content = () => ({
  careerObjective: 'Work as a developer',
  summary: 'IT student',
  experienceDescriptions: [{ id: 'experience-1', improvedDescription: 'Built a website' }],
  projectDescriptions: [{ id: 'project-1', improvedDescription: 'Created an application' }],
  skillsPresentation: 'JavaScript',
});

const improvements = () => ({
  improvements: [{ section: 'Projects', suggestion: 'Describe your contribution', priority: 'high' }],
  additionalSkills: ['Testing'],
  formatting: ['Use consistent headings'],
});

const recommendation = (jobId = 'job-1') => ({
  jobId,
  score: 80,
  reason: 'Relevant JavaScript experience',
  matchedSkills: ['JavaScript'],
  missingSkills: ['Testing'],
  preparationSteps: ['Review the project code'],
});

const jobs = [{ id: 'job-1', title: 'Developer', skills: ['JavaScript'] }];
const response = (data, extra = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] }, finishReason: 'STOP', ...extra }] }),
});
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
};
const rejectOnAbort = (signal) => new Promise((_, reject) => {
  signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
});

test('a missing Gemini API key fails before attempting network access', async (t) => {
  delete process.env.GEMINI_API_KEY;
  t.after(() => { process.env.GEMINI_API_KEY = TEST_API_KEY; });
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected network call'); });
  for (const operation of [
    () => analyzeCV('Missing key CV'),
    () => generateCVContent({ fullName: 'Student' }),
    () => improveCV('Student CV'),
    () => recommendJobsWithAI({}, jobs),
    () => checkGeminiConnection(),
  ]) {
    await assert.rejects(operation(), { code: 'GEMINI_API_KEY_MISSING', status: 503 });
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('the API key is read at request time and stays out of the URL and prompt', async (t) => {
  const changedKey = 'test-replacement-gemini-key';
  process.env.GEMINI_API_KEY = changedKey;
  t.after(() => { process.env.GEMINI_API_KEY = TEST_API_KEY; });
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response(analysis()));
  await analyzeCV('Updated key CV');
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(options.headers['x-goog-api-key'], changedKey);
  assert.equal(url.includes(changedKey), false);
  assert.equal(options.body.includes(changedKey), false);
});

test('the connection check requests only model metadata without generating content', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, status: 200,
    json: async () => ({ name: `models/${GEMINI_MODEL}`, supportedGenerationMethods: ['generateContent'] }),
  }));
  await checkGeminiConnection();
  assert.equal(fetchMock.mock.callCount(), 1);
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`);
  assert.equal(options.method || 'GET', 'GET');
  assert.equal(options.headers['x-goog-api-key'], TEST_API_KEY);
  assert.equal(options.body, undefined);
});

test('the connection check has a 10-second deadline including its response body', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const readingBody = deferred();
  let requestSignal;
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => {
    requestSignal = signal;
    return {
      ok: true, status: 200,
      json: () => { readingBody.resolve(); return rejectOnAbort(signal); },
    };
  });
  const rejected = assert.rejects(checkGeminiConnection(), { code: 'GEMINI_TIMEOUT', status: 504 });
  await readingBody.promise;
  t.mock.timers.tick(9999);
  assert.equal(requestSignal.aborted, false);
  t.mock.timers.tick(1);
  await rejected;
  assert.equal(requestSignal.aborted, true);
});

test('analysis sends a JSON schema and returns the validated scores', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response(analysis()));

  assert.deepEqual(await analyzeCV('JavaScript student CV'), { success: true, data: analysis() });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  const request = JSON.parse(options.body);
  assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`);
  assert.equal(options.method, 'POST');
  assert.equal(options.headers['x-goog-api-key'], TEST_API_KEY);
  assert.equal(url.includes(TEST_API_KEY), false);
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
  assert.equal(request.generationConfig.maxOutputTokens, 4096);
  if (/^gemini-3/.test(GEMINI_MODEL)) assert.equal(request.generationConfig.thinkingConfig.thinkingLevel, 'low');
  assert.equal(request.contents[0].role, 'user');
  assert.match(request.contents[0].parts[0].text, /JavaScript student CV/);
  assert.equal(typeof request.systemInstruction.parts[0].text, 'string');
  assert.equal(request.generationConfig.responseJsonSchema.type, 'object');
  assert.ok(request.generationConfig.responseJsonSchema.required.includes('cvScore'));
  assert.deepEqual(request.generationConfig.responseJsonSchema.properties.cvScore, { type: 'integer', minimum: 0, maximum: 100 });
});

test('generation and improvement preserve the expected public response shape', async (t) => {
  const replies = [content(), improvements()];
  t.mock.method(globalThis, 'fetch', async () => response(replies.shift()));

  assert.deepEqual(await generateCVContent({ fullName: 'Student' }), { success: true, data: content() });
  assert.deepEqual(await improveCV('Student CV', 'Developer'), { success: true, data: improvements() });
});

test('career objective generation requests only that section with compact profile input', async (t) => {
  const data = { careerObjective: 'Work as a JavaScript developer' };
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response(data));
  const profile = {
    fullName: 'Student',
    major: 'IT',
    skills: ['JavaScript'],
    desiredPositions: ['Developer'],
    experiences: [{ id: 'experience-1', description: 'OMITTED_EXPERIENCE_DETAILS' }],
    projects: [{ id: 'project-1', description: 'OMITTED_PROJECT_DETAILS' }],
  };

  assert.deepEqual(await generateCVContent(profile, { section: 'careerObjective' }), { success: true, data });
  const request = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.deepEqual(request.generationConfig.responseJsonSchema.required, ['careerObjective']);
  assert.deepEqual(request.generationConfig.responseJsonSchema.properties, { careerObjective: { type: 'string' } });
  const input = request.contents.find((message) => message.role === 'user').parts[0].text;
  assert.ok(input.includes('JavaScript'));
  assert.ok(input.includes('Developer'));
  assert.equal(input.includes('"experiences"'), false);
  assert.equal(input.includes('"projects"'), false);
  assert.equal(input.includes('OMITTED_EXPERIENCE_DETAILS'), false);
  assert.equal(input.includes('OMITTED_PROJECT_DETAILS'), false);
});

test('recommendations preserve supplied job IDs and scores', async (t) => {
  const data = { overallAdvice: 'Review this role', recommendations: [recommendation()] };
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response(data));

  assert.deepEqual(await recommendJobsWithAI({ skills: ['JavaScript'] }, jobs), data);
  const request = JSON.parse(fetchMock.mock.calls[0].arguments[1].body);
  assert.equal(request.generationConfig.responseJsonSchema.properties.recommendations.type, 'array');
  assert.equal(request.generationConfig.maxOutputTokens, 4096);
});

test('valid fenced JSON remains compatible with older model responses', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response(null, {
    content: { parts: [{ text: `\`\`\`json\n${JSON.stringify(analysis())}\n\`\`\`` }] },
  }));
  assert.deepEqual(await analyzeCV('Fenced response CV'), { success: true, data: analysis() });
});

for (const [name, change] of [
  ['missing scores', (data) => { delete data.cvScore; }],
  ['missing arrays', (data) => { delete data.strengths; }],
  ['non-array strengths', (data) => { data.strengths = 'JavaScript'; }],
  ['non-string array items', (data) => { data.missingSkills = [42]; }],
  ['string scores', (data) => { data.cvScore = '72'; }],
  ['out-of-range scores', (data) => { data.cvScore = 101; }],
  ['incomplete nested actions', (data) => { delete data.actionPlan[0].expectedImpact; }],
  ['invalid action priorities', (data) => { data.actionPlan[0].priority = 'urgent'; }],
]) {
  test(`analysis rejects ${name} instead of normalizing them into a successful result`, async (t) => {
    const data = analysis();
    change(data);
    t.mock.method(globalThis, 'fetch', async () => response(data));
    await assert.rejects(analyzeCV('Invalid analysis CV'), { code: 'GEMINI_INVALID_RESPONSE', status: 502 });
  });
}

test('generation rejects missing content fields', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({ summary: 'Incomplete content' }));
  await assert.rejects(generateCVContent({ fullName: 'Student' }), { code: 'GEMINI_INVALID_RESPONSE', status: 502 });
});

test('recommendations reject malformed arrays', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({ overallAdvice: 'Advice', recommendations: {} }));
  await assert.rejects(recommendJobsWithAI({}, jobs), { code: 'GEMINI_INVALID_RESPONSE', status: 502 });
});

test('recommendations reject job IDs absent from the supplied openings', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({
    overallAdvice: 'Advice', recommendations: [recommendation('invented-job')],
  }));
  await assert.rejects(recommendJobsWithAI({}, jobs), { code: 'GEMINI_INVALID_RESPONSE', status: 502 });
});

test('recommendations reject missing job results', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({ overallAdvice: 'Advice', recommendations: [] }));
  await assert.rejects(recommendJobsWithAI({}, jobs), { code: 'GEMINI_INVALID_RESPONSE', status: 502 });
});

test('recommendations reject duplicate IDs even when the result count is correct', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({
    overallAdvice: 'Advice', recommendations: [recommendation(), recommendation()],
  }));
  const openings = [...jobs, { id: 'job-2', title: 'QA Engineer', skills: ['Testing'] }];
  await assert.rejects(recommendJobsWithAI({}, openings), { code: 'GEMINI_INVALID_RESPONSE', status: 502 });
});

test('reports a truncated response on token limit even if the JSON parses', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response(analysis(), { finishReason: 'MAX_TOKENS' }));
  await assert.rejects(analyzeCV('Truncated response CV'), { code: 'GEMINI_TRUNCATED_RESPONSE', status: 502 });
});

for (const finishReason of ['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT']) {
  test(`reports blocked content for ${finishReason}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => response(analysis(), { finishReason }));
    await assert.rejects(analyzeCV('Blocked response CV'), { code: 'GEMINI_CONTENT_BLOCKED', status: 422 });
  });
}

test('reports blocked prompts before attempting to parse candidates', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
  }));
  await assert.rejects(analyzeCV('Blocked input CV'), { code: 'GEMINI_CONTENT_BLOCKED', status: 422 });
});

for (const finishReason of [undefined, 'FINISH_REASON_UNSPECIFIED', 'OTHER']) {
  test(`rejects incomplete candidate completion: ${finishReason}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => response(analysis(), { finishReason }));
    await assert.rejects(analyzeCV('Incomplete response CV'), { code: 'GEMINI_INVALID_RESPONSE', status: 502 });
  });
}

test('combines text parts while excluding model thoughts', async (t) => {
  const text = JSON.stringify(analysis());
  t.mock.method(globalThis, 'fetch', async () => response(null, {
    content: { parts: [{ text: 'private thought', thought: true }, { text: text.slice(0, 25) }, { text: text.slice(25) }] },
  }));
  assert.deepEqual(await analyzeCV('Multipart response CV'), { success: true, data: analysis() });
});

test('reports malformed model JSON separately from transport errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response(null, { content: { parts: [{ text: '{"cvScore":' }] } }));
  await assert.rejects(analyzeCV('Malformed JSON CV'), { code: 'GEMINI_INVALID_JSON', status: 502 });
});

test('reports malformed HTTP response bodies', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token'); },
  }));
  await assert.rejects(analyzeCV('Malformed body CV'), { code: 'GEMINI_INVALID_RESPONSE', status: 502 });
});

for (const [name, httpStatus, providerStatus, message, code, status] of [
  ['invalid API key', 400, 'INVALID_ARGUMENT', 'API key not valid. Please pass a valid API key.', 'GEMINI_API_KEY_INVALID', 503],
  ['unauthenticated request', 401, 'UNAUTHENTICATED', 'Credentials rejected', 'GEMINI_API_KEY_INVALID', 503],
  ['permission denied', 403, 'PERMISSION_DENIED', 'Project lacks permission', 'GEMINI_PERMISSION_DENIED', 503],
  ['missing model', 404, 'NOT_FOUND', 'Model unavailable', 'GEMINI_MODEL_NOT_FOUND', 503],
  ['exhausted quota', 429, 'RESOURCE_EXHAUSTED', 'Request quota exceeded', 'GEMINI_QUOTA_EXCEEDED', 429],
  ['busy service', 503, 'UNAVAILABLE', 'Service overloaded', 'GEMINI_BUSY', 503],
  ['other server failure', 500, 'INTERNAL', 'Internal server failure', 'GEMINI_REQUEST_FAILED', 502],
  ['error in a successful HTTP response', 200, 'INTERNAL', 'Internal model failure', 'GEMINI_REQUEST_FAILED', 502],
]) {
  test(`classifies ${name} without retaining raw upstream diagnostics`, async (t) => {
    const diagnostic = `${message} PRIVATE_UPSTREAM_DIAGNOSTIC`;
    const logs = t.mock.method(console, 'error', () => {});
    t.mock.method(globalThis, 'fetch', async () => ({
      ok: httpStatus < 400, status: httpStatus,
      json: async () => ({ error: { code: httpStatus, status: providerStatus, message: diagnostic } }),
    }));
    await assert.rejects(analyzeCV('Server error CV'), (error) => {
      assert.equal(error.code, code);
      assert.equal(error.status, status);
      assert.equal(`${error.message}${JSON.stringify(error)}`.includes('PRIVATE_UPSTREAM_DIAGNOSTIC'), false);
      return true;
    });
    assert.equal(JSON.stringify(logs.mock.calls).includes('PRIVATE_UPSTREAM_DIAGNOSTIC'), false);
  });
}

for (const [httpStatus, code, status] of [
  [401, 'GEMINI_API_KEY_INVALID', 503],
  [403, 'GEMINI_PERMISSION_DENIED', 503],
  [404, 'GEMINI_MODEL_NOT_FOUND', 503],
  [429, 'GEMINI_QUOTA_EXCEEDED', 429],
  [503, 'GEMINI_BUSY', 503],
  [500, 'GEMINI_REQUEST_FAILED', 502],
]) {
  test(`classifies HTTP ${httpStatus} when the provider sends a non-JSON error page`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => ({
      ok: false, status: httpStatus,
      json: async () => { throw new SyntaxError('Non-JSON gateway error'); },
    }));
    await assert.rejects(analyzeCV('HTML error CV'), { code, status });
  });
}

test('classifies connection failures without accessing Google', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(analyzeCV('Connection failure CV'), { code: 'GEMINI_UNAVAILABLE', status: 503 });
});

test('the default 60-second timeout covers waiting for response headers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let requestSignal;
  t.mock.method(globalThis, 'fetch', (_, { signal }) => {
    requestSignal = signal;
    return rejectOnAbort(signal);
  });
  const rejected = assert.rejects(analyzeCV('Slow headers CV'), { code: 'GEMINI_TIMEOUT', status: 504 });
  t.mock.timers.tick(59999);
  assert.equal(requestSignal.aborted, false);
  t.mock.timers.tick(1);
  await rejected;
  assert.equal(requestSignal.aborted, true);
});

test('the deadline remains active while reading the response body', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const readingBody = deferred();
  let requestSignal;
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => {
    requestSignal = signal;
    return {
      ok: true,
      status: 200,
      json: () => {
        readingBody.resolve();
        return rejectOnAbort(signal);
      },
    };
  });
  const rejected = assert.rejects(analyzeCV('Slow body CV'), { code: 'GEMINI_TIMEOUT', status: 504 });
  await readingBody.promise;
  t.mock.timers.tick(60000);
  await rejected;
  assert.equal(requestSignal.aborted, true);
});

test('a completed request cancels its deadline', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let requestSignal;
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => {
    requestSignal = signal;
    return response(analysis());
  });
  await analyzeCV('Completed request CV');
  t.mock.timers.tick(60000);
  assert.equal(requestSignal.aborted, false);
});

test('identical pending requests share inference and a later request runs again', async (t) => {
  const pendingResponse = deferred();
  const fetchMock = t.mock.method(globalThis, 'fetch', () => pendingResponse.promise);
  const first = analyzeCV('Repeated CV');
  const second = analyzeCV('Repeated CV');
  assert.equal(fetchMock.mock.callCount(), 1);

  pendingResponse.resolve(response(analysis()));
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.deepEqual(firstResult, secondResult);
  await analyzeCV('Repeated CV');
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('failed shared requests are removed so the same input can be retried', async (t) => {
  const pendingResponse = deferred();
  let attempts = 0;
  const fetchMock = t.mock.method(globalThis, 'fetch', () => {
    attempts += 1;
    return attempts === 1 ? pendingResponse.promise : Promise.resolve(response(analysis()));
  });
  const first = assert.rejects(analyzeCV('Retry CV'), { code: 'GEMINI_UNAVAILABLE' });
  const second = assert.rejects(analyzeCV('Retry CV'), { code: 'GEMINI_UNAVAILABLE' });
  assert.equal(fetchMock.mock.callCount(), 1);
  pendingResponse.reject(new TypeError('fetch failed'));
  await Promise.all([first, second]);

  assert.deepEqual(await analyzeCV('Retry CV'), { success: true, data: analysis() });
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('different CVs are not merged into one inference request', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response(analysis()));
  await Promise.all([analyzeCV('First student CV'), analyzeCV('Second student CV')]);
  assert.equal(fetchMock.mock.callCount(), 2);
});
