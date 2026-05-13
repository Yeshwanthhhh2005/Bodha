import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { puzzleAPI } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TodayPuzzle {
  _id: string;
  title: string;
  hint?: string;
  releaseDate: string;
  pointsAwarded: number;
  maxAttempts: number;
  myAttempts: number;
  isSolved: boolean;
}
interface HistoryItem {
  _id: string;
  title: string;
  releaseDate: string;
  isSolved: boolean;
  pointsEarned: number;
}
interface Progress {
  totalSolved: number;
  currentStreak: number;
  totalPoints: number;
}
interface LeaderEntry {
  rank: number;
  name: string;
  points: number;
  solved: number;
  isMe: boolean;
}

interface Props { navigation: any }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PuzzleScreen({ navigation }: Props) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday]           = useState<TodayPuzzle | null>(null);
  const [history, setHistory]       = useState<HistoryItem[]>([]);
  const [progress, setProgress]     = useState<Progress>({ totalSolved: 0, currentStreak: 0, totalPoints: 0 });
  const [leaders, setLeaders]       = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank]         = useState<number>(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [todayRes, histRes, progRes, lbRes] = await Promise.allSettled([
        puzzleAPI.getToday(),
        puzzleAPI.getHistory(),
        puzzleAPI.getMyProgress(),
        puzzleAPI.getLeaderboard(),
      ]);
      if (todayRes.status === 'fulfilled') setToday((todayRes.value as any)?.data ?? (todayRes.value as any));
      if (histRes.status === 'fulfilled')  setHistory((histRes.value as any)?.data ?? (histRes.value as any) ?? []);
      if (progRes.status === 'fulfilled')  setProgress((progRes.value as any)?.data ?? (progRes.value as any) ?? progress);
      if (lbRes.status === 'fulfilled') {
        const d = (lbRes.value as any)?.data ?? (lbRes.value as any);
        setLeaders(d?.leaderboard ?? []);
        setMyRank(d?.myRank ?? 0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Puzzle</Text>
        <View style={s.streakBadge}>
          <MaterialCommunityIcons name="fire" size={14} color="#F97316" />
          <Text style={s.streakText}>{progress.currentStreak}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#7C3AED" />}
      >
        {/* ── Hero Banner ────────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroLeft}>
            <View style={s.heroBadge}><Text style={s.heroBadgeText}>Mind Twister</Text></View>
            <Text style={s.heroTitle}>One Brain Teaser{'\n'}<Text style={s.heroAccent}>Every Day!</Text></Text>
            <Text style={s.heroSub}>Challenge your mind. Sharpen your thinking. Stay ahead!</Text>
          </View>
          <View style={s.heroRight}>
            <View style={s.heroIconWrap}>
              <Ionicons name="bulb" size={54} color="#A78BFA" />
            </View>
          </View>
        </View>

        {/* ── Today's Mind Twister ────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
              <Text style={s.sectionTitle}>Today's Mind Twister</Text>
            </View>
            <Text style={s.sectionDate}>{fmtDate(new Date().toISOString())}</Text>
          </View>

          {today ? (
            <View style={s.todayCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.todayQuestion} numberOfLines={2}>{today.title}</Text>
              </View>
              <View style={s.todayGift}>
                <Ionicons name="gift" size={36} color="#F59E0B" />
              </View>
              <TouchableOpacity
                style={[s.solveBtn, today.isSolved && s.solveBtnDone]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MindTwisterRoot', { puzzleId: today._id })}
                disabled={today.isSolved}
              >
                <Text style={s.solveBtnText}>
                  {today.isSolved ? '✓ Solved!' : 'Solve Now'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.noToday}>
              <Ionicons name="calendar-outline" size={32} color="#D1D5DB" />
              <Text style={s.noTodayText}>No puzzle today yet</Text>
            </View>
          )}
        </View>

        {/* ── Progress ────────────────────────────────────── */}
        <View style={s.section}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>Your Progress</Text>
            <TouchableOpacity>
              <Text style={s.viewStats}>View Stats <Ionicons name="chevron-forward" size={11} color="#7C3AED" /></Text>
            </TouchableOpacity>
          </View>
          <View style={s.statsRow}>
            <View style={s.statCell}>
              <View style={[s.statIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#7C3AED" />
              </View>
              <Text style={s.statVal}>{progress.totalSolved}</Text>
              <Text style={s.statLbl}>Solved</Text>
            </View>
            <View style={s.statCell}>
              <View style={[s.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <MaterialCommunityIcons name="fire" size={20} color="#F97316" />
              </View>
              <Text style={s.statVal}>{progress.currentStreak}</Text>
              <Text style={s.statLbl}>Day Streak</Text>
            </View>
            <View style={s.statCell}>
              <View style={[s.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
              </View>
              <Text style={s.statVal}>{progress.totalPoints}</Text>
              <Text style={s.statLbl}>Total Points</Text>
            </View>
          </View>
        </View>

        {/* ── Past Mind Twisters ───────────────────────────── */}
        {history.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Past Mind Twisters</Text>
            <View style={{ gap: 2, marginTop: 8 }}>
              {history.slice(0, 5).map((h) => (
                <TouchableOpacity
                  key={h._id}
                  style={s.histRow}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('MindTwisterRoot', { puzzleId: h._id })}
                >
                  <View style={[s.histIcon, { backgroundColor: h.isSolved ? '#DCFCE7' : '#F3F4F6' }]}>
                    <Ionicons
                      name={h.isSolved ? 'checkmark-circle' : 'lock-closed-outline'}
                      size={18}
                      color={h.isSolved ? '#059669' : '#9CA3AF'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.histDate}>{fmtDate(h.releaseDate)}</Text>
                    <Text style={s.histQ} numberOfLines={1}>{h.isSolved ? h.title : '??????'}</Text>
                  </View>
                  {h.isSolved ? (
                    <Text style={s.histPts}>+{h.pointsEarned}</Text>
                  ) : (
                    <Ionicons name="lock-closed-outline" size={16} color="#D1D5DB" />
                  )}
                  {h.isSolved && <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Leaderboard ─────────────────────────────────── */}
        {leaders.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trophy" size={14} color="#F59E0B" />
                <Text style={s.sectionTitle}>Top Solvers</Text>
              </View>
              <Text style={s.viewStats}>This Month</Text>
            </View>
            {leaders.slice(0, 3).map((l) => (
              <View key={l.rank} style={[s.lbRow, l.isMe && s.lbRowMe]}>
                <Text style={[s.lbRank, l.rank <= 3 && s.lbRankTop]}>{l.rank}</Text>
                <View style={s.lbAvatar}>
                  <Text style={s.lbAvatarText}>{l.name[0]}</Text>
                </View>
                <Text style={[s.lbName, l.isMe && { color: '#7C3AED', fontWeight: '800' }]}>
                  {l.isMe ? 'You' : l.name}
                </Text>
                <Text style={s.lbPts}>{l.points} Pts</Text>
              </View>
            ))}
            {myRank > 3 && (
              <View style={[s.lbRow, s.lbRowMe]}>
                <Text style={s.lbRank}>{myRank}</Text>
                <View style={[s.lbAvatar, { backgroundColor: '#7C3AED' }]}>
                  <Text style={s.lbAvatarText}>Y</Text>
                </View>
                <Text style={[s.lbName, { color: '#7C3AED', fontWeight: '800' }]}>You</Text>
                <Text style={s.lbPts}>{progress.totalPoints} Pts</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Streak Banner ───────────────────────────────── */}
        <View style={s.streakBanner}>
          <View style={{ flex: 1 }}>
            <Text style={s.streakBannerTitle}>Keep the Streak Alive! 🔥</Text>
            <Text style={s.streakBannerSub}>Solve tomorrow's Mind Twister{'\n'}and keep your streak going.</Text>
          </View>
          <View style={s.streakBannerIcon}>
            <MaterialCommunityIcons name="calendar-check" size={40} color="#A78BFA" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1E1B4B' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  streakText:  { fontSize: 13, fontWeight: '800', color: '#92400E' },

  // Hero
  hero: {
    margin: 16, borderRadius: 20, padding: 20,
    backgroundColor: '#1E1B4B',
    flexDirection: 'row', alignItems: 'center',
  },
  heroLeft:      { flex: 1, paddingRight: 12 },
  heroBadge:     { alignSelf: 'flex-start', backgroundColor: '#4C1D95', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10 },
  heroBadgeText: { fontSize: 12, fontWeight: '700', color: '#C4B5FD' },
  heroTitle:     { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 28 },
  heroAccent:    { color: '#A78BFA' },
  heroSub:       { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 10, lineHeight: 17 },
  heroRight:     { },
  heroIconWrap:  { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Sections
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1E1B4B' },
  sectionDate:  { fontSize: 12, color: '#9CA3AF' },
  viewStats:    { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

  // Today card
  todayCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, flexDirection: 'column', borderWidth: 1, borderColor: '#EDE9FE' },
  todayQuestion: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  todayGift:  { alignSelf: 'flex-end', marginBottom: 12, marginTop: -20 },
  solveBtn:   { backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  solveBtnDone: { backgroundColor: '#059669' },
  solveBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  noToday:    { alignItems: 'center', padding: 24, backgroundColor: '#fff', borderRadius: 14 },
  noTodayText:{ fontSize: 13, color: '#9CA3AF', marginTop: 8 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10 },
  statCell: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EDE9FE' },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statVal:  { fontSize: 20, fontWeight: '900', color: '#1E1B4B' },
  statLbl:  { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginTop: 2 },

  // History
  histRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  histIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  histDate: { fontSize: 10, color: '#9CA3AF', fontWeight: '600' },
  histQ:    { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 2 },
  histPts:  { fontSize: 13, fontWeight: '800', color: '#059669' },

  // Leaderboard
  lbRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  lbRowMe:    { backgroundColor: '#F5F3FF', borderRadius: 10, paddingHorizontal: 8 },
  lbRank:     { fontSize: 13, fontWeight: '800', color: '#9CA3AF', width: 20 },
  lbRankTop:  { color: '#F59E0B' },
  lbAvatar:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  lbAvatarText: { fontSize: 13, fontWeight: '800', color: '#7C3AED' },
  lbName:     { flex: 1, fontSize: 13, fontWeight: '700', color: '#111827' },
  lbPts:      { fontSize: 13, fontWeight: '800', color: '#7C3AED' },

  // Streak banner
  streakBanner: {
    marginHorizontal: 16, borderRadius: 18, padding: 20, marginBottom: 8,
    backgroundColor: '#4C1D95', flexDirection: 'row', alignItems: 'center',
  },
  streakBannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 6 },
  streakBannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 17 },
  streakBannerIcon:  { marginLeft: 12 },
});
