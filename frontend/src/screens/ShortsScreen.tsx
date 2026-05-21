import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shortsAPI } from '../services/api';

interface Props { navigation: any; }

interface ApiShort {
  _id: string;
  title: string;
  topic: string;
  creator?: { _id: string; name: string; role: string };
  creatorType: 'trainer' | 'student';
  views: number;
  likes: number;
  bgTop: string;
  bgBot: string;
}

interface ApiCreator {
  _id: string;
  name: string;
  followers: number;
  shorts: number;
  color: string;
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function buildOverlay(title: string): string {
  const words = title.split(' ');
  if (words.length <= 2) return title;
  const mid = Math.ceil(words.length / 2);
  return words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
}

export default function ShortsScreen({ navigation }: Props) {
  const [activeSection, setActiveSection] = useState<'trainer' | 'student'>('trainer');
  const [trending, setTrending] = useState<ApiShort[]>([]);
  const [creators, setCreators] = useState<ApiCreator[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [t, c]: any[] = await Promise.all([
        shortsAPI.trending(10),
        shortsAPI.topCreators(10),
      ]);
      setTrending(Array.isArray(t) ? t : (t?.data ?? []));
      setCreators(Array.isArray(c) ? c : (c?.data ?? []));
    } catch {
      // Backend may not be seeded yet — keep mock fallback empty
      setTrending([]);
      setCreators([]);
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
        <TouchableOpacity style={s.backBtn} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="arrow-back" size={22} color="#1a1a2e" />
        </TouchableOpacity>

        <View style={s.headerCenter}>
          <View style={s.logoCircle}>
            <Ionicons name="play" size={9} color="#fff" style={{ marginLeft: 1 }} />
            <Text style={s.logoLabel}>30s</Text>
          </View>
          <View>
            <Text style={s.headerTitle}>30 Sec Shorts</Text>
            <Text style={s.headerSub}>Learn fast. Share smart.</Text>
          </View>
        </View>

        <View style={s.headerRight}>
          <TouchableOpacity style={s.headerIconBtn}>
            <Ionicons name="search-outline" size={20} color="#374151" />
          </TouchableOpacity>
          <View style={s.userAvatar}><Text style={s.userAvatarText}>Y</Text></View>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Section toggle */}
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleCard, activeSection === 'trainer' && s.toggleCardPurple]}
            onPress={() => { setActiveSection('trainer'); navigation.navigate('TrainerShorts'); }}
            activeOpacity={0.8}
          >
            <View style={[s.toggleIcon, { backgroundColor: '#EDE7F6' }]}>
              <Ionicons name="school" size={18} color="#6C3CE1" />
            </View>
            <View style={s.toggleTextWrap}>
              <Text style={[s.toggleTitle, { color: '#6C3CE1' }]}>Trainer Shorts</Text>
              <Text style={s.toggleSub}>By BodhaSoft</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.toggleCard, activeSection === 'student' && s.toggleCardGreen]}
            onPress={() => { setActiveSection('student'); navigation.navigate('StudentShorts'); }}
            activeOpacity={0.8}
          >
            <View style={[s.toggleIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="people" size={18} color="#00C853" />
            </View>
            <View style={s.toggleTextWrap}>
              <Text style={[s.toggleTitle, { color: '#00C853' }]}>Student Shorts</Text>
              <Text style={s.toggleSub}>By Students</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={s.toggleHint}>Choose a section to explore</Text>

        {/* Trending This Week */}
        <View style={s.sectionRow}>
          <View style={s.sectionLeft}>
            <Text style={s.sectionTitle}>Trending This Week</Text>
            <Text style={s.sectionEmoji}>🔥</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('TrainerShorts')}>
            <Text style={s.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.hList}
        >
          {(trending.length ? trending : []).slice(0, 10).map((v) => (
            <TouchableOpacity
              key={v._id}
              style={s.videoCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ShortsFeed', { shortId: v._id })}
            >
              <View style={[s.videoBg, { backgroundColor: v.bgTop }]}>
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: v.bgBot, opacity: 0.55, top: '45%' }]} />
                <Text style={s.videoOverlay}>{buildOverlay(v.title)}</Text>
                <View style={s.videoFooter}>
                  <View style={s.playCircle}>
                    <Ionicons name="play" size={11} color="#fff" style={{ marginLeft: 1 }} />
                  </View>
                  <Text style={s.videoDur}>00:30</Text>
                </View>
              </View>
              <Text style={s.videoTitle} numberOfLines={1}>{v.title}</Text>
              <View style={s.videoMetaRow}>
                <Text style={s.videoCreator}>{v.creator?.name ?? 'Unknown'}</Text>
                {v.creatorType === 'trainer' && (
                  <Ionicons name="checkmark-circle" size={12} color="#6C3CE1" />
                )}
              </View>
              <View style={s.videoStats}>
                <Ionicons name="eye-outline" size={11} color="#9CA3AF" />
                <Text style={s.videoStat}>{formatCount(v.views)}</Text>
                <Ionicons name="heart-outline" size={11} color="#9CA3AF" />
                <Text style={s.videoStat}>{formatCount(v.likes)}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {trending.length === 0 && (
            <View style={s.emptyHList}>
              <Text style={s.emptyText}>No trending shorts yet</Text>
            </View>
          )}
        </ScrollView>

        {/* Top Student Creators */}
        <View style={s.sectionRow}>
          <View style={s.sectionLeft}>
            <Text style={s.sectionTitle}>Top Student Creators</Text>
            <Text style={s.sectionEmoji}>🎉</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('TopCreators')}>
            <Text style={s.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.hList}
        >
          {creators.map((c, i) => (
            <View key={c._id} style={s.creatorCard}>
              <View style={s.rankBadge}><Text style={s.rankText}>{i + 1}</Text></View>
              <View style={[s.creatorAvatar, { backgroundColor: c.color || '#7C3AED' }]}>
                <Text style={s.creatorInitial}>{c.name?.[0] ?? '?'}</Text>
              </View>
              <Text style={s.creatorName}>{c.name}</Text>
              <Text style={s.creatorFollowers}>{formatCount(c.followers)} Followers</Text>
              <TouchableOpacity style={s.followBtn} activeOpacity={0.8}>
                <Text style={s.followBtnText}>Follow</Text>
              </TouchableOpacity>
            </View>
          ))}
          {creators.length === 0 && (
            <View style={s.emptyHList}>
              <Text style={s.emptyText}>No creators yet</Text>
            </View>
          )}
        </ScrollView>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const PURPLE = '#6C3CE1';

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F8FF' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  backBtn:       { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoCircle: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#00C853',
    alignItems: 'center', justifyContent: 'center',
  },
  logoLabel:     { color: '#fff', fontSize: 8, fontWeight: '800', marginTop: 1 },
  headerTitle:   { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  headerSub:     { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerRight:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerIconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  notifBadge: {
    position: 'absolute', top: 3, right: 3,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
  },
  notifBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  userAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  userAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  toggleRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  toggleCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
    borderRadius: 14, paddingHorizontal: 11, paddingVertical: 16,
    minHeight: 76,
  },
  toggleCardPurple: { borderColor: PURPLE, backgroundColor: '#FAFAFE' },
  toggleCardGreen:  { borderColor: '#00C853', backgroundColor: '#FAFFFD' },
  toggleIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleTextWrap: { flex: 1, minWidth: 0 },
  toggleTitle:  { fontSize: 13, fontWeight: '800' },
  toggleSub:    { fontSize: 11, color: '#9CA3AF', marginTop: 3 },
  toggleHint:   { textAlign: 'center', fontSize: 12, color: '#9e9e9e', marginBottom: 14 },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 12, marginTop: 4,
  },
  sectionLeft:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  sectionEmoji: { fontSize: 16 },
  viewAll:      { fontSize: 13, color: PURPLE, fontWeight: '600' },

  hList: { paddingHorizontal: 16, paddingBottom: 6, gap: 10 },

  videoCard: { width: 120 },
  videoBg: {
    width: 120, height: 140, borderRadius: 10,
    overflow: 'hidden', padding: 10, justifyContent: 'space-between', marginBottom: 7,
  },
  videoOverlay: { color: '#fff', fontSize: 13, fontWeight: '800', lineHeight: 18 },
  videoFooter:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playCircle: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 1.5, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  videoDur:     { color: '#fff', fontSize: 10, fontWeight: '600' },
  videoTitle:   { fontSize: 12, fontWeight: '700', color: '#1a1a2e', marginBottom: 3 },
  videoMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  videoCreator: { fontSize: 11, color: PURPLE, fontWeight: '600' },
  videoStats:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  videoStat:    { fontSize: 10, color: '#9CA3AF', marginRight: 3 },

  creatorCard: {
    width: 100, backgroundColor: '#fff', borderRadius: 12,
    padding: 10, paddingTop: 14, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  rankBadge: {
    position: 'absolute', top: 8, left: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FFD700',
    alignItems: 'center', justifyContent: 'center',
  },
  rankText:          { fontSize: 11, fontWeight: '800', color: '#78350F' },
  creatorAvatar: {
    width: 55, height: 55, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  creatorInitial:    { color: '#fff', fontSize: 22, fontWeight: '700' },
  creatorName:       { fontSize: 13, fontWeight: '700', color: '#1a1a2e', textAlign: 'center' },
  creatorFollowers:  { fontSize: 11, color: '#9CA3AF', marginTop: 2, textAlign: 'center' },
  followBtn: {
    backgroundColor: PURPLE, borderRadius: 20,
    paddingVertical: 6, width: '100%',
    alignItems: 'center', marginTop: 9,
  },
  followBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyHList: { paddingVertical: 30, alignItems: 'center', width: 280 },
  emptyText:  { fontSize: 12, color: '#9CA3AF' },
});
