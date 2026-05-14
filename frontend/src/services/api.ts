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

// ─── NPT-020: 30 Second Shorts ────────────────────────────────────────────────
export const shortsAPI = {
  // Feed (only approved videos)
  feed: (section: 'trainer' | 'student' = 'trainer', topic?: string, page = 1) =>
    api.get(`/shorts/feed?section=${section}${topic ? `&topic=${encodeURIComponent(topic)}` : ''}&page=${page}`),
  trending:    () => api.get('/shorts/trending'),
  topCreators: () => api.get('/shorts/top-creators'),

  // My uploads
  myShorts: () => api.get('/shorts/mine'),

  // Upload (multipart) — `payload` is a FormData with: video file, title, topic, description
  upload: (payload: FormData) =>
    api.post('/shorts/upload', payload, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Engagement
  like:  (id: string) => api.post(`/shorts/${id}/like`),
  view:  (id: string) => api.post(`/shorts/${id}/view`),
  share: (id: string) => api.post(`/shorts/${id}/share`),

  // Creator follow
  follow:   (creatorId: string) => api.post(`/shorts/creators/${creatorId}/follow`),
  unfollow: (creatorId: string) => api.delete(`/shorts/creators/${creatorId}/follow`),
};

// ─── NPT-030: Daily Puzzle / Mind Twister ─────────────────────────────────────
export const puzzleAPI = {
  getToday:       ()                          => api.get('/puzzles/today'),
  getHistory:     (page = 1)                  => api.get(`/puzzles/history?page=${page}`),
  getMyProgress:  ()                          => api.get('/puzzles/my-progress'),
  getLeaderboard: ()                          => api.get('/puzzles/leaderboard'),
  getPuzzle:      (id: string)                => api.get(`/puzzles/${id}`),
  submitAnswer:   (id: string, answer: string)=> api.post(`/puzzles/${id}/submit`, { answer }),
};

// ─── NPT-027: AI Help Assistant ───────────────────────────────────────────────
export const aiAssistantAPI = {
  send:    (content: string) => api.post('/ai/messages', { content }),
  history: ()                => api.get('/ai/history'),
  clear:   ()                => api.delete('/ai/history'),
};

export default api;
