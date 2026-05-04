import axios from 'axios';

const BASE = 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Backend wraps all responses as { success, message, data }. Unwrap automatically.
api.interceptors.response.use(
  (res) => (res.data?.data !== undefined ? res.data.data : res.data),
  (err) => Promise.reject(err.response?.data || err)
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password, role) => api.post('/auth/register', { name, email, password, role }),
};

export const sessionAPI = {
  list: (state) => api.get('/admin/sessions' + (state ? `?state=${state}` : '')),
  get: (id) => api.get(`/admin/sessions/${id}`),
  create: (data) => api.post('/admin/sessions', data),
  update: (id, data) => api.put(`/admin/sessions/${id}`, data),
  delete: (id) => api.delete(`/admin/sessions/${id}`),
  setState: (id, state) => api.patch(`/admin/sessions/${id}/state`, { state }),
  analytics: (id) => api.get(`/admin/sessions/${id}/analytics`),
  notify: (id, message, type) => api.post(`/admin/sessions/${id}/notify`, { message, type }),
};

export const escalationAPI = {
  list: (sessionId, status = 'all') => api.get(`/admin/sessions/${sessionId}/escalations?status=${status}`),
  respond: (id, response) => api.patch(`/escalations/${id}/respond`, { response }),
};

export const pollAPI = {
  list: (sessionId) => api.get(`/admin/sessions/${sessionId}/polls`),
  create: (sessionId, data) => api.post(`/admin/sessions/${sessionId}/polls`, data),
  update: (pollId, data) => api.put(`/admin/polls/${pollId}`, data),
  delete: (pollId) => api.delete(`/admin/polls/${pollId}`),
  release: (pollId) => api.patch(`/admin/polls/${pollId}/release`),
  close: (pollId) => api.patch(`/admin/polls/${pollId}/close`),
  results: (pollId) => api.get(`/admin/polls/${pollId}/results`),
};

export const notificationAPI = {
  send: (data) => api.post('/admin/notifications/broadcast', data),
  listBroadcasts: () => api.get('/admin/notifications/broadcasts'),
  deleteBroadcast: (broadcastId) => api.delete(`/admin/notifications/broadcasts/${broadcastId}`),
};

export const userAPI = {
  list: (role) => api.get('/admin/users' + (role ? `?role=${role}` : '')),
  create: (data) => api.post('/admin/users', data),
  updateRole: (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  delete: (id) => api.delete(`/admin/users/${id}`),
};

export const classScheduleAPI = {
  list:   ()         => api.get('/class-schedule/admin'),
  create: (data)     => api.post('/class-schedule/admin', data),
  update: (id, data) => api.put(`/class-schedule/admin/${id}`, data),
  delete: (id)       => api.delete(`/class-schedule/admin/${id}`),
};

export const teamAPI = {
  list:   ()         => api.get('/leaderboard/admin/teams'),
  create: (data)     => api.post('/leaderboard/admin/teams', data),
  update: (id, data) => api.put(`/leaderboard/admin/teams/${id}`, data),
  delete: (id)       => api.delete(`/leaderboard/admin/teams/${id}`),
};

export const challengeAPI = {
  list:    ()         => api.get('/leaderboard/admin/challenges'),
  create:  (data)     => api.post('/leaderboard/admin/challenges', data),
  update:  (id, data) => api.put(`/leaderboard/admin/challenges/${id}`, data),
  delete:  (id)       => api.delete(`/leaderboard/admin/challenges/${id}`),
  activate:(id)       => api.patch(`/leaderboard/admin/challenges/${id}/activate`),
};

export const scoreAPI = {
  list:   (challengeId) => api.get('/leaderboard/admin/scores' + (challengeId ? `?challenge=${challengeId}` : '')),
  upsert: (data)        => api.post('/leaderboard/admin/scores', data),
  delete: (id)          => api.delete(`/leaderboard/admin/scores/${id}`),
};

export const leaderboardAdminAPI = {
  view:    (challengeId) => api.get('/leaderboard/admin/leaderboard' + (challengeId ? `?challenge=${challengeId}` : '')),
  reset:   (challengeId) => api.post('/leaderboard/admin/reset', challengeId ? { challenge: challengeId } : {}),
  students:()            => api.get('/leaderboard/admin/students'),
};

export const courseConfigAPI = {
  get:    ()     => api.get('/course-config/admin'),
  update: (data) => api.put('/course-config/admin', data),
};

export default api;
