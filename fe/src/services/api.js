import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[DEBUG API] ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
  console.log('[DEBUG API] Request data:', JSON.stringify(config.data, null, 2));
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`[DEBUG API] Response ${response.status}:`, JSON.stringify(response.data, null, 2));
    return response;
  },
  (error) => {
    console.log(`[DEBUG API] ERROR ${error.response?.status || 'NO RESPONSE'}:`);
    console.log('  url:', error.config?.url);
    console.log('  method:', error.config?.method);
    console.log('  requestData:', error.config?.data ? JSON.parse(error.config.data) : null);
    console.log('  responseData:', JSON.stringify(error.response?.data, null, 2));
    console.log('  message:', error.message);
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  loginMetamask: (data) => api.post('/auth/login-metamask', data),
  linkWallet: (data) => api.post('/auth/link-wallet', data),
  unlinkWallet: () => api.post('/auth/unlink-wallet'),
};

export const certAPI = {
  issue: (formData) => api.post('/certificates/issue', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  verify: (id) => api.get(`/certificates/verify/${id}`),
  getStudentCerts: (studentId) => api.get(`/certificates/student/${studentId}`),
  revoke: (id, reason) => api.post(`/certificates/revoke/${id}`, { reason }),
  getStats: () => api.get('/certificates/stats'),
};

export default api;
