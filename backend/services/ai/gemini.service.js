const { createHash } = require('node:crypto');
const { createGeminiError, isGeminiError } = require('./gemini.errors');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = (process.env.GEMINI_MODEL || '').trim().replace(/^models\//, '') || 'gemini-3.8-flash';
const GEMINI_TIMEOUT_MS = Math.max(5000, Math.min(Number.parseInt(process.env.GEMINI_TIMEOUT_MS, 10) || 60000, 60000));
const pendingRequests = new Map();

// Validate before normalization: missing scores must not become fabricated zeros.
const matchesSchema = (value, schema) => {
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    if ((schema.required || []).some((key) => !Object.hasOwn(value, key))) return false;
    return Object.entries(value).every(([key, item]) => schema.properties?.[key]
      ? matchesSchema(item, schema.properties[key]) : schema.additionalProperties !== false);
  }
  if (schema.type === 'array') {
    return Array.isArray(value)
      && (schema.minItems === undefined || value.length >= schema.minItems)
      && (schema.maxItems === undefined || value.length <= schema.maxItems)
      && value.every((item) => matchesSchema(item, schema.items));
  }
  if (schema.type === 'integer') {
    return Number.isInteger(value)
      && (schema.minimum === undefined || value >= schema.minimum)
      && (schema.maximum === undefined || value <= schema.maximum);
  }
  return typeof value === schema.type
    && (!schema.enum || schema.enum.includes(value));
};

const parseAIJson = (text) => {
  if (typeof text !== 'string' || !text.trim()) return null;

  const candidates = [text.trim()];
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) candidates.push(fenced[1].trim());

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(text.slice(firstBrace, lastBrace + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // Try the next JSON-shaped candidate.
    }
  }
  return null;
};

const isTransportTimeout = (cause) => [cause?.code, cause?.cause?.code]
  .some((code) => code === 'UND_ERR_HEADERS_TIMEOUT' || code === 'UND_ERR_BODY_TIMEOUT');

const getApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || /^(your[_ -].*|<.*>|undefined|null)$/i.test(apiKey)) {
    throw createGeminiError('GEMINI_API_KEY_MISSING');
  }
  return apiKey;
};

const providerError = (status, payload) => {
  const upstream = payload?.error;
  const details = Array.isArray(upstream?.details) ? upstream.details : [];
  const invalidKey = details.some((detail) => /^API_KEY_(INVALID|EXPIRED|NOT_FOUND)$/.test(detail?.reason))
    || /api.?key.*(?:not valid|invalid|expired|leaked|revoked)|(?:invalid|expired).*api.?key/i.test(upstream?.message || '');
  if (invalidKey || status === 401) return createGeminiError('GEMINI_API_KEY_INVALID');
  if (status === 403 || upstream?.status === 'PERMISSION_DENIED') return createGeminiError('GEMINI_PERMISSION_DENIED');
  if (status === 404) return createGeminiError('GEMINI_MODEL_NOT_FOUND');
  if (status === 429 || upstream?.status === 'RESOURCE_EXHAUSTED') return createGeminiError('GEMINI_QUOTA_EXCEEDED');
  if (status === 408 || status === 504 || upstream?.status === 'DEADLINE_EXCEEDED') return createGeminiError('GEMINI_TIMEOUT');
  if (status === 503 || upstream?.status === 'UNAVAILABLE') return createGeminiError('GEMINI_BUSY');
  return createGeminiError('GEMINI_REQUEST_FAILED');
};

