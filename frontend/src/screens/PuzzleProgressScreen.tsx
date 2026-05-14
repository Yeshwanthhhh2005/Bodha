import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { puzzleAPI } from '../services/api';

interface Progress {
  totalSolved:    number;
  totalPoints:    number;
  currentStreak:  number;
  longestStreak:  number;
  lastSolvedDate: string | null;
}
interface HistoryItem {
  _id: string; title: string; releaseDate: string;
  isSolved: boolean; pointsEarned: number;
}
interface LeaderEntry { rank: number; name: string; points: number; isMe: boolean; }
interface Props { navigation: any }

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function PuzzleProgressScreen({ navigation }: Props) {
  const [loading, setLoading]   = useState(true);
  const [progress, setProgress] = useState<Progress>({ totalSolved: 0, totalPoints: 0, currentStreak: 0, longestStreak: 0, lastSolvedDate: null });
  const [history, setHistory]   = useState<HistoryItem[]>([]);
  const [myRank, setMyRank]     = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const [pR, hR, lR] = await Promise.allSettled([
          puzzleAPI.getMyProgress(),
          puzzleAPI.getHistory(),
          puzzleAPI.getLeaderboard(),
        ]);
        if (pR.status === 'fulfilled') {
          const d = (pR.value as any)?.data ?? (pR.value as any);
          if (d) setProgress(d);
        }
        if (hR.status === 'fulfilled') {
          setHistory((hR.value as any)?.data ?? (hR.value as any) ?? []);
        }
        if (lR.status === 'fulfilled') {
          const d = (lR.value as any)?.data ?? (lR.value as any);
          setMyRank(d?.myRank ?? 0);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
    </SafeAreaView>
  );

  const solvedCount = history.filter(h => h.isSolved).length;
  const totalHist   = history.length;
  const accuracy    = totalHist > 0 ? Math.round((solvedCount / totalHist) * 100) : 0;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Your Progress</Text>
        <View style={s.streakPill}>
          <MaterialCommunityIcons name="fire" size={13} color="#F97316" />
          <Text style={s.streakNum}>{progress.currentStreak}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Hero stats banner ────────────────────────────── */}
        <View style={s.hero}>
          <View style={s.heroPill}><Text style={s.heroPillTxt}>Lifetime Stats</Text></View>
          <Text style={s.heroBigNum}>{progress.totalPoints}</Text>
          <Text style={s.heroSub}>Total Points Earned</Text>
          {myRank > 0 && (
            <View style={s.rankRow}>
              <Ionicons name="trophy" size={14} color="#FBBF24" />
              <Text style={s.rankTxt}>Ranked #{myRank} this month</Text>
            </View>
          )}
        </View>

        {/* ── Stats grid (2x2) ─────────────────────────────── */}
        <View style={s.grid}>
          <View style={[s.gridCell, { backgroundColor: '#fff' }]}>
            <View style={[s.gridIcon, { backgroundColor: '#EDE9FE' }]}>
              <MaterialCommunityIcons name="target" size={22} color="#7C3AED" />
            </View>
            <Text style={s.gridBigNum}>{progress.totalSolved}</Text>
            <Text style={s.gridLbl}>Puzzles Solved</Text>
          </View>

          <View style={[s.gridCell, { backgroundColor: '#fff' }]}>
            <View style={[s.gridIcon, { backgroundColor: '#FFEDD5' }]}>
              <MaterialCommunityIcons name="fire" size={22} color="#F97316" />
            </View>
            <Text style={s.gridBigNum}>{progress.currentStreak}</Text>
            <Text style={s.gridLbl}>Current Streak</Text>
          </View>

          <View style={[s.gridCell, { backgroundColor: '#fff' }]}>
            <View style={[s.gridIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="medal" size={22} color="#F59E0B" />
            </View>
            <Text style={s.gridBigNum}>{progress.longestStreak}</Text>
            <Text style={s.gridLbl}>Longest Streak</Text>
          </View>

          <View style={[s.gridCell, { backgroundColor: '#fff' }]}>
            <View style={[s.gridIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="trending-up" size={22} color="#059669" />
            </View>
            <Text style={s.gridBigNum}>{accuracy}%</Text>
            <Text style={s.gridLbl}>Solve Rate</Text>
          </View>
        </View>

        {/* ── Recent activity ──────────────────────────────── */}
        <View style={s.card}>
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Recent Activity</Text>
            <Text style={s.cardSub}>Last {Math.min(7, history.length)} puzzles</Text>
          </View>

          {history.slice(0, 7).map((h, i, arr) => (
            <View key={h._id} style={[s.actRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={[s.actDot, { backgroundColor: h.isSolved ? '#D1FAE5' : '#FEE2E2' }]}>
                <Ionicons name={h.isSolved ? 'checkmark' : 'close'} size={15} color={h.isSolved ? '#059669' : '#DC2626'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actDate}>{fmtDate(h.releaseDate)}</Text>
                <Text style={s.actTxt} numberOfLines={1}>{h.title}</Text>
              </View>
              {h.isSolved
                ? <Text style={s.actPts}>+{h.pointsEarned}</Text>
                : <Text style={s.actMissed}>Missed</Text>}
            </View>
          ))}

          {history.length === 0 && (
            <View style={s.empty}>
              <Text style={s.emptyTxt}>No puzzle attempts yet</Text>
              <Text style={s.emptySub}>Solve today's Mind Twister to start your streak</Text>
            </View>
          )}
        </View>

        {/* ── Achievements row ─────────────────────────────── */}
        <View style={s.card}>
          <Text style={[s.cardTitle, { marginBottom: 14 }]}>Achievements</Text>
          <View style={s.badgesRow}>
            <Badge unlocked={progress.totalSolved >= 1}   iconLib="mci" iconName="target"          color="#7C3AED" label="First Solve" />
            <Badge unlocked={progress.currentStreak >= 3} iconLib="mci" iconName="fire"            color="#F97316" label="3-Day Streak" />
            <Badge unlocked={progress.currentStreak >= 7} iconLib="mci" iconName="lightning-bolt"  color="#F59E0B" label="Week Warrior" />
            <Badge unlocked={progress.totalPoints  >= 100} iconLib="mci" iconName="diamond-stone"  color="#3B82F6" label="100 Pts" />
          </View>
        </View>

        {/* ── Last solved date ─────────────────────────────── */}
        {progress.lastSolvedDate && (
          <View style={s.lastSolvedCard}>
            <Ionicons name="time-outline" size={20} color="#7C3AED" />
            <View style={{ flex: 1 }}>
              <Text style={s.lastSolvedTitle}>Last solved</Text>
              <Text style={s.lastSolvedDate}>{fmtDate(progress.lastSolvedDate)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

interface BadgeProps {
  unlocked: boolean;
  iconLib: 'ion' | 'mci';
  iconName: string;
  color: string;
  label: string;
}

function Badge({ unlocked, iconLib, iconName, color, label }: BadgeProps) {
  const tone = unlocked ? color : '#D1D5DB';
  return (
    <View style={[bs.box, !unlocked && bs.boxOff]}>
      <View style={[bs.iconCircle, { backgroundColor: unlocked ? `${color}22` : '#F3F4F6' }]}>
        {iconLib === 'ion'
          ? <Ionicons name={iconName as any} size={22} color={tone} />
          : <MaterialCommunityIcons name={iconName as any} size={22} color={tone} />}
      </View>
      <Text style={[bs.lbl, { color: tone }]}>{label}</Text>
    </View>
  );
}

const bs = StyleSheet.create({
  box:        { flex: 1, alignItems: 'center', gap: 8, padding: 10, backgroundColor: '#F5F3FF', borderRadius: 12 },
  boxOff:     { backgroundColor: '#F9FAFB' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  lbl:        { fontSize: 10, fontWeight: '700', textAlign: 'center' },
});

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:     { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111827', marginRight: 36 },
  streakPill:  { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  streakNum:   { fontSize: 12, fontWeight: '800', color: '#92400E' },

  /* Hero */
  hero: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 14,
    backgroundColor: '#13091F', borderRadius: 18, padding: 24, alignItems: 'center',
  },
  heroPill:    { backgroundColor: '#6D28D9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 12 },
  heroPillTxt: { fontSize: 11, fontWeight: '800', color: '#fff' },
  heroBigNum:  { fontSize: 48, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroSub:     { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  rankRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: 'rgba(167,139,250,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  rankTxt:     { fontSize: 12, fontWeight: '700', color: '#C4B5FD' },

  /* Grid */
  grid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  gridCell: {
    width: '48%', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  gridIcon:   { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  gridBigNum: { fontSize: 24, fontWeight: '900', color: '#111827' },
  gridLbl:    { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 2 },

  /* Card */
  card: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  cardTitle:{ fontSize: 15, fontWeight: '800', color: '#111827' },
  cardSub:  { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },

  /* Recent activity */
  actRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actDot:   { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actDate:  { fontSize: 10, color: '#9CA3AF', fontWeight: '600', marginBottom: 1 },
  actTxt:   { fontSize: 12, fontWeight: '700', color: '#111827' },
  actPts:   { fontSize: 12, fontWeight: '800', color: '#7C3AED' },
  actMissed:{ fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  empty:    { paddingVertical: 24, alignItems: 'center' },
  emptyTxt: { fontSize: 13, fontWeight: '700', color: '#6B7280' },
  emptySub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

  /* Badges */
  badgesRow:{ flexDirection: 'row', gap: 8 },

  /* Last solved card */
  lastSolvedCard: {
    marginHorizontal: 16, marginBottom: 4,
    backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  lastSolvedTitle:{ fontSize: 11, fontWeight: '700', color: '#7C3AED' },
  lastSolvedDate: { fontSize: 14, fontWeight: '800', color: '#4C1D95', marginTop: 2 },
});
