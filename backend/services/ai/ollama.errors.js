const ERROR_RESPONSES = Object.freeze({
  OLLAMA_TIMEOUT: {
    status: 504,
    message: 'AI xử lý quá thời gian chờ. Hãy thử lại với nội dung ngắn hơn khi máy bớt bận.',
  },
  OLLAMA_UNAVAILABLE: {
    status: 503,
    message: 'Không thể kết nối Ollama. Hãy mở Ollama rồi thử lại.',
  },
  OLLAMA_MODEL_NOT_FOUND: {
    status: 503,
    message: 'Chưa có model AI đã cấu hình. Hãy tải model theo OLLAMA_MODEL trong backend/.env rồi thử lại.',
  },
  OLLAMA_INSUFFICIENT_MEMORY: {
    status: 503,
    message: 'Máy không đủ RAM để chạy model AI. Hãy đóng ứng dụng nặng hoặc chọn model nhỏ hơn rồi thử lại.',
  },
  OLLAMA_BUSY: {
    status: 503,
    message: 'AI đang xử lý yêu cầu khác. Hãy đợi một chút rồi thử lại.',
  },
  OLLAMA_INVALID_JSON: {
    status: 502,
    message: 'AI trả về dữ liệu chưa đúng định dạng. Hãy thử lại với nội dung ngắn hơn.',
  },
  OLLAMA_INVALID_RESPONSE: {
    status: 502,
    message: 'Kết quả AI thiếu thông tin cần thiết. Hãy thử lại với nội dung ngắn hơn.',
  },
  OLLAMA_TRUNCATED_RESPONSE: {
    status: 502,
    message: 'AI chưa tạo xong kết quả. Hãy thử lại với nội dung ngắn hơn.',
  },
  OLLAMA_REQUEST_FAILED: {
    status: 502,
    message: 'AI gặp lỗi khi xử lý yêu cầu. Hãy thử lại sau một chút.',
  },
});

const isOllamaError = (error) => typeof error?.code === 'string' && error.code.startsWith('OLLAMA_');

const createOllamaError = (code, message, status) => {
  const error = new Error(message);
  error.code = code;
  error.status = status ?? ERROR_RESPONSES[code]?.status ?? 502;
  return error;
};

const sendOllamaError = (res, error) => {
  if (!isOllamaError(error)) return false;
  const code = Object.hasOwn(ERROR_RESPONSES, error.code) ? error.code : 'OLLAMA_REQUEST_FAILED';
  const { status, message } = ERROR_RESPONSES[code];
  res.status(status).json({ success: false, code, message });
  return true;
};

module.exports = { createOllamaError, sendOllamaError, isOllamaError };
