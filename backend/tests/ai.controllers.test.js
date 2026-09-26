const test = require('node:test');
const assert = require('node:assert/strict');
const { createOpenAIError, sendOpenAIError, isOpenAIError } = require('../services/ai/openai.errors');
const { calculateMatchScore } = require('../services/recommendation/matching.service');

const TEST_OPENAI_MODEL = 'openai-test-model';

const ERROR_CASES = [
  ['OPENAI_TIMEOUT', 504],
  ['OPENAI_UNAVAILABLE', 503],
  ['OPENAI_MODEL_NOT_FOUND', 503],
  ['OPENAI_API_KEY_MISSING', 503],
  ['OPENAI_API_KEY_INVALID', 503],
  ['OPENAI_PERMISSION_DENIED', 503],
  ['OPENAI_QUOTA_EXCEEDED', 402],
  ['OPENAI_RATE_LIMITED', 429],
  ['OPENAI_USAGE_LIMIT', 429],
  ['OPENAI_INVALID_RESPONSE', 502],
  ['OPENAI_REQUEST_FAILED', 502],
];

// Fail locally if a service import stops being intercepted in this test file.
test.beforeEach((t) => {
  const network = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('External requests are forbidden in controller tests');
  });
  t.after(() => assert.equal(network.mock.callCount(), 0, 'Controllers must use the mocked AI service'));
});

const student = {
  id: 'student-test', userId: 'user-test', skills: ['JavaScript'],
  desiredPositions: ['Developer'], desiredLocation: 'Hà Nội', experiences: [],
};
const job = {
  id: 'job-test', companyId: 'company-test', title: 'Developer',
  skills: ['JavaScript', 'TypeScript'], location: 'Hà Nội', status: 'active',
};
const company = { id: 'company-test', name: 'Test company' };
const cv = { id: 'cv-test', studentId: student.id, skills: ['JavaScript'], updatedAt: '2026-01-01T00:00:00Z' };
const aiMatch = {
  jobId: job.id, score: 82, matchedSkills: ['JavaScript'], missingSkills: ['TypeScript'],
  reason: 'Kỹ năng JavaScript phù hợp.', preparationSteps: ['Ôn tập TypeScript.'],
};

const response = () => ({
  statusCode: 200,
  status(value) { this.statusCode = value; return this; },
  json(value) { this.body = value; return this; },
});

const request = (overrides = {}) => ({
  user: { id: student.userId }, body: { cvId: cv.id }, query: {}, params: { jobId: job.id }, ...overrides,
});

// Intercept modules before loading controllers so tests never initialize MySQL,
// use live OpenAI, or persist an analysis to disk/database.
const loadControllers = (t, { ai = {}, data = {} } = {}) => {
  const records = { students: [student], jobs: [job], companies: [company], cvs: [cv], cvAnalysis: [], ...data };
  const writes = [];
  const database = {
    readJSON: (table) => records[table] || [],
    findById: (table, id) => (records[table] || []).find((record) => record.id === id) || null,
    insert: (table, record) => { writes.push({ table, record }); return record; },
  };
  const unexpectedAI = async () => { throw new Error('Unexpected AI call in test'); };
  const service = {
    generateCVContent: unexpectedAI, analyzeCV: unexpectedAI,
    improveCV: unexpectedAI, recommendJobsWithAI: unexpectedAI, OPENAI_MODEL: TEST_OPENAI_MODEL, ...ai,
  };
  const paths = [
    require.resolve('../config/database'),
    require.resolve('../services/ai/openai.service'),
    require.resolve('../controllers/ai.controller'),
    require.resolve('../controllers/recommendation.controller'),
  ];
  const originals = paths.map((path) => require.cache[path]);
  require.cache[paths[0]] = { id: paths[0], filename: paths[0], loaded: true, exports: database };
  require.cache[paths[1]] = { id: paths[1], filename: paths[1], loaded: true, exports: service };
  delete require.cache[paths[2]];
  delete require.cache[paths[3]];
  t.after(() => paths.forEach((path, index) => {
    if (originals[index]) require.cache[path] = originals[index];
    else delete require.cache[path];
  }));
  t.mock.method(console, 'error', () => {});
  return {
    ...require('../controllers/ai.controller'),
    ...require('../controllers/recommendation.controller'),
    records, writes,
  };
};

