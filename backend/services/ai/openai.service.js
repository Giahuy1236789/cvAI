const OpenAI = require('openai');
const { createHash } = require('node:crypto');
const { createOpenAIError, toOpenAIError } = require('./openai.errors');

const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
const OPENAI_TIMEOUT_MS = Math.max(5000, Math.min(Number.parseInt(process.env.OPENAI_TIMEOUT_MS, 10) || 60000, 60000));
let client = null;
let clientApiKey = null;
let rateLimitUntil = 0;
let rateLimitError = null;
const pendingRequests = new Map();

const clipText = (value, length) => String(value || '').trim().slice(0, length);
const asStringArray = (value) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  : [];
const score = (value) => Math.max(0, Math.min(100, Number.parseInt(value, 10) || 0));

const getClient = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_openai_api_key_here') throw createOpenAIError('OPENAI_API_KEY_MISSING');
  if (!/^sk-[A-Za-z0-9_\-]+$/.test(apiKey)) throw createOpenAIError('OPENAI_API_KEY_INVALID');
  if (!client || clientApiKey !== apiKey) {
    // Do not automatically repeat quota failures or retry before Retry-After.
    client = new OpenAI({ apiKey, timeout: OPENAI_TIMEOUT_MS, maxRetries: 0 });
    clientApiKey = apiKey;
    rateLimitUntil = 0;
    rateLimitError = null;
  }
  return client;
};

const performRequest = async (activeClient, { schemaName, schema, systemPrompt, userPrompt, maxTokens = 1100, temperature = 0.25 }) => {
  try {
    const response = await activeClient.chat.completions.create({
      model: OPENAI_MODEL,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    });
    const text = response.choices?.[0]?.message?.content;
    if (!text) throw createOpenAIError('OPENAI_INVALID_RESPONSE');
    try { return JSON.parse(text); } catch (_) { throw createOpenAIError('OPENAI_INVALID_RESPONSE'); }
  } catch (cause) {
    const error = toOpenAIError(cause);
    if (activeClient === client && error.code === 'OPENAI_RATE_LIMITED' && error.retryAfterSeconds) {
      const retryAt = Date.now() + error.retryAfterSeconds * 1000;
      if (retryAt > rateLimitUntil) {
        rateLimitUntil = retryAt;
        rateLimitError = error;
      }
    }
    throw error;
  }
};

const requestJson = async (options) => {
  const activeClient = getClient();
  const key = createHash('sha256').update(JSON.stringify([clientApiKey, OPENAI_MODEL, options])).digest('hex');
  // A second click/tab shares the already running request for identical input.
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  if (rateLimitUntil > Date.now()) {
    const error = createOpenAIError('OPENAI_RATE_LIMITED');
    error.retryAfterSeconds = Math.ceil((rateLimitUntil - Date.now()) / 1000);
    error.provider = rateLimitError?.provider;
    throw error;
  }
  const pending = performRequest(activeClient, options);
  pendingRequests.set(key, pending);
  try { return await pending; }
  finally { pendingRequests.delete(key); }
};

const CV_CONTENT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['careerObjective', 'summary', 'experienceDescriptions', 'projectDescriptions', 'skillsPresentation'],
  properties: {
    careerObjective: { type: 'string' }, summary: { type: 'string' }, skillsPresentation: { type: 'string' },
    experienceDescriptions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'improvedDescription'], properties: { id: { type: 'string' }, improvedDescription: { type: 'string' } } } },
    projectDescriptions: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'improvedDescription'], properties: { id: { type: 'string' }, improvedDescription: { type: 'string' } } } },
  },
};

const CV_ANALYSIS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['strengths', 'weaknesses', 'suggestions', 'missingSkills', 'overallFeedback', 'actionPlan'],
  properties: {
    strengths: { type: 'array', items: { type: 'string' } }, weaknesses: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } }, missingSkills: { type: 'array', items: { type: 'string' } }, overallFeedback: { type: 'string' },
    actionPlan: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['priority', 'action', 'expectedImpact'], properties: { priority: { type: 'string', enum: ['Cao', 'Trung bình', 'Thấp'] }, action: { type: 'string' }, expectedImpact: { type: 'string' } } } },
  },
};

