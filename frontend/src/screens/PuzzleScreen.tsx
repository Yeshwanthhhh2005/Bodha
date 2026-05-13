import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { puzzleAPI } from '../services/api';

interface TodayPuzzle {
  _id: string; title: string; hint?: string;
  releaseDate: string; pointsAwarded: number;
  maxAttempts: number; myAttempts: number; isSolved: boolean;
}
interface HistoryItem {
  _id: string; title: string; releaseDate: string;
  isSolved: boolean; pointsEarned: number;
}
interface Progress { totalSolved: number; currentStreak: number; totalPoints: number; }
interface LeaderEntry { rank: number; name: string; points: number; isMe: boolean; }
interface Props { navigation: any }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PuzzleScreen({ navigation }: Props) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday]           = useState<TodayPuzzle | null>(null);
  const [history, setHistory]       = useState<HistoryItem[]>([]);
  const [progress, setProgress]     = useState<Progress>({ totalSolved: 0, currentStreak: 0, totalPoints: 0 });
  const [leaders, setLeaders]       = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank]         = useState(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tR, hR, pR, lR] = await Promise.allSettled([
        puzzleAPI.getToday(), puzzleAPI.getHistory(),
        puzzleAPI.getMyProgress(), puzzleAPI.getLeaderboard(),
      ]);
      if (tR.status === 'fulfilled') setToday((tR.value as any)?.data ?? (tR.value as any));
      if (hR.status === 'fulfilled') setHistory((hR.value as any)?.data ?? (hR.value as any) ?? []);
      if (pR.status === 'fulfilled') setProgress((pR.value as any)?.data ?? (pR.value as any) ?? progress);
      if (lR.status === 'fulfilled') {
        const d = (lR.value as any)?.data ?? (lR.value as any);
        setLeaders(d?.leaderboard ?? []);
        setMyRank(d?.myRank ?? 0);
      }
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Puzzle</Text>
        <View style={s.streakPill}>
          <MaterialCommunityIcons name="fire" size={15} color="#F97316" />
          <Text style={s.streakNum}>{progress.currentStreak}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#7C3AED" />}
      >
        {/* ── Hero Banner ───────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroContent}>
            <View style={s.heroPill}><Text style={s.heroPillText}>Mind Twister</Text></View>
            <Text style={s.heroH1}>One Brain Teaser</Text>
            <Text style={s.heroH1Accent}>Every Day!</Text>
            <Text style={s.heroSub}>Challenge your mind. Sharpen your{'\n'}thinking. Stay ahead!</Text>
          </View>
          <View style={s.heroIllustration}>
            {/* Glowing brain/bulb illustration */}
            <View style={s.heroGlow}>
              <Ionicons name="bulb" size={64} color="#C4B5FD" />
            </View>
            <View style={[s.heroSparkle, { top: 6,  right: 8  }]}><Text style={s.sparkleText}>✦</Text></View>
            <View style={[s.heroSparkle, { top: 40, right: -4 }]}><Text style={[s.sparkleText, { fontSize: 8 }]}>✦</Text></View>
            <View style={[s.heroSparkle, { bottom: 12, left: 4 }]}><Text style={[s.sparkleText, { fontSize: 9 }]}>✦</Text></View>
          </View>
        </View>

        {/* ── Today's Mind Twister ──────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
              <Text style={s.cardHeading}>Today's Mind Twister</Text>
            </View>
            <Text style={s.cardDate}>{fmtShort(new Date().toISOString())}</Text>
          </View>

          {today ? (
            <>
              <View style={s.questionRow}>
                <Text style={s.questionPreview} numberOfLines={2}>{today.title}</Text>
                <Text style={s.giftEmoji}>🎁</Text>
              </View>
              <TouchableOpacity
                style={[s.solveBtn, today.isSolved && s.solveBtnDone]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MindTwisterRoot', { puzzleId: today._id })}
              >
                <Text style={s.solveBtnText}>{today.isSolved ? '✓ Already Solved' : 'Solve Now'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.noToday}>
              <Text style={s.noTodayText}>No puzzle scheduled for today</Text>
            </View>
          )}
        </View>

        {/* ── Your Progress ─────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardRow}>
            <Text style={s.cardHeading}>Your Progress</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={s.viewStats}>View Stats</Text>
              <Ionicons name="chevron-forward" size={12} color="#7C3AED" />
            </TouchableOpacity>
          </View>
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <View style={[s.statIconBox, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="radio-button-on-outline" size={22} color="#7C3AED" />
              </View>
              <Text style={s.statBigNum}>{progress.totalSolved}</Text>
              <Text style={s.statBoxLabel}>Solved</Text>
            </View>
            <View style={s.statBox}>
              <View style={[s.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="fire" size={22} color="#F97316" />
              </View>
              <Text style={s.statBigNum}>{progress.currentStreak}</Text>
              <Text style={s.statBoxLabel}>Day Streak</Text>
            </View>
            <View style={s.statBox}>
              <View style={[s.statIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="trophy-outline" size={22} color="#F59E0B" />
              </View>
              <Text style={s.statBigNum}>{progress.totalPoints}</Text>
              <Text style={s.statBoxLabel}>Total Points</Text>
            </View>
          </View>
        </View>

        {/* ── Past Mind Twisters ────────────────────────────── */}
        {history.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardHeading}>Past Mind Twisters</Text>
            {history.slice(0, 5).map((h, i) => (
              <TouchableOpacity
                key={h._id}
                style={[s.histItem, i === history.slice(0, 5).length - 1 && { borderBottomWidth: 0 }]}
                activeOpacity={0.8}
                onPress={() => h.isSolved && navigation.navigate('MindTwisterRoot', { puzzleId: h._id })}
              >
                {/* Status icon */}
                <View style={[s.histStatus, { backgroundColor: h.isSolved ? '#DCFCE7' : '#F3F4F6' }]}>
                  <Ionicons
                    name={h.isSolved ? 'checkmark-circle' : 'lock-closed-outline'}
                    size={20}
                    color={h.isSolved ? '#059669' : '#9CA3AF'}
                  />
                </View>
                {/* Text */}
                <View style={{ flex: 1 }}>
                  <Text style={s.histDate}>{fmtShort(h.releaseDate)}</Text>
                  <Text style={s.histQ} numberOfLines={2}>
                    {h.isSolved ? h.title : '??????'}
                  </Text>
                </View>
                {/* Right */}
                {h.isSolved ? (
                  <>
                    <Text style={s.histPts}>+{h.pointsEarned}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </>
                ) : (
                  <Ionicons name="lock-closed-outline" size={16} color="#D1D5DB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Keep the Streak Alive ─────────────────────────── */}
        <View style={s.streakBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.streakBannerTitle}>Keep the Streak Alive! 🔥</Text>
            <Text style={s.streakBannerSub}>
              Solve tomorrow's Mind Twister{'\n'}and keep your streak going.
            </Text>
          </View>
          <View style={s.calIcon}>
            <MaterialCommunityIcons name="calendar-check" size={48} color="#A78BFA" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  streakPill:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  streakNum:   { fontSize: 14, fontWeight: '800', color: '#92400E' },

  /* Hero */
  hero: {
    marginHorizontal: 16, marginBottom: 16, borderRadius: 20, padding: 22,
    backgroundColor: '#1E1B4B', flexDirection: 'row', alignItems: 'center', overflow: 'hidden',
  },
  heroContent:    { flex: 1 },
  heroPill:       { alignSelf: 'flex-start', backgroundColor: '#4C1D95', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12 },
  heroPillText:   { fontSize: 13, fontWeight: '700', color: '#C4B5FD' },
  heroH1:         { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 28 },
  heroH1Accent:   { fontSize: 22, fontWeight: '900', color: '#A78BFA', lineHeight: 30, marginBottom: 10 },
  heroSub:        { fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
  heroIllustration:{ width: 90, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  heroGlow:       { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroSparkle:    { position: 'absolute' },
  sparkleText:    { fontSize: 12, color: '#C4B5FD', fontWeight: '900' },

  /* Cards */
  card: {
    marginHorizontal: 16, marginBottom: 14, backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  cardRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardHeading: { fontSize: 15, fontWeight: '800', color: '#111827' },
  cardDate:    { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  viewStats:   { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

  /* Today */
  questionRow:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  questionPreview:{ flex: 1, fontSize: 15, fontWeight: '600', color: '#374151', lineHeight: 22 },
  giftEmoji:    { fontSize: 32, marginTop: -4 },
  solveBtn:     { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  solveBtnDone: { backgroundColor: '#059669' },
  solveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  noToday:      { paddingVertical: 20, alignItems: 'center' },
  noTodayText:  { fontSize: 13, color: '#9CA3AF' },

  /* Stats */
  statsRow:    { flexDirection: 'row', gap: 10 },
  statBox:     { flex: 1, alignItems: 'center', gap: 6 },
  statIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statBigNum:  { fontSize: 22, fontWeight: '900', color: '#111827' },
  statBoxLabel:{ fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  /* History */
  histItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB',
  },
  histStatus: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  histDate:   { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  histQ:      { fontSize: 13, fontWeight: '700', color: '#111827', lineHeight: 18 },
  histPts:    { fontSize: 13, fontWeight: '800', color: '#059669', marginRight: 2 },

  /* Streak Banner */
  streakBanner: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 18, padding: 22,
    backgroundColor: '#3730A3', flexDirection: 'row', alignItems: 'center',
  },
  streakBannerTitle:{ fontSize: 17, fontWeight: '900', color: '#fff', marginBottom: 6 },
  streakBannerSub:  { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  calIcon:          { marginLeft: 8 },
});
