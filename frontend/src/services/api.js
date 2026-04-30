import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data || err)
);

export const sessionAPI = {
  getSession: (id) => api.get(`/sessions/${id}`),
  setReminder: (id) => api.post(`/sessions/${id}/remind`),
  removeReminder: (id) => api.delete(`/sessions/${id}/remind`),
  getMyReminders: () => api.get('/sessions/reminders/mine'),
};

export const chatAPI = {
  sendMessage: (sessionId, content) => api.post(`/chat/${sessionId}/messages`, { content }),
  getHistory: (sessionId, page = 1) => api.get(`/chat/${sessionId}/messages?page=${page}`),
};

export const escalationAPI = {
  escalate: (sessionId, question, originalMessageId) =>
    api.post(`/escalations/${sessionId}/escalate`, { question, originalMessageId }),
  getQueue: (sessionId) => api.get(`/escalations/${sessionId}/queue`),
  respond: (escalationId, response) => api.patch(`/escalations/${escalationId}/respond`, { response }),
};

export const scheduleAPI = {
  getWeek: () => api.get('/schedule'),
};

export const pollAPI = {
  getActive: (sessionId) => api.get(`/polls/sessions/${sessionId}/active`),
  respond: (pollId, selectedOption) => api.post(`/polls/${pollId}/respond`, { selectedOption }),
};

export const notificationAPI = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Returns a short-lived player token — the actual YouTube URL never touches the client
export const playerAPI = {
  getToken: (sessionId) => api.get(`/player/${sessionId}/token`),
};

export default api;
