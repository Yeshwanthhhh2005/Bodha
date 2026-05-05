import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { sessionAPI, scheduleAPI, pollAPI, notificationAPI } from '../services/api';
import { useNotification } from '../context/NotificationContext';
import { connectSocket, joinSession, leaveSession, getSocket } from '../services/socket';
import { SESSION_STATES } from '../utils/constants';
import VideoSection from '../components/VideoSection';
import SessionInfo from '../components/SessionInfo';
import ChatModal from '../components/ChatModal';
import PollModal from '../components/PollModal';
import type { Session, Poll } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LiveSessionsStackParamList } from '../types';

// ─── Day color & subject icon mapping ──────────────────────────────────────────
const DAY_COLORS: Record<string, string> = {
  Mon: '#7C3AED', Tue: '#10B981', Wed: '#F59E0B', Thu: '#3B82F6',
  Fri: '#EC4899', Sat: '#8B5CF6', Sun: '#14B8A6',
};

const renderSubjectIcon = (kind: string, color: string): React.ReactNode => {
  const size = 22;
  switch (kind) {
    case 'code':     return <Text style={{ fontSize: 17, fontWeight: '900', color }}>{'</>'}</Text>;
    case 'database': return <MaterialCommunityIcons name="database" size={size} color={color} />;
    case 'os':       return <MaterialCommunityIcons name="file-tree" size={size} color={color} />;
    case 'network':  return <Ionicons name="globe-outline" size={size} color={color} />;
    case 'security': return <MaterialCommunityIcons name="shield-account" size={size} color={color} />;
    case 'ai':       return <MaterialCommunityIcons name="brain" size={size} color={color} />;
    case 'design':   return <MaterialCommunityIcons name="palette" size={size} color={color} />;
    default:         return <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />;
  }
};

const SUBJECT_THEMES: { keys: string[]; kind: string; bg: string; fg: string }[] = [
  { keys: ['data structure', 'algorithm', 'dsa', 'dynamic'], kind: 'code',     bg: '#EDE9FE', fg: '#7C3AED' },
  { keys: ['database', 'sql', 'dbms'],                       kind: 'database', bg: '#D1FAE5', fg: '#059669' },
  { keys: ['operating system', 'os '],                       kind: 'os',       bg: '#FFEDD5', fg: '#F97316' },
  { keys: ['network'],                                       kind: 'network',  bg: '#DBEAFE', fg: '#3B82F6' },
  { keys: ['security', 'cyber'],                             kind: 'security', bg: '#FCE7F3', fg: '#EC4899' },
  { keys: ['ai', 'artificial', 'machine'],                   kind: 'ai',       bg: '#EDE9FE', fg: '#7C3AED' },
  { keys: ['c++', 'stl', 'cpp', 'java', 'python'],           kind: 'code',     bg: '#CCFBF1', fg: '#0D9488' },
  { keys: ['web', 'html', 'css', 'react'],                   kind: 'design',   bg: '#FEF3C7', fg: '#D97706' },
];

