import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sessionAPI, scheduleAPI, pollAPI, notificationAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { connectSocket, joinSession, leaveSession, getSocket } from '../services/socket';
import { SESSION_STATES } from '../utils/constants';
import VideoSection from '../components/VideoSection';
import SessionInfo from '../components/SessionInfo';
import SessionCard from '../components/SessionCard';
import ChatModal from '../components/ChatModal';
import PollModal from '../components/PollModal';
import type { Session, Poll } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LiveSessionsStackParamList } from '../types';

interface LiveSessionScreenProps {
  route?: { params?: { sessionId?: string } };
  navigation?: NativeStackNavigationProp<LiveSessionsStackParamList>;
}

const LiveSessionScreen: React.FC<LiveSessionScreenProps> = ({ route, navigation }) => {
  const { sessionId } = route?.params ?? {};
  const { unreadCount, setUnreadCount } = useNotification();

  const [session, setSession] = useState<Session | null>(null);
  const [schedule, setSchedule] = useState<Session[]>([]);
  const [remindedSessions, setRemindedSessions] = useState<Set<string>>(new Set());
  const [chatVisible, setChatVisible] = useState<boolean>(false);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [pollVisible, setPollVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // ── Data Loading ─────────────────────────────────────────────────────────
  const loadData = useCallback(async (skipPollReset = false): Promise<void> => {
    try {
      const [sessionRes, scheduleRes, remindersRes, pollRes, unreadRes] = await Promise.all([
        sessionId ? sessionAPI.getSession(sessionId) : Promise.resolve({ data: null }),
        scheduleAPI.getWeek(),
        sessionAPI.getMyReminders(),
        sessionId ? pollAPI.getActive(sessionId).catch(() => null) : Promise.resolve(null),
        notificationAPI.getUnreadCount().catch(() => null),
      ]);

      if (sessionRes.data) setSession(sessionRes.data as Session);
      setSchedule((scheduleRes.data as Session[]) || []);
      setRemindedSessions(new Set((remindersRes.data as string[]) || []));
      if (unreadRes?.data?.count !== undefined) setUnreadCount(unreadRes.data.count);

      if (pollRes?.data) {
        setActivePoll(pollRes.data as Poll);
        if (!skipPollReset) setPollVisible(true);
      } else if (!skipPollReset) {
        setActivePoll((prev) => (prev && !prev.closed ? null : prev));
      }
    } catch (err: unknown) {
      console.error('Load data error:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Re-check for a poll every 5 s while inside a session
  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => loadData(true), 5000);
    return () => clearInterval(interval);
  }, [sessionId, loadData]);

  // ── Socket Connection ─────────────────────────────────────────────────────
  useEffect(() => {
    const setup = async (): Promise<void> => {
      const socket = await connectSocket();

      socket.on('sessions:updated', () => { loadData(); });

      socket.on('reminder:session', ({ message }: { message: string }) => {
        Alert.alert('⏰ Reminder', message || 'Session is starting soon!');
      });

      socket.on('admin:notification', ({ message, type }: { message: string; type: string }) => {
        const title =
          type === 'warning' ? '⚠️ Notice' :
          type === 'success' ? '✅ Update' : '📢 Announcement';
        Alert.alert(title, message);
      });

      if (sessionId) {
        joinSession(sessionId);

        socket.on('session:joined', ({ state, watcherCount }: { state: string; watcherCount: number }) => {
          setSession((prev) => prev ? { ...prev, state: state as Session['state'], watcherCount } : prev);
        });

        socket.on('session:state_change', ({ state, session: updatedSession }: { state: string; session: Partial<Session> }) => {
          setSession((prev) => prev ? { ...prev, state: state as Session['state'], ...updatedSession } : prev);
        });

        socket.on('session:watcher_count', ({ count }: { count: number }) => {
          setSession((prev) => prev ? { ...prev, watcherCount: count } : prev);
        });

        socket.on('poll:released', (poll: Poll) => {
          setActivePoll(poll);
          setPollVisible(true);
        });

        socket.on('poll:closed', ({ counts, total, options, correctOption }: {
          counts: number[]; total: number; options: string[]; correctOption: number;
        }) => {
          setActivePoll((prev) => prev ? { ...prev, counts, total, options, correctOption, closed: true } : prev);
        });
      }
    };

    setup();

    return () => {
      if (sessionId) leaveSession(sessionId);
      const s = getSocket();
      s?.off('sessions:updated');
      s?.off('reminder:session');
      s?.off('admin:notification');
      s?.off('session:joined');
      s?.off('session:state_change');
      s?.off('session:watcher_count');
      s?.off('poll:released');
      s?.off('poll:closed');
    };
  }, [sessionId]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const toggleReminder = async (sid: string): Promise<void> => {
    try {
      if (remindedSessions.has(sid)) {
        await sessionAPI.removeReminder(sid);
        setRemindedSessions((prev) => {
          const next = new Set(prev);
          next.delete(sid);
          return next;
        });
      } else {
        await sessionAPI.setReminder(sid);
        setRemindedSessions((prev) => new Set([...prev, sid]));
      }
    } catch (err: unknown) {
      console.error('Reminder toggle error:', err instanceof Error ? err.message : err);
    }
  };

  const liveSession = schedule.find(
    (s) => s.state === SESSION_STATES.LIVE || s.state === SESSION_STATES.DOUBT_SESSION
  );
  const nextUpcoming = schedule
    .filter((s) => s.state === SESSION_STATES.UPCOMING)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] || null;

  const heroFeaturedId = !sessionId ? (liveSession?._id || nextUpcoming?._id || null) : null;
  const listItems = heroFeaturedId
    ? schedule.filter((s) => String(s._id) !== String(heroFeaturedId))
    : schedule;

  const onRefresh = (): void => {
    setRefreshing(true);
    loadData();
  };

  // ── List-view hero ───────────────────────────────────────────────────────
  const renderHero = (): React.ReactElement => {
    if (liveSession) {
      const isDoubt = liveSession.state === SESSION_STATES.DOUBT_SESSION;
      return (
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.88}
          onPress={() => navigation?.push('LiveSession', { sessionId: liveSession._id })}
        >
          <View style={styles.heroBg}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroBadge, isDoubt && styles.heroBadgeDoubt]}>
                <View style={styles.heroBadgeDot} />
                <Text style={styles.heroBadgeText}>{isDoubt ? 'DOUBT SESSION' : 'LIVE NOW'}</Text>
              </View>
              {!isDoubt && (
                <View style={styles.heroWatchers}>
                  <Text style={styles.heroWatchersText}>👤 {liveSession.watcherCount ?? 0}</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{liveSession.title}</Text>
            <Text style={styles.heroInstructor} numberOfLines={1}>
              {liveSession.instructor?.name || 'Instructor'}
            </Text>
            <View style={[styles.heroCta, isDoubt && { backgroundColor: '#7C3AED' }]}>
              <Text style={styles.heroCtaText}>
                {isDoubt ? '🎓 Join Doubt Session' : '▶  Watch Live'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    if (nextUpcoming) {
      const timeStr = new Date(nextUpcoming.scheduledAt).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });
      const dateStr = new Date(nextUpcoming.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric',
      });
      return (
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.88}
          onPress={() => navigation?.push('LiveSession', { sessionId: nextUpcoming._id })}
        >
          <View style={[styles.heroBg, styles.heroBgUpcoming]}>
            <View style={styles.heroTopRow}>
              <View style={[styles.heroBadge, styles.heroBadgeUpcoming]}>
                <Text style={styles.heroBadgeText}>📅  UPCOMING</Text>
              </View>
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>{nextUpcoming.title}</Text>
            <Text style={styles.heroInstructor} numberOfLines={1}>
              {nextUpcoming.instructor?.name || 'Instructor'}
            </Text>
            <Text style={styles.heroTime}>{dateStr} · {timeStr} · {nextUpcoming.durationMinutes} min</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={[styles.heroCard, styles.heroEmpty]}>
        <Text style={styles.heroEmptyIcon}>📭</Text>
        <Text style={styles.heroEmptyTitle}>No Sessions</Text>
        <Text style={styles.heroEmptySub}>No sessions are scheduled right now.</Text>
      </View>
    );
  };

  const renderStateBanner = (): React.ReactElement | null => {
    if (!session) return null;
    if (session.state === SESSION_STATES.DOUBT_SESSION) {
      return (
        <View style={styles.bannerDoubt}>
          <Text style={styles.bannerText}>🎓 Live Doubt Session Ongoing — Ask your trainer directly!</Text>
        </View>
      );
    }
    if (session.state === SESSION_STATES.UPCOMING) {
      return (
        <View style={styles.bannerUpcoming}>
          <Text style={styles.bannerText}>
            🕐 Session starts at{' '}
            {new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading sessions...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerIconBox}>
            <Text style={styles.headerIconText}>📹</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Live Sessions</Text>
            <Text style={styles.headerSubtitle}>Learn live. Interact. Excel.</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => {
              setUnreadCount(0);
              navigation?.navigate('Notifications');
            }}
          >
            <Text style={styles.notifIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarRow}>
            <View style={styles.avatarBtn}>
              <Text style={styles.avatarText}>🧑‍💻</Text>
            </View>
            <Text style={styles.chevron}>⌄</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        {sessionId ? <VideoSection session={session} /> : renderHero()}

        {renderStateBanner()}

        {activePoll && (
          <TouchableOpacity
            style={styles.pollBanner}
            onPress={() => setPollVisible(true)}
            activeOpacity={0.85}
          >
            <View style={styles.pollBannerLeft}>
              <View style={styles.pollLivePill}>
                <View style={[styles.pollDot, activePoll.closed && { backgroundColor: '#9CA3AF' }]} />
                <Text style={[styles.pollLiveText, activePoll.closed && { color: '#9CA3AF' }]}>
                  {activePoll.closed ? 'POLL ENDED' : 'LIVE POLL'}
                </Text>
              </View>
              <Text style={styles.pollQuestion} numberOfLines={1}>{activePoll.question}</Text>
            </View>
            <View style={[styles.pollAnswerBtn, activePoll.closed && { backgroundColor: '#374151' }]}>
              <Text style={styles.pollAnswerText}>
                {activePoll.closed ? '📊 Results' : activePoll.answered != null ? '✓ View' : 'Answer →'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <SessionInfo
          session={session ?? liveSession}
          onAskQuestion={() => setChatVisible(true)}
        />

        <View style={styles.scheduleHeader}>
          <Text style={styles.scheduleTitle}>All Sessions</Text>
          <TouchableOpacity>
            <Text style={styles.calendarViewBtn}>📅 Calendar View</Text>
          </TouchableOpacity>
        </View>

        {listItems.length === 0 ? (
          <View style={styles.emptySchedule}>
            <Text style={styles.emptyScheduleIcon}>📭</Text>
            <Text style={styles.emptyScheduleTitle}>No Sessions</Text>
            <Text style={styles.emptyScheduleText}>There are no sessions scheduled right now. Check back later.</Text>
          </View>
        ) : (
          listItems.map((s) => (
            <SessionCard
              key={s._id}
              session={s}
              onPress={() => navigation?.push('LiveSession', { sessionId: s._id })}
              onRemind={toggleReminder}
              isReminded={remindedSessions.has(s._id)}
              isSelected={s._id === sessionId}
            />
          ))
        )}

        <View style={styles.bottomPad} />
      </ScrollView>

      <ChatModal
        visible={chatVisible}
        onClose={() => setChatVisible(false)}
        session={session ?? liveSession}
      />

      <PollModal
        visible={pollVisible}
        poll={activePoll}
        onSubmit={pollAPI.respond}
        onDismiss={() => setPollVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', gap: 12 },
  loadingText:     { color: '#6B7280', fontSize: 14 },

  header:          { backgroundColor: '#4C1D95', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:         { padding: 4 },
  backIcon:        { fontSize: 22, color: '#fff', fontWeight: '600' },
  headerCenter:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox:   { width: 40, height: 40, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerIconText:  { fontSize: 18 },
  headerTitle:     { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSubtitle:  { fontSize: 11, color: '#C4B5FD', marginTop: 1 },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn:        { position: 'relative', padding: 4 },
  notifIcon:       { fontSize: 20 },
  notifBadge:      { position: 'absolute', top: 0, right: 0, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#4C1D95' },
  notifBadgeText:  { color: '#fff', fontSize: 9, fontWeight: '700' },
  avatarRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avatarBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#C4B5FD' },
  avatarText:      { fontSize: 18 },
  chevron:         { fontSize: 16, color: '#C4B5FD', fontWeight: '700', marginTop: 2 },

  scroll:          { flex: 1 },

  bannerDoubt:     { backgroundColor: '#EDE9FE', marginHorizontal: 16, marginTop: 10, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderLeftWidth: 4, borderLeftColor: '#7C3AED' },
  bannerUpcoming:  { backgroundColor: '#FEF3C7', marginHorizontal: 16, marginTop: 10, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, borderLeftWidth: 4, borderLeftColor: '#D97706' },
  bannerText:      { fontSize: 12, fontWeight: '600', color: '#374151' },

  pollBanner:      { marginHorizontal: 16, marginTop: 10, borderRadius: 12, backgroundColor: '#1E1B4B', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, gap: 10 },
  pollBannerLeft:  { flex: 1, gap: 4 },
  pollLivePill:    { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  pollDot:         { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  pollLiveText:    { fontSize: 9, fontWeight: '800', color: '#EF4444', letterSpacing: 0.8 },
  pollQuestion:    { fontSize: 13, fontWeight: '600', color: '#fff' },
  pollAnswerBtn:   { backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, flexShrink: 0 },
  pollAnswerText:  { fontSize: 12, fontWeight: '700', color: '#fff' },

  scheduleHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 20, marginBottom: 12, gap: 8 },
  scheduleTitle:   { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  calendarViewBtn: { fontSize: 13, color: '#7C3AED', fontWeight: '600', flexShrink: 0 },
  emptySchedule:   { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 32 },
  emptyScheduleIcon:  { fontSize: 52, marginBottom: 14 },
  emptyScheduleTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyScheduleText:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  bottomPad:       { height: 32 },

  heroCard:        { marginHorizontal: 16, marginTop: 10, borderRadius: 16, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.22, shadowRadius: 8 },
  heroBg:          { backgroundColor: '#0f0f1a', padding: 20, gap: 8 },
  heroBgUpcoming:  { backgroundColor: '#1a1040' },
  heroTopRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  heroBadge:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 5 },
  heroBadgeDoubt:  { backgroundColor: '#F97316' },
  heroBadgeUpcoming: { backgroundColor: '#4C1D95' },
  heroBadgeDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  heroBadgeText:   { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  heroWatchers:    { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  heroWatchersText:{ color: '#E2E8F0', fontSize: 11, fontWeight: '600' },
  heroTitle:       { fontSize: 18, fontWeight: '800', color: '#fff', lineHeight: 24 },
  heroInstructor:  { fontSize: 13, color: '#94A3B8' },
  heroTime:        { fontSize: 12, color: '#818CF8', fontWeight: '600', marginTop: 2 },
  heroCta:         { marginTop: 12, backgroundColor: '#EF4444', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  heroCtaText:     { color: '#fff', fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  heroEmpty:       { backgroundColor: '#F9FAFB', alignItems: 'center', paddingVertical: 40, borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  heroEmptyIcon:   { fontSize: 40, marginBottom: 10 },
  heroEmptyTitle:  { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  heroEmptySub:    { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24 },
});

export default LiveSessionScreen;