// Keep keys in server-side headers and keep the deadline active through body parsing.
const fetchGemini = async (suffix, { body, timeoutMs = GEMINI_TIMEOUT_MS } = {}) => {
  const apiKey = getApiKey();
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const response = await fetch(`${GEMINI_BASE_URL}/models/${encodeURIComponent(GEMINI_MODEL)}${suffix}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: abortController.signal,
    });
    let payload;
    try {
      payload = await response.json();
    } catch (cause) {
      if (abortController.signal.aborted || isTransportTimeout(cause)) throw cause;
      if (!response.ok) throw providerError(response.status);
      throw createGeminiError('GEMINI_INVALID_RESPONSE');
    }
    if (!response.ok || payload?.error) throw providerError(response.status, payload);
    return payload;
  } catch (cause) {
    if (abortController.signal.aborted || cause?.name === 'AbortError' || isTransportTimeout(cause)) {
      throw createGeminiError('GEMINI_TIMEOUT');
    }
    if (isGeminiError(cause)) throw cause;
    throw createGeminiError('GEMINI_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
};

const checkGeminiConnection = async () => {
  const payload = await fetchGemini('', { timeoutMs: 10000 });
  if (!payload?.supportedGenerationMethods?.includes('generateContent')) {
    throw createGeminiError('GEMINI_MODEL_NOT_FOUND');
  }
  return { model: GEMINI_MODEL };
};

const performGeminiRequest = async ({ systemPrompt, userPrompt, schema, jsonGuide, temperature = 0.2, maxOutputTokens = 4096 }) => {
  const requiredKeys = Array.isArray(schema?.required) ? schema.required.join(', ') : '';
  const jsonInstruction = `\n\nBẮT BUỘC: Chỉ trả về một JSON hợp lệ, không có Markdown hay lời dẫn. Các khóa bắt buộc: ${requiredKeys}. ${jsonGuide || ''}`;
  // A small reasoning budget keeps interactive CV actions responsive.
  const thinkingConfig = /^gemini-3/.test(GEMINI_MODEL) ? { thinkingLevel: 'low' }
    : /^gemini-2\.5-flash/.test(GEMINI_MODEL) ? { thinkingBudget: 0 } : undefined;
  const payload = await fetchGemini(':generateContent', {
    body: {
      systemInstruction: { parts: [{ text: `${systemPrompt}${jsonInstruction}` }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        ...(thinkingConfig ? { thinkingConfig } : {}),
      },
    },
  });
  if (payload?.promptFeedback?.blockReason && payload.promptFeedback.blockReason !== 'BLOCK_REASON_UNSPECIFIED') {
    throw createGeminiError('GEMINI_CONTENT_BLOCKED');
  }
  const candidate = payload?.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') throw createGeminiError('GEMINI_TRUNCATED_RESPONSE');
  if (['SAFETY', 'RECITATION', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'IMAGE_SAFETY'].includes(candidate?.finishReason)) {
    throw createGeminiError('GEMINI_CONTENT_BLOCKED');
  }
  if (candidate?.finishReason !== 'STOP' || !Array.isArray(candidate?.content?.parts)) {
    throw createGeminiError('GEMINI_INVALID_RESPONSE');
  }
  const text = candidate.content.parts
    .filter((part) => !part.thought && typeof part.text === 'string')
    .map((part) => part.text).join('');
  const data = parseAIJson(text);
  if (!data) throw createGeminiError('GEMINI_INVALID_JSON');
  if (!matchesSchema(data, schema)) throw createGeminiError('GEMINI_INVALID_RESPONSE');
  return data;
};

const requestGemini = (request) => {
  const key = createHash('sha256').update(JSON.stringify(request)).digest('hex');
  if (pendingRequests.has(key)) return pendingRequests.get(key);
  const pending = performGeminiRequest(request).finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, pending);
  return pending;
};

const asStringArray = (value) => Array.isArray(value)
  ? value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
  : [];

const score = (value) => Math.max(0, Math.min(100, Number.parseInt(value, 10) || 0));
const clipText = (value, limit) => String(value || '').trim().slice(0, limit);

const CV_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['cvScore', 'skillScore', 'experienceScore', 'educationScore', 'projectScore', 'strengths', 'weaknesses', 'suggestions', 'missingSkills', 'overallFeedback', 'actionPlan'],
  properties: {
    cvScore: { type: 'integer', minimum: 0, maximum: 100 },
    skillScore: { type: 'integer', minimum: 0, maximum: 100 },
    experienceScore: { type: 'integer', minimum: 0, maximum: 100 },
    educationScore: { type: 'integer', minimum: 0, maximum: 100 },
    projectScore: { type: 'integer', minimum: 0, maximum: 100 },
    strengths: { type: 'array', maxItems: 3, items: { type: 'string' } },
    weaknesses: { type: 'array', maxItems: 3, items: { type: 'string' } },
    suggestions: { type: 'array', maxItems: 3, items: { type: 'string' } },
    missingSkills: { type: 'array', maxItems: 3, items: { type: 'string' } },
    overallFeedback: { type: 'string' },
    actionPlan: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['priority', 'action', 'expectedImpact'],
        properties: {
          priority: { type: 'string', enum: ['Cao', 'Trung bình', 'Thấp'] },
          action: { type: 'string' },
          expectedImpact: { type: 'string' },
        },
      },
    },
  },
};

const CV_CONTENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['careerObjective', 'summary', 'experienceDescriptions', 'projectDescriptions', 'skillsPresentation'],
  properties: {
    careerObjective: { type: 'string' },
    summary: { type: 'string' },
    experienceDescriptions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'improvedDescription'],
        properties: { id: { type: 'string' }, improvedDescription: { type: 'string' } },
      },
    },
    projectDescriptions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'improvedDescription'],
        properties: { id: { type: 'string' }, improvedDescription: { type: 'string' } },
      },
    },
    skillsPresentation: { type: 'string' },
  },
};

const CV_IMPROVEMENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['improvements', 'additionalSkills', 'formatting'],
  properties: {
    improvements: {
      type: 'array',
      maxItems: 4,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['section', 'suggestion', 'priority'],
        properties: {
          section: { type: 'string' },
          suggestion: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    additionalSkills: { type: 'array', maxItems: 3, items: { type: 'string' } },
    formatting: { type: 'array', maxItems: 3, items: { type: 'string' } },
  },
};

const JOB_RECOMMENDATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['overallAdvice', 'recommendations'],
  properties: {
    overallAdvice: { type: 'string' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['jobId', 'score', 'reason', 'matchedSkills', 'missingSkills', 'preparationSteps'],
        properties: {
          jobId: { type: 'string' },
          score: { type: 'integer', minimum: 0, maximum: 100 },
          reason: { type: 'string' },
          matchedSkills: { type: 'array', maxItems: 5, items: { type: 'string' } },
          missingSkills: { type: 'array', maxItems: 5, items: { type: 'string' } },
          preparationSteps: { type: 'array', maxItems: 2, items: { type: 'string' } },
        },
      },
    },
  },
};

const normalizeAnalysis = (result) => ({
  cvScore: score(result.cvScore),
  skillScore: score(result.skillScore),
  experienceScore: score(result.experienceScore),
  educationScore: score(result.educationScore),
  projectScore: score(result.projectScore),
  strengths: asStringArray(result.strengths),
  weaknesses: asStringArray(result.weaknesses),
  suggestions: asStringArray(result.suggestions),
  missingSkills: asStringArray(result.missingSkills),
  overallFeedback: typeof result.overallFeedback === 'string' ? result.overallFeedback.trim() : '',
  actionPlan: Array.isArray(result.actionPlan)
    ? result.actionPlan.slice(0, 5).map((item) => ({
      priority: ['Cao', 'Trung bình', 'Thấp'].includes(item?.priority) ? item.priority : 'Trung bình',
      action: String(item?.action || '').trim(),
      expectedImpact: String(item?.expectedImpact || '').trim(),
    })).filter((item) => item.action)
    : [],
});

const generateCVContent = async (studentProfile, { section } = {}) => {
  // The editor's rewrite button only needs this field, not an entire generated CV.
  if (section === 'careerObjective') {
    const profile = {
      major: clipText(studentProfile.major, 120),
      skills: asStringArray(studentProfile.skills).slice(0, 12),
      desiredPositions: asStringArray(studentProfile.desiredPositions).slice(0, 3),
      careerObjective: clipText(studentProfile.careerObjective, 700),
    };
    const data = await requestGemini({
      schema: {
        type: 'object', additionalProperties: false, required: ['careerObjective'],
        properties: { careerObjective: { type: 'string' } },
      },
      maxOutputTokens: 2048,
      systemPrompt: 'Viết lại mục tiêu nghề nghiệp cho sinh viên bằng tiếng Việt chuyên nghiệp, 2 câu ngắn. Chỉ dùng thông tin được cung cấp; không bịa kinh nghiệm hoặc thành tích. Trả JSON với khóa careerObjective.',
      userPrompt: JSON.stringify(profile),
    });
    if (!data.careerObjective.trim()) {
      throw createGeminiError('GEMINI_INVALID_RESPONSE', 'Gemini returned an empty career objective.', 502);
    }
    return { success: true, data };
  }
  const student = {
    fullName: studentProfile.fullName || '',
    major: studentProfile.major || '',
    university: studentProfile.university || '',
    graduationYear: studentProfile.graduationYear || '',
    skills: studentProfile.skills || [],
    desiredPositions: studentProfile.desiredPositions || [],
    careerObjective: studentProfile.careerObjective || '',
    experiences: studentProfile.experiences || [],
    projects: studentProfile.projects || [],
  };

  const data = await requestGemini({
    schema: CV_CONTENT_SCHEMA,
    jsonGuide: 'Dạng mảng: experienceDescriptions và projectDescriptions chứa {"id":"...","improvedDescription":"..."}.',
    maxOutputTokens: 4096,
    systemPrompt: 'Bạn là chuyên gia viết CV cho sinh viên IT tại Việt Nam. Chỉ được cải thiện cách diễn đạt từ thông tin được cung cấp; tuyệt đối không bịa thêm kỹ năng, kinh nghiệm, công ty, dự án hay thành tích. Toàn bộ nội dung viết bằng tiếng Việt chuyên nghiệp. Trả về JSON đúng schema, không Markdown.',
    userPrompt: `Hãy tạo nội dung CV chuyên nghiệp từ hồ sơ sau. Giữ nguyên id của từng kinh nghiệm và dự án trong kết quả.\n\nHồ sơ:\n${JSON.stringify(student)}`,
  });

  return { success: true, data };
};

const analyzeCV = async (cvContent) => {
  const result = await requestGemini({
    schema: CV_ANALYSIS_SCHEMA,
    jsonGuide: 'strengths, weaknesses, suggestions và missingSkills là mảng chuỗi, mỗi mảng 1-3 ý ngắn. actionPlan gồm 1-3 phần tử dạng {"priority":"Cao|Trung bình|Thấp","action":"...","expectedImpact":"..."}. Mỗi ý chỉ một câu ngắn, overallFeedback tối đa 2 câu.',
    maxOutputTokens: 4096,
    systemPrompt: 'Bạn là nhà tuyển dụng IT tại Việt Nam. Chỉ đánh giá từ CV được cung cấp, không suy diễn hoặc bịa dữ liệu. Trả lời toàn bộ bằng tiếng Việt, điểm 0-100 và đề xuất phải cụ thể, có thể thực hiện. Trả về JSON đúng schema, không Markdown.',
    userPrompt: `Phân tích CV sau. Nêu tối đa 3 hành động ưu tiên để cải thiện CV, mỗi hành động ghi rõ tác động mong đợi.\n\nCV:\n${clipText(cvContent, 9000)}`,
  });

  return { success: true, data: normalizeAnalysis(result) };
};

const improveCV = async (cvContent, jobDescription = '') => {
  const data = await requestGemini({
    schema: CV_IMPROVEMENT_SCHEMA,
    jsonGuide: 'improvements là mảng tối đa 4 ý {"section":"...","suggestion":"...","priority":"high|medium|low"}. additionalSkills và formatting là mảng chuỗi tối đa 3 ý. Mỗi ý chỉ một câu ngắn.',
    maxOutputTokens: 4096,
    systemPrompt: 'Bạn là chuyên gia tư vấn CV cho sinh viên IT tại Việt Nam. Chỉ đưa ra góp ý dựa trên CV và mô tả công việc được cung cấp. Viết tiếng Việt, cụ thể, trung thực và không bịa thông tin. Trả về JSON đúng schema, không Markdown.',
    userPrompt: `Hãy gợi ý cải thiện CV sau${jobDescription ? ` để phù hợp công việc: ${clipText(jobDescription, 2000)}` : ''}.\n\nCV:\n${clipText(cvContent, 7000)}`,
  });

  return { success: true, data };
};

const recommendJobsWithAI = async (student, jobs) => {
  if (jobs.length === 0) return { overallAdvice: '', recommendations: [] };
  const candidate = {
    major: student.major || '',
    university: student.university || '',
    skills: asStringArray(student.skills),
    experiences: (student.experiences || []).slice(0, 4).map((item) => ({
      position: clipText(item.position, 100), company: clipText(item.company, 100), description: clipText(item.description, 300),
    })),
    projects: (student.projects || []).slice(0, 4).map((item) => ({
      name: clipText(item.name, 100), description: clipText(item.description, 300), technologies: asStringArray(item.technologies),
    })),
    desiredPositions: asStringArray(student.desiredPositions),
    desiredLocation: student.desiredLocation || '',
    desiredSalary: student.desiredSalary || '',
    careerObjective: clipText(student.careerObjective, 700),
  };

  const openings = jobs.map((job) => ({
    id: String(job.id),
    title: clipText(job.title, 180),
    description: clipText(job.description, 450),
    skills: asStringArray(job.skills),
    location: clipText(job.location, 120),
    experience: clipText(job.experience, 120),
    salaryMin: job.salaryMin ?? null,
    salaryMax: job.salaryMax ?? null,
  }));

  const recommendationItems = JOB_RECOMMENDATION_SCHEMA.properties.recommendations.items;
  const schema = {
    ...JOB_RECOMMENDATION_SCHEMA,
    properties: {
      ...JOB_RECOMMENDATION_SCHEMA.properties,
      recommendations: {
        type: 'array', minItems: openings.length, maxItems: openings.length,
        items: {
          ...recommendationItems,
          properties: { ...recommendationItems.properties, jobId: { type: 'string', enum: openings.map((job) => job.id) } },
        },
      },
    },
  };
  const result = await requestGemini({
    schema,
    jsonGuide: 'recommendations là mảng {"jobId":"...","score":0-100,"reason":"...","matchedSkills":["..."],"missingSkills":["..."],"preparationSteps":["..."]}. Mỗi mảng kỹ năng tối đa 5 phần tử, preparationSteps tối đa 2 phần tử và reason không quá 2 câu.',
    temperature: 0.2,
    maxOutputTokens: openings.length === 1 ? 4096 : 8192,
    systemPrompt: 'Bạn là chuyên gia tư vấn nghề nghiệp IT tại Việt Nam. So sánh toàn diện hồ sơ ứng viên với các việc làm được cung cấp dựa trên kỹ năng, kinh nghiệm, dự án, mục tiêu, địa điểm, mức lương và mô tả công việc. Không dùng công thức điểm cố định, không bịa kỹ năng hay yêu cầu. Trả toàn bộ bằng tiếng Việt và JSON đúng schema, không Markdown.',
    userPrompt: `Xếp hạng TẤT CẢ công việc sau cho ứng viên. Phải trả đúng một kết quả cho mỗi jobId và giữ nguyên jobId. Mỗi kết quả cần một câu giải thích lý do, các kỹ năng khớp/thiếu và 1-2 bước chuẩn bị ngắn trước khi ứng tuyển.\n\nỨng viên:\n${JSON.stringify(candidate)}\n\nViệc làm:\n${JSON.stringify(openings)}`,
  });

  if (new Set(result.recommendations.map((item) => item.jobId)).size !== openings.length) {
    throw createGeminiError('GEMINI_INVALID_RESPONSE', 'Gemini returned duplicate or missing job recommendations.', 502);
  }

  return {
    overallAdvice: typeof result.overallAdvice === 'string' ? result.overallAdvice.trim() : '',
    recommendations: result.recommendations.map((item) => ({
      jobId: String(item.jobId),
      score: score(item.score),
      reason: String(item.reason || '').trim(),
      matchedSkills: asStringArray(item.matchedSkills),
      missingSkills: asStringArray(item.missingSkills),
      preparationSteps: asStringArray(item.preparationSteps).slice(0, 3),
    })),
  };
};

module.exports = { generateCVContent, analyzeCV, improveCV, recommendJobsWithAI, checkGeminiConnection, GEMINI_MODEL };
