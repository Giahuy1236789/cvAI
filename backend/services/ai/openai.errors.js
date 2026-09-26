const ERROR_RESPONSES = {
  OPENAI_API_KEY_MISSING: {
    status: 503,
    message: 'Chưa cấu hình OpenAI API key. Hãy thêm OPENAI_API_KEY vào backend/.env rồi khởi động lại backend.',
  },
  OPENAI_API_KEY_INVALID: {
    status: 503,
    message: 'OpenAI API key không hợp lệ hoặc đã bị vô hiệu hóa. Hãy kiểm tra lại OPENAI_API_KEY.',
  },
  OPENAI_QUOTA_EXCEEDED: {
    status: 402,
    message: 'OpenAI từ chối tạo nội dung vì tài khoản hoặc project của API key không đủ hạn mức. Quản trị viên cần kiểm tra số dư API và giới hạn sử dụng trên OpenAI Platform; bấm thử lại không khôi phục hạn mức.',
  },
  OPENAI_PERMISSION_DENIED: {
    status: 503,
    message: 'OpenAI từ chối quyền truy cập. Quản trị viên cần kiểm tra quyền của API key, project và model đang sử dụng.',
  },
  OPENAI_RATE_LIMITED: {
    status: 429,
    message: 'OpenAI đang giới hạn số yêu cầu hoặc lượng nội dung xử lý. Nếu lỗi tiếp diễn, quản trị viên cần kiểm tra hạn mức OpenAI API.',
  },
  OPENAI_USAGE_LIMIT: {
    status: 429,
    message: 'OpenAI từ chối yêu cầu do giới hạn sử dụng nhưng chưa cung cấp nguyên nhân cụ thể. Quản trị viên cần kiểm tra hạn mức OpenAI API để tiếp tục phân tích CV.',
  },
  OPENAI_MODEL_NOT_FOUND: {
    status: 503,
    message: 'Model OpenAI đã cấu hình không khả dụng. Hãy kiểm tra OPENAI_MODEL trong backend/.env.',
  },
  OPENAI_TIMEOUT: {
    status: 504,
    message: 'OpenAI phản hồi quá lâu. Hãy thử lại sau.',
  },
  OPENAI_UNAVAILABLE: {
    status: 503,
    message: 'Không thể kết nối OpenAI. Hãy kiểm tra mạng rồi thử lại.',
  },
  OPENAI_INVALID_RESPONSE: {
    status: 502,
    message: 'OpenAI trả về dữ liệu chưa đúng định dạng. Hãy thử lại.',
  },
  OPENAI_REQUEST_FAILED: {
    status: 502,
    message: 'OpenAI không thể xử lý yêu cầu này lúc này. Hãy thử lại sau.',
  },
};

const QUOTA_MESSAGES = {
  credit_balance_exhausted: 'OpenAI thông báo tổ chức của API key đã hết số dư API. Quản trị viên cần bổ sung số dư trên OpenAI Platform để tiếp tục.',
  billing_not_active: 'OpenAI thông báo thanh toán API chưa được kích hoạt. Quản trị viên cần kiểm tra thiết lập Billing trên OpenAI Platform.',
  billing_hard_limit_reached: 'OpenAI thông báo đã chạm giới hạn thanh toán API. Quản trị viên cần kiểm tra Billing và giới hạn chi tiêu trên OpenAI Platform.',
  organization_spend_limit_exceeded: 'OpenAI thông báo tổ chức của API key đã chạm giới hạn chi tiêu. Quản trị viên cần kiểm tra giới hạn chi tiêu của tổ chức trên OpenAI Platform.',
  project_spend_limit_exceeded: 'OpenAI thông báo project của API key đã chạm giới hạn chi tiêu. Quản trị viên cần kiểm tra giới hạn chi tiêu của đúng project trên OpenAI Platform.',
  organization_usage_limit_exceeded: 'OpenAI thông báo tổ chức của API key đã chạm giới hạn sử dụng được cấp. Quản trị viên cần kiểm tra Limits hoặc yêu cầu tăng hạn mức trên OpenAI Platform.',
};

const getOpenAIErrorMessage = (error) => {
  if (error?.code === 'OPENAI_QUOTA_EXCEEDED') {
    for (const reason of [error.provider?.code, error.provider?.type]) {
      if (Object.hasOwn(QUOTA_MESSAGES, reason)) return QUOTA_MESSAGES[reason];
    }
  }
  return ERROR_RESPONSES[error?.code]?.message || ERROR_RESPONSES.OPENAI_REQUEST_FAILED.message;
};

const createOpenAIError = (code, message, status) => {
  const resolvedCode = Object.hasOwn(ERROR_RESPONSES, code) ? code : 'OPENAI_REQUEST_FAILED';
  const error = new Error(message || ERROR_RESPONSES[resolvedCode].message);
  error.code = resolvedCode;
  error.status = status || ERROR_RESPONSES[resolvedCode].status;
  return error;
};

const isOpenAIError = (error) => typeof error?.code === 'string' && error.code.startsWith('OPENAI_');

const headerValue = (headers, name) => typeof headers?.get === 'function'
  ? headers.get(name)
  : Object.entries(headers || {}).find(([key]) => key.toLowerCase() === name)?.[1];