for (const [code, status] of ERROR_CASES) {
  test(`OpenAI helper maps ${code} to HTTP ${status} without raw provider text`, () => {
    const error = createOpenAIError(code, 'private provider diagnostic');
    assert.equal(error.status, status);
    assert.equal(isOpenAIError(error), true);
    const res = response();
    assert.equal(sendOpenAIError(res, error), true);
    assert.equal(res.statusCode, status);
    assert.equal(res.body.code, code);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message.includes('private provider diagnostic'), false);
    assert.equal(/Ollama|Gemini/i.test(res.body.message), false);
  });
}

test('OpenAI helper normalizes unknown provider errors and leaves unrelated errors untouched', () => {
  const res = response();
  assert.equal(sendOpenAIError(res, createOpenAIError('OPENAI_FUTURE_ERROR', 'secret')), true);
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.code, 'OPENAI_REQUEST_FAILED');
  assert.equal(createOpenAIError('OPENAI_TIMEOUT', 'timeout').status, 504);
  const untouched = response();
  for (const error of [null, undefined, new Error('database failed'), { code: 'ECONNREFUSED' }]) {
    assert.equal(isOpenAIError(error), false);
    assert.equal(sendOpenAIError(untouched, error), false);
  }
  assert.equal(untouched.body, undefined);
});

for (const [code, status] of ERROR_CASES) {
  test(`all CV endpoints return a structured error and save no analysis for ${code}`, async (t) => {
    const fail = async () => { throw createOpenAIError(code, 'private provider diagnostic'); };
    const controllers = loadControllers(t, { ai: { generateCVContent: fail, analyzeCV: fail, improveCV: fail } });
    for (const name of ['generateCV', 'analyzeCVController', 'improveCVController']) {
      const res = response();
      await controllers[name](request(), res);
      assert.equal(res.statusCode, status, name);
      assert.equal(res.body.success, false, name);
      assert.equal(res.body.code, code, name);
      assert.equal(res.body.data, undefined, name);
      assert.equal(res.body.message.includes('private provider diagnostic'), false);
    }
    assert.deepEqual(controllers.writes, []);
  });

  test(`both recommendation endpoints retain actual profile matching for ${code}`, async (t) => {
    const controllers = loadControllers(t, {
      ai: { recommendJobsWithAI: async () => { throw createOpenAIError(code, 'private provider diagnostic'); } },
    });
    for (const name of ['getRecommendations', 'getJobRecommendation']) {
      const res = response();
      await controllers[name](request(), res);
      assert.equal(res.statusCode, 200, name);
      assert.equal(res.body.success, true, name);
      assert.equal(res.body.data.aiAvailable, false, name);
      assert.equal(res.body.data.aiLoading, false, name);
      assert.match(res.body.data.overallAdvice, /chưa phải đánh giá của AI/);
      const match = name === 'getRecommendations' ? res.body.data.recommendations[0] : res.body.data;
      const expected = calculateMatchScore(student, job);
      assert.equal(match.aiRecommendation, false, name);
      assert.equal(match.finalScore, expected.finalScore, name);
      assert.deepEqual(match.matchedSkills, expected.matchedSkills, name);
      assert.deepEqual(match.missingSkills, expected.missingSkills, name);
      assert.deepEqual(match.job.company, company, name);
      assert.equal(JSON.stringify(res.body).includes('private provider diagnostic'), false);
    }
    assert.deepEqual(controllers.writes, []);
  });
}

