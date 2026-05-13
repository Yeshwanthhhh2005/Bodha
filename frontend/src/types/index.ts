export type SessionState = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'DOUBT_SESSION';

export interface Instructor {
  _id?: string;
  name?: string;
  department?: string;
  avatar?: string;
}

export interface Session {
  _id: string;
  title: string;
  subtitle?: string;
  state: SessionState;
  scheduledAt: string;
  durationMinutes: number;
  category: string;
  instructor?: Instructor;
  watcherCount?: number;
  aiEnabled?: boolean;
}

export interface ChatMessage {
  _id: string;
  sender: 'student' | 'ai' | 'trainer';
  content: string;
  createdAt: string | Date;
  isHighlighted?: boolean;
}

export interface Poll {
  pollId: string;
  question: string;
  options: string[];
  counts?: number[];
  total?: number;
  answered?: number | null;
  closed?: boolean;
  correctOption?: number;
}

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Chat: undefined;
  ShortsRoot: undefined;
  LiveSessionsRoot: undefined;
  ClassScheduleRoot: undefined;
  AchievementsRoot: undefined;
};

export type LiveSessionsStackParamList = {
  LiveSessionList: undefined;
  LiveSession: { sessionId: string };
  Notifications: undefined;
};
