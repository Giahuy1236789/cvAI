const { createOllamaError, isOllamaError } = require('./ollama.errors');

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = (process.env.OLLAMA_MODEL || 'qwen2.5:3b').trim();
const OLLAMA_TIMEOUT_MS = Math.max(5000, Number.parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 300000);
const pendingRequests = new Map();

const schemas = {
  analysis: {
    type: 'object', required: ['cvScore', 'skillScore', 'experienceScore', 'educationScore', 'projectScore', 'strengths', 'weaknesses', 'suggestions', 'missingSkills', 'overallFeedback', 'actionPlan'],
    properties: {
      cvScore: { type: 'integer', minimum: 0, maximum: 100 }, skillScore: { type: 'integer', minimum: 0, maximum: 100 }, experienceScore: { type: 'integer', minimum: 0, maximum: 100 }, educationScore: { type: 'integer', minimum: 0, maximum: 100 }, projectScore: { type: 'integer', minimum: 0, maximum: 100 },
      strengths: { type: 'array', items: { type: 'string' } }, weaknesses: { type: 'array', items: { type: 'string' } }, suggestions: { type: 'array', items: { type: 'string' } }, missingSkills: { type: 'array', items: { type: 'string' } }, overallFeedback: { type: 'string' },
      actionPlan: { type: 'array', items: { type: 'object', required: ['priority', 'action', 'expectedImpact'], properties: { priority: { type: 'string', enum: ['Cao', 'Trung bình', 'Thấp'] }, action: { type: 'string' }, expectedImpact: { type: 'string' } } } },
    },
  },
  content: {
    type: 'object', required: ['careerObjective', 'summary', 'experienceDescriptions', 'projectDescriptions', 'skillsPresentation'],
    properties: { careerObjective: { type: 'string' }, summary: { type: 'string' }, experienceDescriptions: { type: 'array' }, projectDescriptions: { type: 'array' }, skillsPresentation: { type: 'string' } },
  },
  improvement: {
    type: 'object', required: ['improvements', 'additionalSkills', 'formatting'],
    properties: { improvements: { type: 'array' }, additionalSkills: { type: 'array' }, formatting: { type: 'array' } },
  },
  recommendations: {
    type: 'object', required: ['overallAdvice', 'recommendations'],
    properties: { overallAdvice: { type: 'string' }, recommendations: { type: 'array' } },
  },
};

const asObject = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
const asStrings = (value) => Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
const parseContent = (value) => {
  const text = String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try { return JSON.parse(text); } catch (_) { throw createOllamaError('OLLAMA_INVALID_JSON'); }
};

const validate = (type, data, jobs = []) => {
  const value = asObject(data);
  if (!value) throw createOllamaError('OLLAMA_INVALID_RESPONSE');
  if (type === 'careerObjective') {
    if (typeof value.careerObjective !== 'string') throw createOllamaError('OLLAMA_INVALID_RESPONSE');
  } else if (type === 'analysis') {
    const scores = ['cvScore', 'skillScore', 'experienceScore', 'educationScore', 'projectScore'];
    if (scores.some((key) => !Number.isInteger(value[key]) || value[key] < 0 || value[key] > 100)
      || ['strengths', 'weaknesses', 'suggestions', 'missingSkills'].some((key) => !asStrings(value[key]))
      || typeof value.overallFeedback !== 'string'
      || !Array.isArray(value.actionPlan) || value.actionPlan.some((item) => !asObject(item) || !['Cao', 'Trung bình', 'Thấp'].includes(item.priority) || typeof item.action !== 'string' || typeof item.expectedImpact !== 'string')) throw createOllamaError('OLLAMA_INVALID_RESPONSE');
  } else if (type === 'content') {
    if (typeof value.careerObjective !== 'string' || typeof value.summary !== 'string' || typeof value.skillsPresentation !== 'string' || !Array.isArray(value.experienceDescriptions) || !Array.isArray(value.projectDescriptions)) throw createOllamaError('OLLAMA_INVALID_RESPONSE');
  } else if (type === 'improvement') {
    if (!Array.isArray(value.improvements) || !Array.isArray(value.additionalSkills) || !asStrings(value.additionalSkills) || !Array.isArray(value.formatting) || !asStrings(value.formatting)) throw createOllamaError('OLLAMA_INVALID_RESPONSE');
  } else if (typeof value.overallAdvice !== 'string' || !Array.isArray(value.recommendations)) throw createOllamaError('OLLAMA_INVALID_RESPONSE');
  if (type === 'recommendations') {
    const ids = jobs.map((job) => String(job.id));
    if (value.recommendations.length !== ids.length || new Set(value.recommendations.map((item) => String(item?.jobId))).size !== ids.length || value.recommendations.some((item) => !ids.includes(String(item?.jobId)))) throw createOllamaError('OLLAMA_INVALID_RESPONSE');
  }
  return value;
};