const themeFor = (title: string, category?: string): { kind: string; bg: string; fg: string } => {
  const t = (title + ' ' + (category || '')).toLowerCase();
  for (const th of SUBJECT_THEMES) {
    if (th.keys.some((k) => t.includes(k))) return th;
  }
  return { kind: 'default', bg: '#EDE9FE', fg: '#7C3AED' };
};

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
  const [loadError, setLoadError] = useState<string>('');

  // ── Data Loading ─────────────────────────────────────────────────────────
  const loadData = useCallback(async (skipPollReset = false): Promise<void> => {
    const safe = <T,>(p: Promise<T>): Promise<T | { __err: any }> =>
      p.catch((e) => ({ __err: e }));

    const [sessionRes, scheduleRes, remindersRes, pollRes, unreadRes] = await Promise.all([
      sessionId ? safe(sessionAPI.getSession(sessionId)) : Promise.resolve({ data: null }),
      safe(scheduleAPI.getWeek()),
      safe(sessionAPI.getMyReminders()),
      sessionId ? safe(pollAPI.getActive(sessionId)) : Promise.resolve(null),
      safe(notificationAPI.getUnreadCount()),
    ]);

    const isErr = (r: any) => r && '__err' in r;
    const errs: string[] = [];

    if (sessionId && isErr(sessionRes)) errs.push('session');
    else if ((sessionRes as any)?.data) setSession((sessionRes as any).data as Session);

    if (isErr(scheduleRes)) {
      errs.push('schedule');
      setSchedule([]);
    } else {
      setSchedule(((scheduleRes as any).data as Session[]) || []);
    }

    if (isErr(remindersRes)) errs.push('reminders');
    else setRemindedSessions(new Set(((remindersRes as any).data as string[]) || []));

    if (!isErr(unreadRes) && (unreadRes as any)?.data?.count !== undefined) {
      setUnreadCount((unreadRes as any).data.count);
    }

    if (!isErr(pollRes) && (pollRes as any)?.data) {
      setActivePoll((pollRes as any).data as Poll);
      if (!skipPollReset) setPollVisible(true);
    } else if (!skipPollReset) {
      setActivePoll((prev) => (prev && !prev.closed ? null : prev));
    }

    if (errs.length) {
      const firstErr: any =
        (isErr(sessionRes) && (sessionRes as any).__err) ||
        (isErr(scheduleRes) && (scheduleRes as any).__err) ||
        (isErr(remindersRes) && (remindersRes as any).__err);
      const msg = firstErr?.message || firstErr?.error || 'Network error';
      setLoadError(`Couldn't load ${errs.join(', ')} — ${msg}`);
      console.error('Load data error:', errs, firstErr);
    } else {
      setLoadError('');
    }

    setLoading(false);
    setRefreshing(false);
  }, [sessionId, setUnreadCount]);

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

  // ── List-view hero (video-player style) ─────────────────────────────────
  const renderHero = (): React.ReactElement => {
    const target = liveSession || nextUpcoming;
    if (!target) {
      return (
        <View style={[styles.heroCard, styles.heroEmpty]}>
          <Ionicons name="videocam-off-outline" size={44} color="#9CA3AF" style={{ marginBottom: 10 }} />
          <Text style={styles.heroEmptyTitle}>No Sessions</Text>
          <Text style={styles.heroEmptySub}>No sessions are scheduled right now.</Text>
        </View>
      );
    }
    const isLive  = !!liveSession;
    const isDoubt = liveSession?.state === SESSION_STATES.DOUBT_SESSION;

    return (
      <TouchableOpacity
        style={styles.heroCard}
        activeOpacity={0.92}
        onPress={() => navigation?.push('LiveSession', { sessionId: target._id })}
      >
        <View style={styles.heroBg}>
          {/* Top overlay: LIVE pill + watcher count */}
          <View style={styles.heroTopRow}>
            {isLive ? (
              <View style={[styles.livePill, isDoubt && { backgroundColor: '#F97316' }]}>
                <Text style={styles.livePillText}>{isDoubt ? 'DOUBT' : 'LIVE'}</Text>
              </View>
            ) : (
              <View style={styles.upcomingPill}>
                <Text style={styles.upcomingPillText}>UPCOMING</Text>
              </View>
            )}
            {isLive && (
              <View style={styles.watcherPill}>
                <Ionicons name="person" size={11} color="#fff" />
                <Text style={styles.watcherPillText}>{target.watcherCount ?? 0}</Text>
              </View>
            )}
          </View>

          {/* Center decorative content */}
          <View style={styles.heroCenter}>
            <Text style={styles.heroTitleBig} numberOfLines={2}>{target.title}</Text>
            <Text style={styles.heroSubBig} numberOfLines={1}>
              {target.instructor?.name || 'Instructor'}
            </Text>
          </View>

          {/* Bottom controls overlay */}
          <View style={styles.heroControls}>
            <View style={styles.heroControlsLeft}>
              <Ionicons name="pause" size={18} color="#fff" />
              <Ionicons name="volume-high" size={18} color="#fff" />
              {isLive && (
                <View style={styles.heroLiveDotRow}>
                  <View style={styles.heroLiveDot} />
                  <Text style={styles.heroLiveDotText}>LIVE</Text>
                </View>
              )}
            </View>
            <View style={styles.heroControlsRight}>
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Ionicons name="people" size={18} color="#fff" />
              <Ionicons name="expand" size={18} color="#fff" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Rich upcoming-class card ─────────────────────────────────────────────
  const renderUpcomingCard = (s: Session): React.ReactElement => {
    const d = new Date(s.scheduledAt);
    const dayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayKey   = dayShort.slice(0, 3);
    const dayColor = DAY_COLORS[dayKey] || '#7C3AED';
    const dateNum  = d.getDate();
    const monthSh  = d.toLocaleDateString('en-US', { month: 'short' });
    const timeStr  = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const theme    = themeFor(s.title, s.category);
    const reminded = remindedSessions.has(s._id);

    return (
      <TouchableOpacity
        key={s._id}
        style={styles.classCard}
        activeOpacity={0.85}
        onPress={() => navigation?.push('LiveSession', { sessionId: s._id })}
      >
        <View style={styles.dayChip}>
          <Text style={[styles.dayChipName, { color: dayColor }]}>{dayKey}</Text>
          <Text style={[styles.dayChipDate, { color: dayColor }]}>{dateNum}</Text>
          <Text style={[styles.dayChipMonth, { color: dayColor }]}>{monthSh}</Text>
        </View>

        <View style={[styles.subjectIconBox, { backgroundColor: theme.bg }]}>
          {renderSubjectIcon(theme.kind, theme.fg)}
        </View>

        <View style={styles.classMeta}>
          <Text style={styles.classTitle} numberOfLines={1}>{s.title}</Text>
          <Text style={styles.classProf} numberOfLines={1}>
            {s.instructor?.name || 'Instructor'}
          </Text>
          {!!s.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{s.category}</Text>
            </View>
          )}
        </View>

        <View style={styles.classRight}>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={12} color="#6B7280" />
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
          <Text style={styles.durationText}>{s.durationMinutes ?? 60} min</Text>
          <TouchableOpacity
            style={styles.remindBtn}
            onPress={(e) => { e.stopPropagation?.(); toggleReminder(s._id); }}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name={reminded ? 'notifications' : 'notifications-outline'}
              size={13}
              color={dayColor}
            />
            <Text style={[styles.remindText, { color: dayColor }]}>
              {reminded ? 'Reminded' : 'Remind Me'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#7C3AED" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={styles.headerIconBox}>
            <Ionicons name="videocam" size={22} color="#fff" />
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
            <Ionicons name="notifications-outline" size={24} color="#374151" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatarRow}>
            <View style={styles.avatarBtn}>
              <Ionicons name="person" size={18} color="#10B981" />
            </View>
            <Ionicons name="chevron-down" size={14} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />}
      >
        {!!loadError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorBannerText} numberOfLines={2}>{loadError}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.errorRetryBtn}>
              <Text style={styles.errorRetryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
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
          <Text style={styles.scheduleTitle}>Upcoming Classes (This Week)</Text>
          <TouchableOpacity style={styles.calBtn}>
            <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
            <Text style={styles.calendarViewBtn}>Calendar View</Text>
          </TouchableOpacity>
        </View>

        {listItems.length === 0 ? (
          <View style={styles.emptySchedule}>
            <Ionicons name="calendar-outline" size={52} color="#D1D5DB" style={{ marginBottom: 14 }} />
            <Text style={styles.emptyScheduleTitle}>No Sessions</Text>
            <Text style={styles.emptyScheduleText}>There are no sessions scheduled right now. Check back later.</Text>
          </View>
        ) : (
          listItems
            .filter((s) => s.state === SESSION_STATES.UPCOMING)
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map(renderUpcomingCard)
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

  // ── Light header ─────────────────────────────────────
  header:          { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn:         { padding: 4 },
  backIcon:        { fontSize: 26, color: '#7C3AED', fontWeight: '600' },
  headerCenter:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox:   { width: 42, height: 42, borderRadius: 11, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerIconText:  { fontSize: 18, color: '#fff' },
  headerTitle:     { fontSize: 17, fontWeight: '800', color: '#111827' },
  headerSubtitle:  { fontSize: 12, color: '#6B7280', marginTop: 1 },
  headerRight:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBtn:        { position: 'relative', padding: 4 },
  notifIcon:       { fontSize: 22 },
  notifBadge:      { position: 'absolute', top: 0, right: 0, backgroundColor: '#7C3AED', borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  notifBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  avatarRow:       { flexDirection: 'row', alignItems: 'center', gap: 2 },
  avatarBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#7C3AED' },
  avatarText:      { fontSize: 18 },
  chevron:         { fontSize: 14, color: '#9CA3AF', fontWeight: '700', marginTop: 2 },

  scroll:          { flex: 1 },

  errorBanner:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#DC2626', marginHorizontal: 16, marginTop: 10, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  errorBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#991B1B' },
  errorRetryBtn:   { backgroundColor: '#DC2626', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  errorRetryText:  { color: '#fff', fontSize: 12, fontWeight: '700' },

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

  scheduleHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginTop: 22, marginBottom: 12, gap: 8 },
  scheduleTitle:   { fontSize: 17, fontWeight: '800', color: '#111827', flex: 1 },
  calBtn:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calBtnIcon:      { fontSize: 13 },
  calendarViewBtn: { fontSize: 13, color: '#7C3AED', fontWeight: '700' },
  emptySchedule:   { alignItems: 'center', paddingVertical: 52, paddingHorizontal: 32 },
  emptyScheduleIcon:  { fontSize: 52, marginBottom: 14 },
  emptyScheduleTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptyScheduleText:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  bottomPad:       { height: 32 },

  // ── Hero (video-player style) ────────────────────────
  heroCard:        { marginHorizontal: 16, marginTop: 14, borderRadius: 18, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, aspectRatio: 16/10 },
  heroBg:          { flex: 1, backgroundColor: '#1E1B4B', padding: 14, justifyContent: 'space-between' },
  heroTopRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  livePill:        { backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  livePillText:    { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  upcomingPill:    { backgroundColor: '#7C3AED', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  upcomingPillText:{ color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  watcherPill:     { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  watcherPillText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroCenter:      { alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: 8 },
  heroTitleBig:    { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', lineHeight: 28 },
  heroSubBig:      { color: '#C4B5FD', fontSize: 13, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  heroControls:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  heroControlsLeft:{ flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroControlsRight:{ flexDirection: 'row', alignItems: 'center', gap: 14 },
  ctrlIcon:        { fontSize: 16, color: '#fff' },
  heroLiveDotRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLiveDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  heroLiveDotText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  heroEmpty:       { backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  heroEmptyIcon:   { fontSize: 40, marginBottom: 10 },
  heroEmptyTitle:  { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  heroEmptySub:    { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 24 },

  // ── Rich Upcoming-Class Card ─────────────────────────
  classCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, gap: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  dayChip:         { width: 50, alignItems: 'center', justifyContent: 'center' },
  dayChipName:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  dayChipDate:     { fontSize: 22, fontWeight: '900', marginTop: 1, lineHeight: 26 },
  dayChipMonth:    { fontSize: 11, fontWeight: '700' },
  subjectIconBox:  { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  subjectIconText: { fontSize: 18, fontWeight: '900' },
  classMeta:       { flex: 1, gap: 3 },
  classTitle:      { fontSize: 14, fontWeight: '800', color: '#111827' },
  classProf:       { fontSize: 11, color: '#6B7280' },
  categoryTag:     { alignSelf: 'flex-start', backgroundColor: '#EDE9FE', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2, marginTop: 3 },
  categoryTagText: { fontSize: 9, fontWeight: '700', color: '#7C3AED' },
  classRight:      { alignItems: 'flex-end', gap: 2, minWidth: 80 },
  timeRow:         { flexDirection: 'row', alignItems: 'center', gap: 3 },
  timeIcon:        { fontSize: 11 },
  timeText:        { fontSize: 12, fontWeight: '700', color: '#111827' },
  durationText:    { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  remindBtn:       { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  remindBell:      { fontSize: 12 },
  remindText:      { fontSize: 10, fontWeight: '700' },
});

export default LiveSessionScreen;
