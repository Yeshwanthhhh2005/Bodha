import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { leaderboardAPI } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';

interface Team {
  _id: string;
  name: string;
  icon: string;
  color: string;
  points: number;
  rank: number;
  memberCount: number;
}

interface Challenge {
  _id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface LeaderboardData {
  challenge: Challenge | null;
  totalTeams: number;
  teams: Team[];
}

interface Props {
  navigation?: { goBack?: () => void; navigate?: (s: string) => void };
}

const fmtDate = (iso?: string): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const fmtRange = (s?: string, e?: string): string => {
  if (!s || !e) return '';
  const yr = new Date(e).getFullYear();
  return `${fmtDate(s)} – ${fmtDate(e)}, ${yr}`;
};
const fmtPts = (n: number): string => n.toLocaleString('en-US');

const RANK_BADGE: Record<number, { bg: string; tint: string; ring: string }> = {
  1: { bg: '#FBBF24', tint: '#FEF3C7', ring: '#F59E0B' },
  2: { bg: '#60A5FA', tint: '#DBEAFE', ring: '#3B82F6' },
  3: { bg: '#FB923C', tint: '#FFEDD5', ring: '#F97316' },
};

export default function LeaderboardScreen({ navigation }: Props): React.ReactElement {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debug, setDebug] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const res: any = await leaderboardAPI.get();
      const payload = res?.data || res;
      setData(payload);
      const ch = payload?.challenge?.name || 'none';
      const tc = Array.isArray(payload?.teams) ? payload.teams.length : 0;
      setDebug(`OK • challenge: ${ch} • teams: ${tc}`);
    } catch (e: any) {
      setData({ challenge: null, totalTeams: 0, teams: [] });
      const msg = e?.message || e?.error || JSON.stringify(e).slice(0, 120);
      setDebug(`FAIL • ${msg}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let active = true;
    const setup = async () => {
      const sock = await connectSocket();
      if (!active) return;
      const handler = () => load();
      sock.on('leaderboard:updated', handler);
      sock.on('challenges:updated', handler);
    };
    setup();
    return () => {
      active = false;
      const s = getSocket();
      s?.off('leaderboard:updated');
      s?.off('challenges:updated');
    };
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={s.loadingSafe}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </SafeAreaView>
    );
  }

  const teams = data?.teams || [];
  const top3 = teams.slice(0, 3);
  const rest = teams.slice(3);
  const rank1 = top3.find((t) => t.rank === 1);
  const rank2 = top3.find((t) => t.rank === 2);
  const rank3 = top3.find((t) => t.rank === 3);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#7C3AED" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Leadership Board</Text>
          <Text style={s.headerSub}>Compete. Earn Points. Climb Higher!</Text>
        </View>
        <TouchableOpacity style={s.filterBtn}>
          <Ionicons name="filter" size={22} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 10 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#7C3AED" />}
      >
        {/* ── Current Challenge Banner ── */}
        {data?.challenge ? (
          <View style={s.banner}>
            <View style={s.bannerLeft}>
              <View style={s.bannerPill}>
                <Ionicons name="trophy" size={11} color="#FBBF24" style={{ marginRight: 5 }} />
                <Text style={s.bannerPillText}>Current Challenge</Text>
              </View>
              <Text style={s.bannerTitle}>{data.challenge.name}</Text>
              <Text style={s.bannerDate}>{fmtRange(data.challenge.startDate, data.challenge.endDate)}</Text>
              <Text style={s.bannerDesc}>
                {data.challenge.description || 'Complete tasks, earn points and lead your team to victory!'}
              </Text>
              <View style={s.bannerStat}>
                <Ionicons name="star" size={18} color="#FBBF24" />
                <View>
                  <Text style={s.bannerStatLabel}>Total Teams</Text>
                  <Text style={s.bannerStatValue}>{data.totalTeams}</Text>
                </View>
              </View>
            </View>
            <View style={s.bannerRight}>
              <Ionicons name="trophy" size={88} color="#FBBF24" />
            </View>
          </View>
        ) : (
          <View style={[s.banner, { paddingVertical: 28 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>No Active Challenge</Text>
              <Text style={s.bannerDate}>Check back soon!</Text>
            </View>
          </View>
        )}

        {/* ── Top 3 Podium ── */}
        {top3.length > 0 && (
          <View style={s.podium}>
            {/* Rank 2 */}
            <View style={[s.podiumCard, s.podiumSide, { backgroundColor: '#EFF6FF' }]}>
              <View style={[s.rankBadge, { backgroundColor: RANK_BADGE[2].bg }]}>
                <Text style={s.rankBadgeText}>2</Text>
              </View>
              {rank2 ? (
                <>
                  <View style={[s.podiumIcon, { backgroundColor: rank2.color || '#7C3AED' }]}>
                    <Text style={s.podiumIconText}>{rank2.icon || '⚡'}</Text>
                  </View>
                  <Text style={s.podiumName} numberOfLines={1}>{rank2.name}</Text>
                  <Text style={[s.podiumPts, { color: '#3B82F6' }]}>
                    {fmtPts(rank2.points)} <Text style={s.ptsLabel}>PTS</Text>
                  </Text>
                </>
              ) : <View style={s.emptySlot} />}
            </View>

            {/* Rank 1 (elevated, gold) */}
            <View style={[s.podiumCard, s.podiumCenter, { backgroundColor: '#FEF3C7' }]}>
              <View style={[s.rankBadge, s.rankBadge1, { backgroundColor: RANK_BADGE[1].bg }]}>
                <Text style={s.rankBadgeText}>1</Text>
              </View>
              {rank1 ? (
                <>
                  <View style={s.laurelRow}>
                    <MaterialCommunityIcons name="leaf" size={26} color="#A16207" />
                    <View style={[s.podiumIconLarge, { backgroundColor: rank1.color || '#7C3AED' }]}>
                      <Text style={s.podiumIconLargeText}>{rank1.icon || '🚀'}</Text>
                    </View>
                    <MaterialCommunityIcons name="leaf" size={26} color="#A16207" style={{ transform: [{ scaleX: -1 }] }} />
                  </View>
                  <Text style={s.podiumNameLarge} numberOfLines={1}>{rank1.name}</Text>
                  <Text style={[s.podiumPtsLarge, { color: '#7C3AED' }]}>
                    {fmtPts(rank1.points)} <Text style={s.ptsLabel}>PTS</Text>
                  </Text>
                  <View style={s.podiumPedestal} />
                </>
              ) : <View style={s.emptySlot} />}
            </View>

            {/* Rank 3 */}
            <View style={[s.podiumCard, s.podiumSide, { backgroundColor: '#FFF7ED' }]}>
              <View style={[s.rankBadge, { backgroundColor: RANK_BADGE[3].bg }]}>
                <Text style={s.rankBadgeText}>3</Text>
              </View>
              {rank3 ? (
                <>
                  <View style={[s.podiumIcon, { backgroundColor: rank3.color || '#F97316' }]}>
                    <Text style={s.podiumIconText}>{rank3.icon || '⚡'}</Text>
                  </View>
                  <Text style={s.podiumName} numberOfLines={1}>{rank3.name}</Text>
                  <Text style={[s.podiumPts, { color: '#F97316' }]}>
                    {fmtPts(rank3.points)} <Text style={s.ptsLabel}>PTS</Text>
                  </Text>
                </>
              ) : <View style={s.emptySlot} />}
            </View>
          </View>
        )}

        {/* ── List Header + Rows ── */}
        {rest.length > 0 && (
          <View style={s.listCard}>
            <View style={s.listHeader}>
              <Text style={[s.listHeaderText, { width: 50 }]}>RANK</Text>
              <Text style={[s.listHeaderText, { flex: 1, marginLeft: 16 }]}>TEAM</Text>
              <Text style={[s.listHeaderText, { textAlign: 'right' }]}>POINTS</Text>
            </View>
            {rest.map((t, idx) => (
              <View key={t._id} style={[s.row, idx === rest.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={s.rowRank}>{t.rank}</Text>
                <View style={[s.rowIcon, { backgroundColor: (t.color || '#7C3AED') + '22' }]}>
                  <Text style={[s.rowIconText, { color: t.color || '#7C3AED' }]}>{t.icon || '⚡'}</Text>
                </View>
                <Text style={s.rowName} numberOfLines={1}>{t.name}</Text>
                <Text style={s.rowPts}>{fmtPts(t.points)} <Text style={s.rowPtsLabel}>PTS</Text></Text>
              </View>
            ))}
          </View>
        )}

        {teams.length === 0 && (
          <View style={s.emptyState}>
            <Ionicons name="trophy-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
            <Text style={s.emptyTitle}>No teams yet</Text>
            <Text style={s.emptySub}>Once teams are added, rankings will appear here.</Text>
          </View>
        )}

        {/* ── Footer Card ── */}
        <View style={s.footerCard}>
          <View style={s.footerIconWrap}>
            <MaterialCommunityIcons name="target" size={28} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.footerTitle}>Keep Climbing!</Text>
            <Text style={s.footerSub}>More challenges coming your way. Stay focused and earn more points!</Text>
          </View>
          <TouchableOpacity style={s.footerBtn} onPress={() => navigation?.navigate?.('Challenges')}>
            <Text style={s.footerBtnText}>View Challenges</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#F9FAFB' },
  loadingSafe: { flex: 1, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },

  // Header
  header:        { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn:       { width: 40, alignItems: 'flex-start', padding: 4 },
  backIcon:      { fontSize: 26, color: '#7C3AED', fontWeight: '600' },
  headerCenter:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 18, fontWeight: '800', color: '#111827', textAlign: 'center' },
  headerSub:     { fontSize: 12, color: '#6B7280', marginTop: 3, textAlign: 'center' },
  filterBtn:     { width: 40, alignItems: 'flex-end', padding: 4 },
  filterIcon:    { fontSize: 22, color: '#7C3AED', fontWeight: '700' },

  // Banner
  banner:        {
    flexDirection: 'row', marginHorizontal: 16, borderRadius: 18,
    backgroundColor: '#4338CA', padding: 18, overflow: 'hidden',
    shadowColor: '#4338CA', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  bannerLeft:    { flex: 1 },
  bannerRight:   { width: 110, alignItems: 'center', justifyContent: 'center' },
  bannerPill:    { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginBottom: 10 },
  bannerPillIcon:{ fontSize: 11, marginRight: 5 },
  bannerPillText:{ color: '#FBBF24', fontSize: 11, fontWeight: '700' },
  bannerTitle:   { color: '#fff', fontSize: 19, fontWeight: '800', marginBottom: 6 },
  bannerDate:    { color: '#FBBF24', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  bannerDesc:    { color: '#E0E7FF', fontSize: 12, lineHeight: 17, marginBottom: 12 },
  bannerStat:    { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 8 },
  bannerStatStar:{ fontSize: 18 },
  bannerStatLabel:{ color: '#E0E7FF', fontSize: 10, fontWeight: '600' },
  bannerStatValue:{ color: '#fff', fontSize: 16, fontWeight: '800' },
  trophy:        { fontSize: 88 },

  // Podium
  podium:        { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 18, gap: 8 },
  podiumCard:    { flex: 1, borderRadius: 14, alignItems: 'center', paddingTop: 24, paddingBottom: 14, paddingHorizontal: 8, position: 'relative' },
  podiumSide:    { paddingTop: 28 },
  podiumCenter:  { paddingTop: 32, paddingBottom: 6, transform: [{ translateY: -8 }] },
  rankBadge:     { position: 'absolute', top: -14, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', zIndex: 2 },
  rankBadge1:    { width: 36, height: 36, borderRadius: 18, top: -16 },
  rankBadgeText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  podiumIcon:    { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  podiumIconText:{ fontSize: 22 },
  podiumIconLarge:{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  podiumIconLargeText:{ fontSize: 26 },
  laurelRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  laurel:        { fontSize: 26 },
  podiumName:    { fontSize: 13, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  podiumNameLarge:{ fontSize: 15, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 4 },
  podiumPts:     { fontSize: 14, fontWeight: '800' },
  podiumPtsLarge:{ fontSize: 16, fontWeight: '800' },
  ptsLabel:      { fontSize: 9, fontWeight: '700', color: '#9CA3AF' },
  podiumPedestal:{ position: 'absolute', bottom: -10, left: 4, right: 4, height: 14, backgroundColor: '#F59E0B', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  emptySlot:     { height: 70 },

  // List
  listCard:      { marginHorizontal: 16, marginTop: 24, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#F3F4F6' },
  listHeader:    { flexDirection: 'row', paddingVertical: 10, alignItems: 'center' },
  listHeaderText:{ fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  rowRank:       { width: 50, fontSize: 14, fontWeight: '700', color: '#374151' },
  rowIcon:       { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowIconText:   { fontSize: 16 },
  rowName:       { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  rowPts:        { fontSize: 14, fontWeight: '800', color: '#111827' },
  rowPtsLabel:   { fontSize: 9, fontWeight: '700', color: '#9CA3AF' },

  // Empty
  emptyState:    { alignItems: 'center', padding: 40 },
  emptyEmoji:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySub:      { fontSize: 13, color: '#6B7280', marginTop: 4 },

  // Footer
  footerCard:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: '#F5F3FF', gap: 10 },
  footerIconWrap:{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  footerIcon:    { fontSize: 26 },
  footerTitle:   { fontSize: 14, fontWeight: '800', color: '#111827' },
  footerSub:     { fontSize: 11, color: '#6B7280', marginTop: 2 },
  footerBtn:     { backgroundColor: '#7C3AED', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  footerBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Debug banner
  debugBanner: { backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A', paddingHorizontal: 12, paddingVertical: 6 },
  debugText:   { fontSize: 11, color: '#92400E', fontFamily: 'monospace' },
});
