import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor đính kèm Token
api.interceptors.request.use(
  (config) => {
    if (/^\/(?:ai(?:\/|$)|recommendations(?:\/|\?|$))/.test(config.url || '')) {
      // Allow the server's 60-second OpenAI timeout to return its error first.
      config.timeout = config.timeout || 75000;
      config.timeoutErrorMessage = 'ChatGPT chưa phản hồi kịp thời. Vui lòng thử lại.';
    }
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor xử lý lỗi chung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Chuyển hướng nếu cần thiết
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
