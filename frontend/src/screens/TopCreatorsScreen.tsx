import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { shortsAPI } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Creator {
  _id: string;
  name: string;
  handle: string;
  followers: number;
  avatarColor: string;
  initials: string;
  following?: boolean;
}

interface Props { navigation: any }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function TopCreatorsScreen({ navigation }: Props) {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res: any = await shortsAPI.topCreators().catch(() => null);
      const list: Creator[] = Array.isArray(res) ? res : (res?.data ?? []);
      setCreators(list);
    } catch {
      setCreators([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleFollow = (id: string) => {
    setCreators((prev) => prev.map((c) => {
      if (c._id !== id) return c;
      const next = !c.following;
      (next ? shortsAPI.follow(id) : shortsAPI.unfollow(id)).catch(() => {});
      return { ...c, following: next, followers: c.followers + (next ? 1 : -1) };
    }));
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Top Student Creators</Text>
          <Text style={s.headerSub}>Top creators of the week</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#7C3AED" />}
        >
          {/* Hero banner */}
          <View style={s.banner}>
            <View style={{ flex: 1 }}>
              <Text style={s.bannerTitle}>Amazing creators.{'\n'}Great content.</Text>
              <Text style={s.bannerSub}>Learn from the best{'\n'}student creators.</Text>
            </View>
            <View style={s.bannerTrophy}>
              <Ionicons name="trophy" size={72} color="#FBBF24" />
            </View>
          </View>

          {/* List */}
          {creators.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="people-outline" size={48} color="#D1D5DB" />
              <Text style={s.emptyTitle}>No creators yet</Text>
              <Text style={s.emptySub}>Top creators show up here once approved student uploads start collecting likes.</Text>
            </View>
          ) : (
            <>
              {creators.map((c, i) => (
                <View key={c._id} style={s.row}>
                  <Text style={s.rank}>{i + 1}</Text>
                  <View style={[s.avatar, { backgroundColor: c.avatarColor }]}>
                    <Text style={s.avatarText}>{c.initials}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{c.name}</Text>
                    <Text style={s.handle}>{c.handle}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                    <Text style={s.followers}>{fmtCount(c.followers)}</Text>
                    <Text style={s.followersLabel}>Followers</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.followBtn, c.following && s.followingBtn]}
                    onPress={() => toggleFollow(c._id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.followBtnText, c.following && { color: '#7C3AED' }]}>
                      {c.following ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={s.fullLbBtn} activeOpacity={0.85}>
                <Text style={s.fullLbText}>View Full Leaderboard</Text>
                <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:     { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#6B7280', marginTop: 1 },

  banner: {
    backgroundColor: '#5B21B6', borderRadius: 18, padding: 20,
    flexDirection: 'row', alignItems: 'center', marginBottom: 18,
    shadowColor: '#5B21B6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  bannerTitle:  { color: '#fff', fontSize: 18, fontWeight: '800', lineHeight: 24 },
  bannerSub:    { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 10, lineHeight: 17 },
  bannerTrophy: { width: 90, height: 90, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  rank:     { fontSize: 13, fontWeight: '800', color: '#9CA3AF', width: 18, textAlign: 'center' },
  avatar:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  name:     { fontSize: 13, fontWeight: '800', color: '#111827' },
  handle:   { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  followers:{ fontSize: 13, fontWeight: '800', color: '#111827' },
  followersLabel: { fontSize: 10, color: '#9CA3AF' },
  followBtn:    { paddingHorizontal: 16, paddingVertical: 7, backgroundColor: '#7C3AED', borderRadius: 8 },
  followingBtn: { backgroundColor: '#EDE9FE' },
  followBtnText:{ fontSize: 11, fontWeight: '800', color: '#fff' },

  fullLbBtn: { marginTop: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  fullLbText:{ fontSize: 13, fontWeight: '700', color: '#7C3AED' },

  empty:      { alignItems: 'center', padding: 40 },
  emptyTitle: { marginTop: 12, fontSize: 14, fontWeight: '700', color: '#374151' },
  emptySub:   { marginTop: 6, fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 17 },
});
