import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { shortsAPI } from '../services/api';
import { resolveMediaUrl } from '../utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShortVideo {
  _id: string;
  title: string;
  thumbnailColor?: string;     // visual fallback when no thumbnail
  videoUrl?: string;           // server path
  durationLabel?: string;      // e.g. "00:30"
  creatorName: string;
  creatorRole: 'trainer' | 'student';
  views: number;
  likes: number;
}

interface Creator {
  _id: string;
  name: string;
  handle: string;
  followers: number;
  avatarColor: string;
  initials: string;
}

interface Props { navigation: any }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ShortsScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trending, setTrending] = useState<ShortVideo[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [trendRes, creatorsRes] = await Promise.all([
        shortsAPI.trending().catch(() => null) as any,
        shortsAPI.topCreators().catch(() => null) as any,
      ]);
      const trendList:   ShortVideo[] = Array.isArray(trendRes)    ? trendRes    : (trendRes?.data    ?? []);
      const creatorList: Creator[]    = Array.isArray(creatorsRes) ? creatorsRes : (creatorsRes?.data ?? []);
      // Honest: empty backend → empty UI. No mock fallback.
      setTrending(trendList);
      setCreators(creatorList);
    } catch {
      setTrending([]);
      setCreators([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ──────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.iconBtn}
          activeOpacity={0.7}
          onPress={() => (navigation.getParent?.()?.goBack?.() ?? navigation.goBack?.())}
        >
          <Ionicons name="close" size={20} color="#374151" />
        </TouchableOpacity>
        <View style={s.logoBox}>
          <Ionicons name="play-circle" size={22} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>30 Sec Shorts</Text>
          <Text style={s.headerSub}>Learn fast. Share smart.</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="search" size={18} color="#374151" />
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={18} color="#374151" />
          <View style={s.bellDot}><Text style={s.bellDotText}>3</Text></View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(true); }} tintColor="#7C3AED" />
        }
      >
        {/* ── Section Picker (Trainer / Student) ─────── */}
        <View style={s.pickerRow}>
          <TouchableOpacity
            style={s.pickerCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ShortsFeed', { section: 'trainer' })}
          >
            <View style={[s.pickerIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="school" size={22} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pickerTitle}>Trainer Shorts</Text>
              <Text style={s.pickerSub}>By BodhaSoft</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.pickerCard}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ShortsFeed', { section: 'student' })}
          >
            <View style={[s.pickerIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="people" size={22} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.pickerTitle}>Student Shorts</Text>
              <Text style={s.pickerSub}>By Students</Text>
            </View>
          </TouchableOpacity>
        </View>
        <Text style={s.pickerHint}>Choose a section to explore</Text>

        {/* ── Empty-state hint (only when nothing exists anywhere) ─── */}
        {trending.length === 0 && creators.length === 0 && (
          <View style={s.emptyHint}>
            <MaterialCommunityIcons name="video-off-outline" size={36} color="#C4B5FD" />
            <Text style={s.emptyHintTitle}>No shorts yet</Text>
            <Text style={s.emptyHintSub}>
              Be the first to share a 30-second clip — tap{' '}
              <Text style={{ fontWeight: '800', color: '#7C3AED' }}>Upload Short</Text> below.
            </Text>
          </View>
        )}

        {/* ── Trending This Week ─────────────────────── */}
        {trending.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <Text style={s.sectionTitle}>Trending This Week</Text>
                <MaterialCommunityIcons name="fire" size={16} color="#F97316" />
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('ShortsFeed', { section: 'trainer' })}>
                <Text style={s.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.trendRow}>
              {trending.map((v) => (
                <TouchableOpacity
                  key={v._id}
                  style={s.trendCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('ShortsPlayer', { shortId: v._id, section: v.creatorRole })}
                >
                  <View style={[s.trendThumb, { backgroundColor: v.thumbnailColor ?? '#4C1D95' }]}>
                    {v.videoUrl ? (
                      <Video
                        source={{ uri: resolveMediaUrl(v.videoUrl) }}
                        style={s.trendThumbVideo}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={false}
                        isMuted
                      />
                    ) : (
                      <Text style={s.trendTitleOverlay}>{v.title}</Text>
                    )}
                    <View style={s.trendPlay}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                    <View style={s.trendDuration}><Text style={s.trendDurationText}>{v.durationLabel ?? '00:30'}</Text></View>
                  </View>
                  <Text style={s.trendCardTitle} numberOfLines={1}>{v.title.replace('\n', ' ')}</Text>
                  <View style={s.trendMetaRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Text style={s.trendCreator} numberOfLines={1}>{v.creatorName}</Text>
                      {v.creatorRole === 'trainer' && <MaterialCommunityIcons name="check-decagram" size={12} color="#3B82F6" />}
                    </View>
                  </View>
                  <View style={s.trendStatsRow}>
                    <View style={s.trendStatChip}>
                      <Ionicons name="eye-outline" size={11} color="#6B7280" />
                      <Text style={s.trendStat}>{fmtCount(v.views)}</Text>
                    </View>
                    <View style={s.trendStatChip}>
                      <Ionicons name="heart" size={11} color="#EF4444" />
                      <Text style={s.trendStatHeart}>{fmtCount(v.likes)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Top Student Creators ─────────────────── */}
        {creators.length > 0 && (
          <>
            <View style={s.sectionHead}>
              <View style={s.sectionTitleRow}>
                <Text style={s.sectionTitle}>Top Student Creators</Text>
                <MaterialCommunityIcons name="crown" size={16} color="#FBBF24" />
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('TopCreators')}>
                <Text style={s.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.creatorsRow}>
              {creators.map((c, i) => (
                <View key={c._id} style={s.creatorCard}>
                  <View style={s.creatorRankBox}>
                    <Text style={s.creatorRankText}>{i + 1}</Text>
                  </View>
                  <View style={[s.creatorAvatar, { backgroundColor: c.avatarColor }]}>
                    <Text style={s.creatorInitials}>{c.initials}</Text>
                  </View>
                  <Text style={s.creatorName} numberOfLines={1}>{c.name}</Text>
                  <Text style={s.creatorFollowers}>{fmtCount(c.followers)} Followers</Text>
                  <TouchableOpacity style={s.followBtn} activeOpacity={0.8}>
                    <Text style={s.followBtnText}>Follow</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ── Upload CTA Card ───────────────────────── */}
        <View style={s.uploadCard}>
          <View style={s.uploadIcon}>
            <MaterialCommunityIcons name="movie-open-plus" size={30} color="#10B981" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.uploadTitle}>Want to share your knowledge?</Text>
            <Text style={s.uploadSub}>Upload your own 30 sec video and inspire others.</Text>
            <TouchableOpacity
              style={s.uploadBtn}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('UploadShort')}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={s.uploadBtnText}>Upload Short</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  logoBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#6B7280', marginTop: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 4, right: 4, minWidth: 14, height: 14, paddingHorizontal: 3, borderRadius: 7, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  bellDotText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  pickerRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 16 },
  pickerCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  pickerIcon:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  pickerTitle: { fontSize: 13, fontWeight: '800', color: '#111827' },
  pickerSub:   { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  pickerHint:  { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 10, marginBottom: 6 },

  emptyHint:        { marginHorizontal: 16, marginTop: 22, padding: 24, borderRadius: 16, backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', alignItems: 'center' },
  emptyHintTitle:   { marginTop: 10, fontSize: 14, fontWeight: '800', color: '#4C1D95' },
  emptyHintSub:     { marginTop: 4, fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 17 },

  sectionHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 18, marginBottom: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle:    { fontSize: 15, fontWeight: '800', color: '#111827' },
  viewAll:         { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

  trendRow:   { paddingHorizontal: 16, gap: 12 },
  trendCard:  { width: 130 },
  trendThumb: { width: 130, height: 165, borderRadius: 14, overflow: 'hidden', padding: 10, position: 'relative' },
  trendThumbVideo: { ...StyleSheet.absoluteFillObject },
  trendTitleOverlay: { fontSize: 13, fontWeight: '800', color: '#fff', lineHeight: 17 },
  trendPlay: { position: 'absolute', left: 10, bottom: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  trendDuration: { position: 'absolute', right: 8, bottom: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.55)' },
  trendDurationText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  trendCardTitle: { fontSize: 12, fontWeight: '700', color: '#111827', marginTop: 8 },
  trendMetaRow:   { marginTop: 3 },
  trendCreator:   { fontSize: 11, color: '#7C3AED', fontWeight: '600' },
  trendStatsRow:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  trendStatChip:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendStat:      { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  trendStatHeart: { fontSize: 10, color: '#EF4444', fontWeight: '600' },

  creatorsRow: { paddingHorizontal: 16, gap: 12 },
  creatorCard: {
    width: 116, backgroundColor: '#fff', borderRadius: 14, padding: 12,
    alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', position: 'relative',
  },
  creatorRankBox: { position: 'absolute', top: 8, left: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FBBF24', alignItems: 'center', justifyContent: 'center' },
  creatorRankText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  creatorAvatar:   { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  creatorInitials: { fontSize: 18, fontWeight: '800', color: '#fff' },
  creatorName:     { fontSize: 12, fontWeight: '700', color: '#111827', marginTop: 6 },
  creatorFollowers:{ fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  followBtn:       { marginTop: 8, paddingHorizontal: 18, paddingVertical: 5, backgroundColor: '#7C3AED', borderRadius: 8 },
  followBtnText:   { fontSize: 11, fontWeight: '700', color: '#fff' },

  uploadCard: {
    marginHorizontal: 16, marginTop: 22, padding: 14,
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6',
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  uploadIcon:  { width: 56, height: 56, borderRadius: 14, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  uploadSub:   { fontSize: 11, color: '#6B7280', marginTop: 3, lineHeight: 16 },
  uploadBtn:     { marginTop: 10, backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  uploadBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