const durationSeconds = (value) => {
  const text = String(value || '').trim();
  const parts = [...text.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g)];
  if (!parts.length || parts.map(([part]) => part).join('') !== text) return 0;
  const units = { ms: 0.001, s: 1, m: 60, h: 3600, d: 86400 };
  return Math.ceil(parts.reduce((sum, [, amount, unit]) => sum + Number(amount) * units[unit], 0));
};

// Respect the provider's delay, including limits that reset later than a minute.
const readRetryAfterSeconds = (headers) => {
  const milliseconds = headerValue(headers, 'retry-after-ms');
  if (milliseconds != null && Number.isFinite(Number(milliseconds)) && Number(milliseconds) > 0) {
    return Math.ceil(Number(milliseconds) / 1000);
  }
  const retryAfter = headerValue(headers, 'retry-after');
  if (retryAfter != null && String(retryAfter).trim() !== '') {
    const delay = Number.isFinite(Number(retryAfter))
      ? Number(retryAfter)
      : (Date.parse(retryAfter) - Date.now()) / 1000;
    if (Number.isFinite(delay) && delay > 0) return Math.ceil(delay);
  }
  const resets = ['requests', 'tokens'].map((resource) => {
    const remaining = headerValue(headers, `x-ratelimit-remaining-${resource}`);
    return remaining != null && String(remaining).trim() !== '' && Number(remaining) === 0
      ? durationSeconds(headerValue(headers, `x-ratelimit-reset-${resource}`)) : 0;
  });
  const seconds = Math.max(...resets);
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : undefined;
};

const safeIdentifier = (value) => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(value)
  && !/^sk-/i.test(value) ? value : undefined;

const toOpenAIError = (cause) => {
  if (isOpenAIError(cause)) return cause;
  const status = Number(cause?.status || cause?.statusCode);
  const names = [cause?.name, cause?.constructor?.name];
  const codes = [cause?.code, cause?.type, cause?.error?.code, cause?.error?.type];
  const details = [cause?.error?.message, cause?.message].filter((value) => typeof value === 'string').join(' ');
  let code = 'OPENAI_REQUEST_FAILED';
  if (status === 401 || codes.includes('invalid_api_key')) code = 'OPENAI_API_KEY_INVALID';
  else if (status === 403) code = 'OPENAI_PERMISSION_DENIED';
  else if (status === 429) {
    const quotaExceeded = codes.some((value) => [
      'insufficient_quota', 'billing_hard_limit_reached', 'billing_not_active',
      'credit_balance_exhausted', 'organization_spend_limit_exceeded',
      'project_spend_limit_exceeded', 'organization_usage_limit_exceeded',
    ].includes(value))
      || /exceeded your current quota|check your plan and billing|billing hard limit|insufficient (?:credits|balance)|credit balance/i.test(details);
    code = quotaExceeded ? 'OPENAI_QUOTA_EXCEEDED'
      : codes.some((value) => ['rate_limit_exceeded', 'rate_limit_error', 'slow_down'].includes(value))
        || /rate limit|too many requests/i.test(details) || readRetryAfterSeconds(cause?.headers)
        ? 'OPENAI_RATE_LIMITED' : 'OPENAI_USAGE_LIMIT';
  } else if (status === 404 || codes.includes('model_not_found')) code = 'OPENAI_MODEL_NOT_FOUND';
  else if (names.includes('APIConnectionTimeoutError') || names.includes('AbortError') || status === 408 || status === 504) code = 'OPENAI_TIMEOUT';
  else if (names.includes('APIConnectionError')
    || ['ENOTFOUND', 'ECONNREFUSED'].includes(cause?.cause?.code)
    || /fetch failed|network error/i.test(`${details} ${cause?.cause?.message || ''}`)) code = 'OPENAI_UNAVAILABLE';

  const error = createOpenAIError(code);
  // Keep diagnostic identifiers, never raw provider payloads, CV text or API keys.
  error.provider = {
    status: Number.isFinite(status) ? status : undefined,
    code: safeIdentifier(cause?.code || cause?.error?.code),
    type: safeIdentifier(cause?.type || cause?.error?.type),
    requestId: safeIdentifier(cause?.requestID || cause?.request_id || headerValue(cause?.headers, 'x-request-id')),
  };
  error.message = getOpenAIErrorMessage(error);
  if (code === 'OPENAI_RATE_LIMITED') {
    const retryAfterSeconds = readRetryAfterSeconds(cause?.headers);
    if (retryAfterSeconds) error.retryAfterSeconds = retryAfterSeconds;
  }
  return error;
};

const sendOpenAIError = (res, error) => {
  if (!isOpenAIError(error)) return false;
  const fallback = ERROR_RESPONSES.OPENAI_REQUEST_FAILED;
  const retryAfterSeconds = Number.isSafeInteger(error.retryAfterSeconds) && error.retryAfterSeconds > 0
    ? error.retryAfterSeconds : undefined;
  if (retryAfterSeconds) res.setHeader('Retry-After', String(retryAfterSeconds));
  res.status(error.status || fallback.status).json({
    success: false,
    code: error.code,
    message: getOpenAIErrorMessage(error),
    ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
  });
  return true;
};

module.exports = { createOpenAIError, isOpenAIError, sendOpenAIError, toOpenAIError };
