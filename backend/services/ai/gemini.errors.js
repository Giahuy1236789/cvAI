const ERROR_RESPONSES = Object.freeze({
  GEMINI_API_KEY_MISSING: {
    status: 503,
    message: 'Chưa cấu hình Gemini API key. Hãy thêm GEMINI_API_KEY vào backend/.env rồi khởi động lại backend.',
  },
  GEMINI_API_KEY_INVALID: {
    status: 503,
    message: 'Gemini API key không hợp lệ hoặc đã bị vô hiệu hóa. Hãy cập nhật GEMINI_API_KEY trong backend/.env rồi khởi động lại backend.',
  },
  GEMINI_PERMISSION_DENIED: {
    status: 503,
    message: 'Gemini từ chối quyền truy cập. Hãy kiểm tra quyền sử dụng API của key trong Google AI Studio.',
  },
  GEMINI_MODEL_NOT_FOUND: {
    status: 503,
    message: 'Model Gemini đã cấu hình không khả dụng. Hãy kiểm tra GEMINI_MODEL trong backend/.env rồi khởi động lại backend.',
  },
  GEMINI_QUOTA_EXCEEDED: {
    status: 429,
    message: 'Gemini đã hết hạn mức hoặc nhận quá nhiều yêu cầu. Hãy kiểm tra quota trong Google AI Studio hoặc thử lại sau.',
  },
  GEMINI_TIMEOUT: {
    status: 504,
    message: 'Gemini phản hồi quá thời gian chờ. Hãy thử lại sau hoặc rút ngắn nội dung CV.',
  },
  GEMINI_UNAVAILABLE: {
    status: 503,
    message: 'Không thể kết nối Gemini API. Hãy kiểm tra kết nối Internet của backend rồi thử lại.',
  },
  GEMINI_BUSY: {
    status: 503,
    message: 'Gemini đang tạm quá tải. Hãy thử lại sau một chút.',
  },
  GEMINI_CONTENT_BLOCKED: {
    status: 422,
    message: 'Gemini không thể xử lý nội dung này. Hãy kiểm tra nội dung CV rồi thử lại.',
  },
  GEMINI_INVALID_JSON: {
    status: 502,
    message: 'Gemini trả về dữ liệu chưa đúng định dạng. Hãy thử lại.',
  },
  GEMINI_INVALID_RESPONSE: {
    status: 502,
    message: 'Kết quả Gemini thiếu thông tin cần thiết. Hãy thử lại.',
  },
  GEMINI_TRUNCATED_RESPONSE: {
    status: 502,
    message: 'Gemini chưa tạo xong kết quả. Hãy thử lại với nội dung ngắn hơn.',
  },
  GEMINI_REQUEST_FAILED: {
    status: 502,
    message: 'Gemini gặp lỗi khi xử lý yêu cầu. Hãy thử lại sau một chút.',
  },
});

const isGeminiError = (error) => typeof error?.code === 'string' && error.code.startsWith('GEMINI_');

const getGeminiErrorResponse = (error) => {
  const code = Object.hasOwn(ERROR_RESPONSES, error?.code) ? error.code : 'GEMINI_REQUEST_FAILED';
  return { code, ...ERROR_RESPONSES[code] };
};

const createGeminiError = (code, message, status) => {
  const error = new Error(message || ERROR_RESPONSES[code]?.message || ERROR_RESPONSES.GEMINI_REQUEST_FAILED.message);
  error.code = code;
  error.status = status ?? ERROR_RESPONSES[code]?.status ?? 502;
  return error;
};

const sendGeminiError = (res, error) => {
  if (!isGeminiError(error)) return false;
  const { code, status, message } = getGeminiErrorResponse(error);
  res.status(status).json({ success: false, code, message });
  return true;
};

module.exports = { createGeminiError, sendGeminiError, isGeminiError, getGeminiErrorResponse };