const CV_IMPROVEMENT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['improvements', 'additionalSkills', 'formatting'],
  properties: {
    improvements: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['section', 'suggestion', 'priority'], properties: { section: { type: 'string' }, suggestion: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] } } } },
    additionalSkills: { type: 'array', items: { type: 'string' } }, formatting: { type: 'array', items: { type: 'string' } },
  },
};

const JOB_RECOMMENDATION_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['overallAdvice', 'recommendations'],
  properties: {
    overallAdvice: { type: 'string' },
    recommendations: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['jobId', 'score', 'reason', 'matchedSkills', 'missingSkills', 'preparationSteps'], properties: { jobId: { type: 'string' }, score: { type: 'integer', minimum: 0, maximum: 100 }, reason: { type: 'string' }, matchedSkills: { type: 'array', items: { type: 'string' } }, missingSkills: { type: 'array', items: { type: 'string' } }, preparationSteps: { type: 'array', items: { type: 'string' } } } } },
  },
};

const generateCVContent = async (student) => {
  const profile = {
    fullName: student.fullName || '', major: student.major || '', university: student.university || '', graduationYear: student.graduationYear || '',
    skills: asStringArray(student.skills), desiredPositions: asStringArray(student.desiredPositions), careerObjective: student.careerObjective || '',
    experiences: (student.experiences || []).slice(0, 5), projects: (student.projects || []).slice(0, 5),
  };
  const data = await requestJson({
    schemaName: 'cv_content', schema: CV_CONTENT_SCHEMA, maxTokens: 1000,
    systemPrompt: 'Bạn là chuyên gia viết CV cho sinh viên IT tại Việt Nam. Chỉ được cải thiện cách diễn đạt từ dữ liệu cung cấp; tuyệt đối không bịa kỹ năng, kinh nghiệm, công ty, dự án hay thành tích. Viết toàn bộ bằng tiếng Việt chuyên nghiệp.',
    userPrompt: `Tạo nội dung CV chuyên nghiệp từ hồ sơ sau. Giữ nguyên id của từng kinh nghiệm và dự án trong kết quả.\n\nHồ sơ:\n${JSON.stringify(profile)}`,
  });
  return { success: true, data };
};

const analyzeCV = async (cvContent) => {
  const result = await requestJson({
    schemaName: 'cv_analysis', schema: CV_ANALYSIS_SCHEMA, maxTokens: 750,
    systemPrompt: 'Bạn là nhà tuyển dụng IT tại Việt Nam. Chỉ đánh giá dựa trên CV được cung cấp, không suy diễn hoặc bịa dữ liệu. Viết tiếng Việt rõ ràng, cụ thể và có thể thực hiện.',
    userPrompt: `Phân tích CV sau. Hãy chỉ ra điểm mạnh, phần thiếu/chưa rõ, kỹ năng nên bổ sung, gợi ý chỉnh sửa và tối đa 5 hành động ưu tiên; mỗi hành động ghi rõ tác động mong đợi.\n\nCV:\n${clipText(cvContent, 10000)}`,
  });
  return {
    success: true,
    data: {
      strengths: asStringArray(result.strengths), weaknesses: asStringArray(result.weaknesses), suggestions: asStringArray(result.suggestions), missingSkills: asStringArray(result.missingSkills),
      overallFeedback: String(result.overallFeedback || '').trim(),
      actionPlan: Array.isArray(result.actionPlan) ? result.actionPlan.slice(0, 5).map((item) => ({ priority: ['Cao', 'Trung bình', 'Thấp'].includes(item?.priority) ? item.priority : 'Trung bình', action: String(item?.action || '').trim(), expectedImpact: String(item?.expectedImpact || '').trim() })).filter((item) => item.action) : [],
    },
  };
};

const improveCV = async (cvContent, jobDescription = '') => {
  const data = await requestJson({
    schemaName: 'cv_improvement', schema: CV_IMPROVEMENT_SCHEMA, maxTokens: 750,
    systemPrompt: 'Bạn là chuyên gia tư vấn CV cho sinh viên IT tại Việt Nam. Chỉ đưa góp ý dựa trên CV và mô tả công việc được cung cấp. Viết tiếng Việt cụ thể, trung thực và không bịa thông tin.',
    userPrompt: `Gợi ý cải thiện CV sau${jobDescription ? ` để phù hợp công việc: ${clipText(jobDescription, 2000)}` : ''}.\n\nCV:\n${clipText(cvContent, 8000)}`,
  });
  return { success: true, data };
};

