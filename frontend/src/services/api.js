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
  return config;
});

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  loginMetamask: (data) => api.post('/auth/login-metamask', data),
  linkWallet: (data) => api.post('/auth/link-wallet', data),
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