test('CV endpoints return real results and only successful analysis is saved', async (t) => {
  const generated = { careerObjective: 'Phát triển ứng dụng web.' };
  const analysis = { cvScore: 81, overallFeedback: 'Bổ sung mô tả dự án.' };
  const improved = { improvements: [{ section: 'Dự án', suggestion: 'Thêm kết quả.' }] };
  const controllers = loadControllers(t, { ai: {
    generateCVContent: async () => ({ success: true, data: generated }),
    analyzeCV: async () => ({ success: true, data: analysis }),
    improveCV: async () => ({ success: true, data: improved }),
  } });
  for (const [name, expected] of [['generateCV', generated], ['analyzeCVController', analysis], ['improveCVController', improved]]) {
    const res = response();
    await controllers[name](request(), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { success: true, data: expected });
  }
  assert.equal(controllers.writes.length, 1);
  assert.equal(controllers.writes[0].table, 'cvAnalysis');
  assert.equal(controllers.writes[0].record.studentId, student.id);
  assert.equal(controllers.writes[0].record.cvId, cv.id);
  assert.deepEqual(controllers.writes[0].record.analysis, {
    ...analysis, _provider: 'openai', _model: TEST_OPENAI_MODEL,
  });
});

test('CV endpoints reject unsuccessful results instead of returning sample data', async (t) => {
  const fail = async () => ({ success: false, error: 'NO_API_KEY' });
  const controllers = loadControllers(t, { ai: { generateCVContent: fail, analyzeCV: fail, improveCV: fail } });
  for (const name of ['generateCV', 'analyzeCVController', 'improveCVController']) {
    const res = response();
    await controllers[name](request(), res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.code, 'OPENAI_INVALID_RESPONSE');
    assert.equal(res.body.data, undefined);
  }
  assert.deepEqual(controllers.writes, []);
});

