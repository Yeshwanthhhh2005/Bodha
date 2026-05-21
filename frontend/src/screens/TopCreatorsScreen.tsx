import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { shortsAPI } from '../services/api';

interface Props { navigation: any; }

interface ApiCreator {
  _id: string;
  name: string;
  email?: string;
  totalViews: number;
  followers: number;
  shorts: number;
  color: string;
}

const PURPLE = '#6C3CE1';

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function buildHandle(name: string): string {
  return '@' + name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export default function TopCreatorsScreen({ navigation }: Props) {
  const [creators, setCreators] = useState<ApiCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data: any = await shortsAPI.topCreators(30);
      setCreators(Array.isArray(data) ? data : (data?.data ?? []));
    } catch {
      setCreators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8FF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Top Student Creators</Text>
          <Text style={s.headerSub}>Top creators of the week</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero banner */}
        <View style={s.banner}>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle}>Amazing creators.</Text>
            <Text style={s.bannerTitle}>Great content.</Text>
            <Text style={s.bannerSub}>Learn from the best</Text>
            <Text style={s.bannerSub}>student creators.</Text>
          </View>
          <View style={s.bannerIcon}>
            <MaterialCommunityIcons name="trophy-award" size={70} color="#FFD700" />
          </View>
        </View>

        {/* Creators list */}
        {loading ? (
          <View style={s.centered}><ActivityIndicator color={PURPLE} /></View>
        ) : creators.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons name="trophy-outline" size={42} color="#D1D5DB" />
            <Text style={s.emptyTitle}>No creators yet</Text>
            <Text style={s.emptySub}>
              Once students upload approved shorts, top creators will appear here ranked by views.
            </Text>
          </View>
        ) : (
          <View style={s.list}>
            {creators.map((c, i) => (
              <View key={c._id} style={s.creatorRow}>
                <Text style={s.rankNum}>{i + 1}</Text>
                <View style={[s.avatar, { backgroundColor: c.color || '#7C3AED' }]}>
                  <Text style={s.avatarText}>{c.name[0]}</Text>
                </View>
                <View style={s.creatorInfo}>
                  <Text style={s.creatorName}>{c.name}</Text>
                  <Text style={s.creatorHandle}>{buildHandle(c.name)}</Text>
                </View>
                <View style={s.followers}>
                  <Text style={s.followersNum}>{formatCount(c.followers)}</Text>
                  <Text style={s.followersLabel}>Followers</Text>
                </View>
                <TouchableOpacity style={s.followBtn} activeOpacity={0.85}>
                  <Text style={s.followBtnText}>Follow</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* View full leaderboard */}
        {creators.length > 0 && (
          <TouchableOpacity style={s.viewFull} activeOpacity={0.85}>
            <Text style={s.viewFullText}>View Full Leaderboard</Text>
            <Ionicons name="chevron-forward" size={16} color={PURPLE} />
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F8FF' },
  scroll: { paddingBottom: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  backBtn:     { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e' },
  headerSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  banner: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 18, padding: 22,
    backgroundColor: PURPLE,
    flexDirection: 'row', alignItems: 'center',
    minHeight: 160,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  bannerTitle: { fontSize: 19, fontWeight: '800', color: '#fff', lineHeight: 24 },
  bannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 16 },
  bannerIcon:  { marginLeft: 12 },

  centered: { paddingVertical: 40, alignItems: 'center' },

  list: { marginTop: 22, marginHorizontal: 16, gap: 12 },
  creatorRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    gap: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  rankNum: { fontSize: 14, fontWeight: '800', color: '#9CA3AF', width: 16, textAlign: 'center' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:    { color: '#fff', fontSize: 18, fontWeight: '700' },
  creatorInfo:   { flex: 1 },
  creatorName:   { fontSize: 13, fontWeight: '800', color: '#1a1a2e' },
  creatorHandle: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  followers:     { alignItems: 'flex-end' },
  followersNum:  { fontSize: 13, fontWeight: '800', color: '#1a1a2e' },
  followersLabel:{ fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  followBtn: {
    backgroundColor: PURPLE, borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 7,
  },
  followBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyWrap:  { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24, marginTop: 14 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#374151', marginTop: 12 },
  emptySub:   { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 18 },

  viewFull: {
    marginTop: 18, marginHorizontal: 16,
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderColor: '#F3F4F6',
  },
  viewFullText: { color: PURPLE, fontSize: 14, fontWeight: '700' },
});
