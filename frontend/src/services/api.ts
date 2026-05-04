import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/constants';

let onAuthFailure: (() => void) | null = null;
export const setAuthFailureHandler = (cb: () => void) => { onAuthFailure = cb; };

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const status = err.response?.status;
    const body = err.response?.data;
    // Stale/invalid/missing token → clear and bounce to Login
    if (status === 401) {
      try { await AsyncStorage.removeItem('token'); } catch {}
      try { onAuthFailure?.(); } catch {}
    }
    return Promise.reject(body || err);
  }
);

export const sessionAPI = {
  getSession: (id: string) => api.get(`/sessions/${id}`),
  setReminder: (id: string) => api.post(`/sessions/${id}/remind`),
  removeReminder: (id: string) => api.delete(`/sessions/${id}/remind`),
  getMyReminders: () => api.get('/sessions/reminders/mine'),
};

export const chatAPI = {
  sendMessage: (sessionId: string, content: string) =>
    api.post(`/chat/${sessionId}/messages`, { content }),
  getHistory: (sessionId: string, page = 1) =>
    api.get(`/chat/${sessionId}/messages?page=${page}`),
};

export const escalationAPI = {
  escalate: (sessionId: string, question: string, originalMessageId: string) =>
    api.post(`/escalations/${sessionId}/escalate`, { question, originalMessageId }),
  getQueue: (sessionId: string) => api.get(`/escalations/${sessionId}/queue`),
  respond: (escalationId: string, response: string) =>
    api.patch(`/escalations/${escalationId}/respond`, { response }),
};

export const scheduleAPI = {
  getWeek: () => api.get('/schedule'),
};

export const classScheduleAPI = {
  getAll: () => api.get('/class-schedule'),
};

export const courseConfigAPI = {
  getConfig: () => api.get('/course-config'),
};

export const leaderboardAPI = {
  get: () => api.get('/leaderboard'),
  getChallenges: () => api.get('/leaderboard/challenges'),
};

export const pollAPI = {
  getActive: (sessionId: string) => api.get(`/polls/sessions/${sessionId}/active`),
  respond: (pollId: string, selectedOption: number) =>
    api.post(`/polls/${pollId}/respond`, { selectedOption }),
};

export const notificationAPI = {
  getAll: (page = 1) => api.get(`/notifications?page=${page}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Returns a short-lived player token — the actual YouTube URL never touches the client
export const playerAPI = {
  getToken: (sessionId: string) => api.get(`/player/${sessionId}/token`),
};

export default api;
