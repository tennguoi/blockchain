import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMetamaskLoginNonce: (data) => api.post('/auth/login-metamask/nonce', data),
  loginMetamask: (data) => api.post('/auth/login-metamask', data),
  getLinkWalletNonce: (data) => api.post('/auth/link-wallet/nonce', data),
  linkWallet: (data) => api.post('/auth/link-wallet', data),
  unlinkWallet: () => api.post('/auth/unlink-wallet'),
  registerStudent: (data) => api.post('/auth/register-student', data),
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

export const adminAPI = {
  getCertificates: (params) => api.get('/admin/certificates', { params }),
  getFailedCertificates: () => api.get('/admin/certificates/failed'),
  getCertificateDetail: (id) => api.get(`/admin/certificates/${id}`),
  reconcile: (id) => api.post(`/admin/certificates/${id}/reconcile`),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getVerificationLogs: (params) => api.get('/admin/verification-logs', { params }),
  getDashboard: () => api.get('/admin/dashboard'),
  getStudents: () => api.get('/admin/students'),
};

export const superAdminAPI = {
  registerRequest: (data) => api.post('/super-admin/institutions', data),
  getPending: () => api.get('/super-admin/pending'),
  getInstitutions: () => api.get('/super-admin/institutions'),
  approve: (id) => api.post(`/super-admin/approve/${id}`),
  suspend: (id) => api.post(`/super-admin/suspend/${id}`),
  activate: (id) => api.post(`/super-admin/activate/${id}`),
  getDashboard: () => api.get('/super-admin/dashboard'),
};

export default api;
