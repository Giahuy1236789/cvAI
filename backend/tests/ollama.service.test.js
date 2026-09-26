const assert = require('node:assert/strict');
const { test } = require('node:test');

// Exercise the default deadline regardless of the shell's local configuration.
const configuredTimeout = process.env.OLLAMA_TIMEOUT_MS;
delete process.env.OLLAMA_TIMEOUT_MS;
const {
  generateCVContent,
  analyzeCV,
  improveCV,
  recommendJobsWithAI,
  OLLAMA_MODEL,
} = require('../services/ai/ollama.service');
if (configuredTimeout !== undefined) process.env.OLLAMA_TIMEOUT_MS = configuredTimeout;

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
  json: async () => ({ message: { content: JSON.stringify(data) }, done: true, ...extra }),
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

test('analysis sends a JSON schema and returns the validated scores', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response(analysis()));

  assert.deepEqual(await analyzeCV('JavaScript student CV'), { success: true, data: analysis() });
  const [url, options] = fetchMock.mock.calls[0].arguments;
  const request = JSON.parse(options.body);
  assert.ok(url.endsWith('/api/chat'));
  assert.equal(options.method, 'POST');
  assert.equal(request.model, OLLAMA_MODEL);
  assert.equal(request.stream, false);
  assert.equal(request.format.type, 'object');
  assert.ok(request.format.required.includes('cvScore'));
  assert.deepEqual(request.format.properties.cvScore, { type: 'integer', minimum: 0, maximum: 100 });
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
  assert.deepEqual(request.format.required, ['careerObjective']);
  assert.deepEqual(request.format.properties, { careerObjective: { type: 'string' } });
  const input = request.messages.find((message) => message.role === 'user').content;
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
  assert.equal(request.format.properties.recommendations.type, 'array');
});

test('valid fenced JSON remains compatible with older model responses', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response(null, {
    message: { content: `\`\`\`json\n${JSON.stringify(analysis())}\n\`\`\`` },
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
    await assert.rejects(analyzeCV('Invalid analysis CV'), { code: 'OLLAMA_INVALID_RESPONSE', status: 502 });
  });
}

test('generation rejects missing content fields', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({ summary: 'Incomplete content' }));
  await assert.rejects(generateCVContent({ fullName: 'Student' }), { code: 'OLLAMA_INVALID_RESPONSE', status: 502 });
});

test('recommendations reject malformed arrays', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({ overallAdvice: 'Advice', recommendations: {} }));
  await assert.rejects(recommendJobsWithAI({}, jobs), { code: 'OLLAMA_INVALID_RESPONSE', status: 502 });
});

test('recommendations reject job IDs absent from the supplied openings', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({
    overallAdvice: 'Advice', recommendations: [recommendation('invented-job')],
  }));
  await assert.rejects(recommendJobsWithAI({}, jobs), { code: 'OLLAMA_INVALID_RESPONSE', status: 502 });
});

test('recommendations reject missing job results', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({ overallAdvice: 'Advice', recommendations: [] }));
  await assert.rejects(recommendJobsWithAI({}, jobs), { code: 'OLLAMA_INVALID_RESPONSE', status: 502 });
});

test('recommendations reject duplicate IDs even when the result count is correct', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response({
    overallAdvice: 'Advice', recommendations: [recommendation(), recommendation()],
  }));
  const openings = [...jobs, { id: 'job-2', title: 'QA Engineer', skills: ['Testing'] }];
  await assert.rejects(recommendJobsWithAI({}, openings), { code: 'OLLAMA_INVALID_RESPONSE', status: 502 });
});

for (const [name, extra] of [
  ['token limit', { done_reason: 'length' }],
  ['unfinished generation', { done: false }],
]) {
  test(`reports a truncated response for ${name}, even if the JSON parses`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => response(analysis(), extra));
    await assert.rejects(analyzeCV('Truncated response CV'), { code: 'OLLAMA_TRUNCATED_RESPONSE', status: 502 });
  });
}

test('reports malformed model JSON separately from transport errors', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => response(null, { message: { content: '{"cvScore":' } }));
  await assert.rejects(analyzeCV('Malformed JSON CV'), { code: 'OLLAMA_INVALID_JSON', status: 502 });
});

test('reports malformed HTTP response bodies', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token'); },
  }));
  await assert.rejects(analyzeCV('Malformed body CV'), { code: 'OLLAMA_INVALID_RESPONSE', status: 502 });
});

for (const [name, httpStatus, message, code, status] of [
  ['missing model', 404, 'model "missing:latest" not found, try pulling it first', 'OLLAMA_MODEL_NOT_FOUND', 503],
  ['insufficient RAM', 500, 'model requires more system memory (4.0 GiB) than is available (2.0 GiB)', 'OLLAMA_INSUFFICIENT_MEMORY', 503],
  ['allocation failure', 500, 'failed to allocate memory', 'OLLAMA_INSUFFICIENT_MEMORY', 503],
  ['busy server', 429, 'Too many requests', 'OLLAMA_BUSY', 503],
  ['full queue', 503, 'server busy: queue is full', 'OLLAMA_BUSY', 503],
  ['unknown endpoint', 404, 'page not found', 'OLLAMA_REQUEST_FAILED', 502],
  ['other server failure', 500, 'Internal server failure', 'OLLAMA_REQUEST_FAILED', 502],
  ['error in a successful HTTP response', 200, 'Internal model failure', 'OLLAMA_REQUEST_FAILED', 502],
]) {
  test(`classifies ${name}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => ({
      ok: httpStatus < 400, status: httpStatus, json: async () => ({ error: message }),
    }));
    await assert.rejects(analyzeCV('Server error CV'), { code, status });
  });
}

test('classifies connection failures without requiring a running Ollama server', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('fetch failed'); });
  await assert.rejects(analyzeCV('Connection failure CV'), { code: 'OLLAMA_UNAVAILABLE', status: 503 });
});

test('the default 300-second timeout covers waiting for response headers', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let requestSignal;
  t.mock.method(globalThis, 'fetch', (_, { signal }) => {
    requestSignal = signal;
    return rejectOnAbort(signal);
  });
  const rejected = assert.rejects(analyzeCV('Slow headers CV'), { code: 'OLLAMA_TIMEOUT', status: 504 });
  t.mock.timers.tick(299999);
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
  const rejected = assert.rejects(analyzeCV('Slow body CV'), { code: 'OLLAMA_TIMEOUT', status: 504 });
  await readingBody.promise;
  t.mock.timers.tick(300000);
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
  t.mock.timers.tick(300000);
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
  const first = assert.rejects(analyzeCV('Retry CV'), { code: 'OLLAMA_UNAVAILABLE' });
  const second = assert.rejects(analyzeCV('Retry CV'), { code: 'OLLAMA_UNAVAILABLE' });
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