const recommendJobsWithAI = async (student, jobs) => {
  const candidate = {
    major: student.major || '', university: student.university || '', skills: asStringArray(student.skills),
    experiences: (student.experiences || []).slice(0, 4).map((item) => ({ position: clipText(item.position, 100), company: clipText(item.company, 100), description: clipText(item.description, 300) })),
    projects: (student.projects || []).slice(0, 4).map((item) => ({ name: clipText(item.name, 100), description: clipText(item.description, 300), technologies: asStringArray(item.technologies) })),
    desiredPositions: asStringArray(student.desiredPositions), desiredLocation: student.desiredLocation || '', desiredSalary: student.desiredSalary || '', careerObjective: clipText(student.careerObjective, 600),
  };
  const openings = jobs.map((job) => ({ id: String(job.id), title: clipText(job.title, 180), description: clipText(job.description, 500), skills: asStringArray(job.skills), location: clipText(job.location, 120), experience: clipText(job.experience, 120), salaryMin: job.salaryMin ?? null, salaryMax: job.salaryMax ?? null }));
  const result = await requestJson({
    schemaName: 'job_recommendations', schema: JOB_RECOMMENDATION_SCHEMA, maxTokens: openings.length === 1 ? 700 : 1300, temperature: 0.2,
    systemPrompt: 'Bạn là chuyên gia tư vấn nghề nghiệp IT tại Việt Nam. Đánh giá toàn diện mức độ phù hợp thực tế giữa ứng viên và các việc làm dựa trên kỹ năng, kinh nghiệm, dự án, mục tiêu, địa điểm, lương và mô tả công việc. Không bịa kỹ năng, yêu cầu hoặc thông tin. Viết tiếng Việt.',
    userPrompt: `Xếp hạng tất cả việc làm sau cho ứng viên. Phải trả đúng một kết quả cho mỗi jobId, giữ nguyên jobId. Mỗi kết quả: lý do ngắn gọn, kỹ năng khớp/thiếu và 1-2 bước chuẩn bị cụ thể.\n\nỨng viên:\n${JSON.stringify(candidate)}\n\nViệc làm:\n${JSON.stringify(openings)}`,
  });
  const recommendations = Array.isArray(result.recommendations) ? result.recommendations.map((item) => ({ jobId: String(item.jobId), score: score(item.score), reason: String(item.reason || '').trim(), matchedSkills: asStringArray(item.matchedSkills).slice(0, 6), missingSkills: asStringArray(item.missingSkills).slice(0, 6), preparationSteps: asStringArray(item.preparationSteps).slice(0, 2) })) : [];
  const expectedIds = new Set(openings.map((job) => job.id));
  if (recommendations.length !== expectedIds.size || new Set(recommendations.map((item) => item.jobId)).size !== expectedIds.size || recommendations.some((item) => !expectedIds.has(item.jobId))) throw createOpenAIError('OPENAI_INVALID_RESPONSE');
  return { overallAdvice: String(result.overallAdvice || '').trim(), recommendations };
};

const checkOpenAIConnection = async () => {
  try { await getClient().models.retrieve(OPENAI_MODEL); return { model: OPENAI_MODEL }; } catch (cause) { throw toOpenAIError(cause); }
};

// A model lookup only checks metadata access. This small request verifies the
// same chat endpoint and structured output mode used by CV analysis.
const checkOpenAIChat = async () => {
  const result = await requestJson({
    schemaName: 'connection_check',
    schema: {
      type: 'object', additionalProperties: false, required: ['ok'],
      properties: { ok: { type: 'boolean', enum: [true] } },
    },
    systemPrompt: 'Return the requested JSON object.',
    userPrompt: 'Return {"ok":true}.',
    maxTokens: 32,
    temperature: 0,
  });
  if (result?.ok !== true) throw createOpenAIError('OPENAI_INVALID_RESPONSE');
  return { model: OPENAI_MODEL, chat: true, structuredOutput: true };
};

module.exports = { generateCVContent, analyzeCV, improveCV, recommendJobsWithAI, checkOpenAIConnection, checkOpenAIChat, OPENAI_MODEL };