test('CV generation forwards the requested section to avoid generating unused content', async (t) => {
  let receivedOptions;
  const controllers = loadControllers(t, { ai: { generateCVContent: async (profile, options) => {
    assert.equal(profile.id, student.id);
    receivedOptions = options;
    return { success: true, data: { careerObjective: 'Phát triển ứng dụng web.' } };
  } } });
  const res = response();
  await controllers.generateCV(request({ body: { section: 'careerObjective' } }), res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(receivedOptions, { section: 'careerObjective' });
  assert.deepEqual(controllers.writes, []);
});

test('unchanged CV reuses saved analysis without calling OpenAI or saving it again', async (t) => {
  const analysis = { cvScore: 81 };
  const controllers = loadControllers(t, { data: {
    cvAnalysis: [{
      studentId: student.id, cvId: cv.id,
      analysis: { ...analysis, _provider: 'openai', _model: TEST_OPENAI_MODEL },
      createdAt: '2026-01-02T00:00:00Z',
    }],
  } });
  const res = response();
  await controllers.analyzeCVController(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.cached, true);
  assert.deepEqual(res.body.data, analysis);
  assert.deepEqual(controllers.writes, []);
});

test('updated CV does not reuse a stale analysis when OpenAI is unavailable', async (t) => {
  const controllers = loadControllers(t, {
    data: { cvAnalysis: [{
      studentId: student.id, cvId: cv.id,
      analysis: { cvScore: 81, _provider: 'openai', _model: TEST_OPENAI_MODEL },
      createdAt: '2025-12-31T00:00:00Z',
    }] },
    ai: { analyzeCV: async () => { throw createOpenAIError('OPENAI_UNAVAILABLE', 'offline'); } },
  });
  const res = response();
  await controllers.analyzeCVController(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'OPENAI_UNAVAILABLE');
  assert.deepEqual(controllers.writes, []);
});

test('CV analysis refreshes legacy provider results and results from another OpenAI model', async (t) => {
  for (const metadata of [{}, { _provider: 'ollama', _model: 'qwen2.5:3b' }, { _provider: 'gemini', _model: 'gemini-test-model' }, { _provider: 'openai', _model: 'another-openai-model' }]) {
    await t.test(JSON.stringify(metadata), async (subtest) => {
      let calls = 0;
      const analysis = { cvScore: 92, overallFeedback: 'Updated OpenAI analysis.' };
      const controllers = loadControllers(subtest, {
        data: { cvAnalysis: [{
          studentId: student.id, cvId: cv.id,
          analysis: { cvScore: 81, ...metadata }, createdAt: '2026-01-02T00:00:00Z',
        }] },
        ai: { analyzeCV: async () => {
          calls += 1;
          return { success: true, data: analysis };
        } },
      });
      const res = response();
      await controllers.analyzeCVController(request(), res);
      assert.equal(res.statusCode, 200);
      assert.notEqual(res.body.cached, true);
      assert.deepEqual(res.body.data, analysis);
      assert.equal(calls, 1);
      assert.equal(controllers.writes.length, 1);
      assert.deepEqual(controllers.writes[0].record.analysis, {
        ...analysis, _provider: 'openai', _model: TEST_OPENAI_MODEL,
      });
    });
  }
});

test('missing or malformed AI job results fall back for both recommendation endpoints', async (t) => {
  for (const result of [null, {}, { recommendations: {} }, { recommendations: [] }, { recommendations: [{ ...aiMatch, jobId: 'another-job' }] }]) {
    await t.test(JSON.stringify(result), async (subtest) => {
      const controllers = loadControllers(subtest, { ai: { recommendJobsWithAI: async () => result } });
      for (const name of ['getRecommendations', 'getJobRecommendation']) {
        const res = response();
        await controllers[name](request(), res);
        assert.equal(res.statusCode, 200, name);
        assert.equal(res.body.data.aiAvailable, false, name);
        const match = name === 'getRecommendations' ? res.body.data.recommendations[0] : res.body.data;
        assert.equal(match.aiRecommendation, false);
        assert.equal(match.finalScore, calculateMatchScore(student, job).finalScore);
      }
    });
  }
});

test('AI recommendations are returned and reused from cache after a successful call', async (t) => {
  let calls = 0;
  const controllers = loadControllers(t, { ai: { recommendJobsWithAI: async () => {
    calls += 1;
    return { recommendations: [aiMatch], overallAdvice: 'Chuẩn bị ví dụ dự án JavaScript.' };
  } } });
  const first = response();
  await controllers.getRecommendations(request(), first);
  assert.equal(first.body.data.aiAvailable, true);
  assert.equal(first.body.data.recommendations[0].aiRecommendation, true);
  assert.equal(first.body.data.recommendations[0].finalScore, aiMatch.score);
  const cached = response();
  await controllers.getRecommendations(request(), cached);
  assert.equal(cached.body.data.cached, true);
  assert.equal(calls, 1);
  const detail = response();
  await controllers.getJobRecommendation(request(), detail);
  assert.equal(detail.body.data.aiAvailable, true);
  assert.equal(detail.body.data.aiRecommendation, true);
  assert.equal(detail.body.data.finalScore, aiMatch.score);
});

test('fallback does not prevent a later successful AI retry', async (t) => {
  let calls = 0;
  const controllers = loadControllers(t, { ai: { recommendJobsWithAI: async () => {
    calls += 1;
    if (calls === 1) throw createOpenAIError('OPENAI_RATE_LIMITED', 'busy');
    return { recommendations: [aiMatch], overallAdvice: 'Chuẩn bị dự án.' };
  } } });
  const fallback = response();
  await controllers.getRecommendations(request(), fallback);
  assert.equal(fallback.body.data.aiAvailable, false);
  const retried = response();
  await controllers.getRecommendations(request(), retried);
  assert.equal(retried.body.data.aiAvailable, true);
  assert.equal(calls, 2);
});

test('fast recommendations do not request OpenAI and stay marked as pending', async (t) => {
  const controllers = loadControllers(t);
  const res = response();
  await controllers.getRecommendations(request({ query: { mode: 'fast' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.aiLoading, true);
  assert.equal(res.body.data.aiAvailable, false);
  assert.equal(res.body.data.recommendations[0].aiRecommendation, false);
});

test('unrelated application errors remain server errors instead of AI fallbacks', async (t) => {
  const fail = async () => { throw new Error('private application error'); };
  const controllers = loadControllers(t, { ai: { analyzeCV: fail, recommendJobsWithAI: fail } });
  for (const name of ['analyzeCVController', 'getRecommendations', 'getJobRecommendation']) {
    const res = response();
    await controllers[name](request(), res);
    assert.equal(res.statusCode, 500, name);
    assert.equal(res.body.success, false, name);
    assert.equal(JSON.stringify(res.body).includes('private application error'), false);
  }
  assert.deepEqual(controllers.writes, []);
});
