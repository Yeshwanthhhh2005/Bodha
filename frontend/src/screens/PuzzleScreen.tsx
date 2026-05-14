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
interface Props { navigation: any }

function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PuzzleScreen({ navigation }: Props) {
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [today, setToday]           = useState<TodayPuzzle | null>(null);
  const [history, setHistory]       = useState<HistoryItem[]>([]);
  const [progress, setProgress]     = useState<Progress>({ totalSolved: 0, currentStreak: 0, totalPoints: 0 });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tR, hR, pR] = await Promise.allSettled([
        puzzleAPI.getToday(), puzzleAPI.getHistory(), puzzleAPI.getMyProgress(),
      ]);
      if (tR.status === 'fulfilled') setToday((tR.value as any)?.data ?? (tR.value as any));
      if (hR.status === 'fulfilled') setHistory((hR.value as any)?.data ?? (hR.value as any) ?? []);
      if (pR.status === 'fulfilled') {
        const p = (pR.value as any)?.data ?? (pR.value as any);
        if (p) setProgress(p);
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
        <View style={{ width: 60 }} />
        <Text style={s.headerTitle}>Puzzle</Text>
        <View style={s.streakPill}>
          <MaterialCommunityIcons name="fire" size={14} color="#F97316" />
          <Text style={s.streakNum}>{progress.currentStreak || 12}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#7C3AED" />}
      >
        {/* ── HERO ─────────────────────────────────────────── */}
        <View style={s.hero}>
          <View style={{ flex: 1, zIndex: 2 }}>
            <View style={s.heroPill}>
              <Text style={s.heroPillText}>Mind Twister</Text>
            </View>
            <Text style={s.heroH1}>One Brain Teaser</Text>
            <Text style={s.heroH1Accent}>Every Day!</Text>
            <Text style={s.heroSub}>Challenge your mind. Sharpen your{'\n'}thinking. Stay ahead!</Text>
          </View>

          {/* Glowing brain-bulb illustration */}
          <View style={s.heroArt}>
            <View style={s.heroGlowOuter} />
            <View style={s.heroGlowInner}>
              <MaterialCommunityIcons name="lightbulb-on" size={68} color="#A78BFA" />
            </View>
            <Text style={[s.spark, { top: 4,  right: -2, fontSize: 16 }]}>✦</Text>
            <Text style={[s.spark, { top: 32, right: 78, fontSize: 10 }]}>✦</Text>
            <Text style={[s.spark, { bottom: 8, right: 4, fontSize: 12 }]}>✦</Text>
            <Text style={[s.spark, { top: 56, right: -6, fontSize: 9 }]}>✦</Text>
          </View>
        </View>

        {/* ── Today's Mind Twister ─────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="calendar" size={16} color="#7C3AED" />
              <Text style={s.cardTitle}>Today's Mind Twister</Text>
            </View>
            <Text style={s.cardDate}>{fmtShort(new Date().toISOString())}</Text>
          </View>

          {today ? (
            <>
              <View style={s.qBox}>
                <Text style={s.qBoxText} numberOfLines={2}>{today.title}</Text>
                <View style={s.giftBox}>
                  <MaterialCommunityIcons name="gift" size={28} color="#7C3AED" />
                </View>
              </View>
              <TouchableOpacity
                style={[s.solveBtn, today.isSolved && s.solveBtnDone]}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('MindTwisterRoot', { puzzleId: today._id })}
              >
                <Text style={s.solveBtnTxt}>{today.isSolved ? '✓ Already Solved' : 'Solve Now'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>No puzzle scheduled for today</Text>
            </View>
          )}
        </View>

        {/* ── Your Progress ────────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Your Progress</Text>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
              activeOpacity={0.7}
              onPress={() => (navigation.getParent?.()?.navigate?.('PuzzleProgressRoot')) ?? navigation.navigate('PuzzleProgressRoot')}
            >
              <Text style={s.viewStats}>View Stats</Text>
              <Ionicons name="chevron-forward" size={12} color="#7C3AED" />
            </TouchableOpacity>
          </View>
          <View style={s.statRow}>
            <View style={s.statCol}>
              <View style={[s.statIcon, { backgroundColor: '#EDE9FE' }]}>
                <MaterialCommunityIcons name="target" size={20} color="#7C3AED" />
              </View>
              <Text style={s.statNum}>{progress.totalSolved}</Text>
              <Text style={s.statLbl}>Solved</Text>
            </View>
            <View style={s.statCol}>
              <View style={[s.statIcon, { backgroundColor: '#FFEDD5' }]}>
                <MaterialCommunityIcons name="fire" size={20} color="#F97316" />
              </View>
              <Text style={s.statNum}>{progress.currentStreak}</Text>
              <Text style={s.statLbl}>Day Streak</Text>
            </View>
            <View style={s.statCol}>
              <View style={[s.statIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="trophy" size={20} color="#F59E0B" />
              </View>
              <Text style={s.statNum}>{progress.totalPoints}</Text>
              <Text style={s.statLbl}>Total Points</Text>
            </View>
          </View>
        </View>

        {/* ── Past Mind Twisters ───────────────────────────── */}
        {history.length > 0 && (
          <View style={s.card}>
            <Text style={[s.cardTitle, { marginBottom: 6 }]}>Past Mind Twisters</Text>
            {history.slice(0, 5).map((h, i, arr) => (
              <TouchableOpacity
                key={h._id}
                style={[s.histItem, i === arr.length - 1 && { borderBottomWidth: 0 }]}
                activeOpacity={0.7}
                onPress={() => h.isSolved && navigation.navigate('MindTwisterRoot', { puzzleId: h._id })}
              >
                <View style={[s.histDot, { backgroundColor: h.isSolved ? '#D1FAE5' : '#F3F4F6' }]}>
                  <Ionicons
                    name={h.isSolved ? 'checkmark' : 'lock-closed'}
                    size={16}
                    color={h.isSolved ? '#059669' : '#9CA3AF'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.histDate}>{fmtShort(h.releaseDate)}</Text>
                  <Text style={s.histTxt} numberOfLines={2}>
                    {h.isSolved ? h.title : '??????'}
                  </Text>
                </View>
                {h.isSolved ? (
                  <>
                    <Text style={s.histPts}>+{h.pointsEarned}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#D1D5DB" />
                  </>
                ) : (
                  <Ionicons name="lock-closed" size={14} color="#D1D5DB" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Keep the Streak Alive ────────────────────────── */}
        <View style={s.streakBanner}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <Text style={s.streakTitle}>Keep the Streak Alive!</Text>
              <MaterialCommunityIcons name="fire" size={18} color="#F97316" />
            </View>
            <Text style={s.streakSub}>
              Solve tomorrow's Mind Twister{'\n'}and keep your streak going.
            </Text>
          </View>
          <View style={s.streakIconWrap}>
            <MaterialCommunityIcons name="calendar-check" size={40} color="#A78BFA" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  streakPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, width: 60, justifyContent: 'center' },
  streakNum:   { fontSize: 13, fontWeight: '800', color: '#92400E' },

  /* Hero */
  hero: {
    marginHorizontal: 16, marginTop: 4, marginBottom: 14,
    borderRadius: 18, padding: 22,
    backgroundColor: '#13091F',
    flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
  },
  heroPill:     { alignSelf: 'flex-start', backgroundColor: '#6D28D9', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  heroPillText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  heroH1:       { fontSize: 22, fontWeight: '900', color: '#fff', lineHeight: 28 },
  heroH1Accent: { fontSize: 24, fontWeight: '900', color: '#A78BFA', lineHeight: 30, marginBottom: 10 },
  heroSub:      { fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 17 },
  heroArt:      { width: 100, height: 110, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  heroGlowOuter:{ position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(167,139,250,0.08)' },
  heroGlowInner:{ width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(124,58,237,0.18)', alignItems: 'center', justifyContent: 'center' },
  spark:        { position: 'absolute', color: '#C4B5FD', fontWeight: '900' },

  /* Cards */
  card: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardHead:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  cardDate:  { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  viewStats: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

  /* Today's question */
  qBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F5F3FF', borderRadius: 12,
    padding: 14, marginBottom: 14,
  },
  qBoxText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#374151', lineHeight: 20 },
  giftBox:  { width: 48, height: 48, borderRadius: 12, backgroundColor: '#FDE68A', alignItems: 'center', justifyContent: 'center' },

  solveBtn:    { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  solveBtnDone:{ backgroundColor: '#059669' },
  solveBtnTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },
  empty:       { padding: 16, alignItems: 'center' },
  emptyTxt:    { fontSize: 13, color: '#9CA3AF' },

  /* Stats */
  statRow:  { flexDirection: 'row', gap: 8 },
  statCol:  { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  statIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statNum:  { fontSize: 22, fontWeight: '900', color: '#111827' },
  statLbl:  { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },

  /* History */
  histItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  histDot:  { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  histDate: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 2 },
  histTxt:  { fontSize: 12, fontWeight: '700', color: '#111827', lineHeight: 17 },
  histPts:  { fontSize: 13, fontWeight: '800', color: '#7C3AED', marginRight: 2 },

  /* Streak Banner */
  streakBanner: {
    marginHorizontal: 16, marginTop: 4, padding: 22, borderRadius: 18,
    backgroundColor: '#4338CA', flexDirection: 'row', alignItems: 'center',
    overflow: 'hidden',
  },
  streakTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
  streakSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 17 },
  streakIconWrap:{ width: 64, height: 64, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
});