const classify = (error, responseStatus) => {
  if (isOllamaError(error)) return error;
  if (error instanceof SyntaxError) return createOllamaError('OLLAMA_INVALID_RESPONSE');
  if (error?.name === 'AbortError') return createOllamaError('OLLAMA_TIMEOUT');
  if (responseStatus === 404 && /model|not found|missing/i.test(error?.message || '')) return createOllamaError('OLLAMA_MODEL_NOT_FOUND');
  if (responseStatus === 429 || responseStatus === 503) return createOllamaError('OLLAMA_BUSY');
  return createOllamaError('OLLAMA_UNAVAILABLE');
};

const request = (type, prompt, schema, jobs = []) => {
  const key = JSON.stringify([OLLAMA_MODEL, type, prompt]);
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const operation = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);
    try {
      let response;
      try {
        response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, format: schema, messages: [{ role: 'user', content: prompt }] }) });
      } catch (error) { throw classify(error); }
      let payload;
      try { payload = await response.json(); } catch (error) { throw classify(error); }
      if (!response.ok || payload.error) {
        const message = String(payload.error || '');
        if (response.status === 404 && /model.*not found|missing.*model/i.test(message)) throw createOllamaError('OLLAMA_MODEL_NOT_FOUND');
        if (response.status === 500 && /memory|allocate/i.test(message)) throw createOllamaError('OLLAMA_INSUFFICIENT_MEMORY');
        if (response.status === 429 || response.status === 503 || /busy|queue/i.test(message)) throw createOllamaError('OLLAMA_BUSY');
        throw createOllamaError('OLLAMA_REQUEST_FAILED');
      }
      if (payload.done === false || payload.done_reason === 'length') throw createOllamaError('OLLAMA_TRUNCATED_RESPONSE');
      return validate(type, parseContent(payload.message?.content), jobs);
    } catch (error) {
      throw isOllamaError(error) ? error : classify(error);
    } finally { clearTimeout(timer); }
  })();
  pendingRequests.set(key, operation);
  return operation.finally(() => pendingRequests.delete(key));
};

const profileFor = (student = {}) => JSON.stringify({ fullName: student.fullName || '', major: student.major || '', skills: student.skills || [], desiredPositions: student.desiredPositions || [] });
const analyzeCV = async (cvContent) => ({ success: true, data: await request('analysis', `Phân tích CV:\n${String(cvContent).slice(0, 10000)}`, schemas.analysis) });
const generateCVContent = async (student, options = {}) => {
  const section = options.section;
  const schema = section === 'careerObjective' ? { type: 'object', required: ['careerObjective'], properties: { careerObjective: { type: 'string' } } } : schemas.content;
  const requestType = section === 'careerObjective' ? 'careerObjective' : 'content';
  return { success: true, data: await request(requestType, `Viết nội dung CV từ hồ sơ:\n${profileFor(student)}${section ? `\nChỉ viết mục: ${section}` : ''}`, schema) };
};
const improveCV = async (cvContent, jobDescription = '') => ({ success: true, data: await request('improvement', `Cải thiện CV:\n${String(cvContent).slice(0, 8000)}\nMô tả việc làm:\n${String(jobDescription).slice(0, 2000)}`, schemas.improvement) });
const recommendJobsWithAI = async (student, jobs) => {
  const result = await request('recommendations', `Ứng viên:\n${profileFor(student)}\nViệc làm:\n${JSON.stringify(jobs)}`, schemas.recommendations, jobs);
  return { overallAdvice: result.overallAdvice, recommendations: result.recommendations };
};

module.exports = { generateCVContent, analyzeCV, improveCV, recommendJobsWithAI, OLLAMA_MODEL };