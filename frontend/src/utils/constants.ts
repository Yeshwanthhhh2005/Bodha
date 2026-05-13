export const API_BASE_URL = 'http://10.23.19.235:5000/api';
export const SOCKET_URL = 'http://10.23.19.235:5000';
/** Base for static files (videos, thumbnails) served from /uploads/*. */
export const MEDIA_BASE_URL = 'http://10.23.19.235:5000';

/** Resolve a server-relative path like "/uploads/shorts/abc.mp4" into an
 *  absolute URL the device can fetch. Leaves already-absolute URLs untouched. */
export const resolveMediaUrl = (urlOrPath: string | null | undefined): string => {
  if (!urlOrPath) return '';
  if (/^https?:\/\//i.test(urlOrPath)) return urlOrPath;
  return `${MEDIA_BASE_URL}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
};

export const SESSION_STATES = {
  UPCOMING: 'UPCOMING',
  LIVE: 'LIVE',
  COMPLETED: 'COMPLETED',
  DOUBT_SESSION: 'DOUBT_SESSION',
} as const;

export const DAY_COLORS: Record<string, string> = {
  Mon: '#7C3AED',
  Tue: '#2563EB',
  Wed: '#D97706',
  Thu: '#0891B2',
  Fri: '#DB2777',
  Sat: '#7C3AED',
  Sun: '#059669',
};

export const CHAT_TYPES = {
  AI: 'AI_CHAT',
  ESCALATION: 'TRAINER_ESCALATION',
  DOUBT: 'DOUBT_SESSION_CHAT',
} as const;
