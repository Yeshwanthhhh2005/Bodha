import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_URL } from '../utils/constants';

const REAL_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5ZjFiMjJlNTVlY2UzOWMxNjgxYTRhMSIsImlhdCI6MTc3NzQ0NzQ3MCwiZXhwIjoxODA4OTgzNDcwfQ.YTA1wJCCIXV0FLsBYAT4bQ_e1vZNbFOMPVJoig-4Zl0';

let socket: Socket | null = null;

const getToken = async (): Promise<string> => {
  const stored = await AsyncStorage.getItem('token');
  if (!stored || stored === 'mock-token-for-preview') return REAL_TOKEN;
  return stored;
};

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  const token = await getToken();

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 3,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('Socket connected:', socket?.id));
  socket.on('disconnect', (reason: string) => console.log('Socket disconnected:', reason));
  socket.on('connect_error', (err: Error) =>
    console.log('Socket connect_error (non-fatal):', err.message)
  );

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinSession = (sessionId: string): void => {
  socket?.emit('join_session', { sessionId });
};

export const leaveSession = (sessionId: string): void => {
  socket?.emit('leave_session', { sessionId });
};
