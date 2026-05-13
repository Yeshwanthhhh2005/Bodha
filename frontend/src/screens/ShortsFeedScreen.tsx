import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { shortsAPI } from '../services/api';
import { resolveMediaUrl } from '../utils/constants';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShortVideo {
  _id: string;
  title: string;
  topic: string;
  thumbnailColor?: string;
  videoUrl?: string;
  durationLabel?: string;
  creatorName: string;
  creatorRole: 'trainer' | 'student';
  views: number;
  uploadedAt: string;
}

interface Props {
  navigation: any;
  route: { params?: { section?: 'trainer' | 'student' } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / (24 * 3600 * 1000));
  if (d <= 0) return 'today';
  if (d === 1) return '1 day ago';
  return `${d} days ago`;
}

const TOPICS = ['All', 'Data Structures', 'DBMS', 'OS', 'Algorithms', 'SQL'];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ShortsFeedScreen({ navigation, route }: Props) {
  const section: 'trainer' | 'student' = route?.params?.section ?? 'trainer';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [activeTopic, setActiveTopic] = useState<string>('All');

  const isStudent = section === 'student';
  const accent = isStudent ? '#10B981' : '#7C3AED';
  const accentSoft = isStudent ? '#DCFCE7' : '#EDE9FE';

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const topicQuery = activeTopic !== 'All' ? activeTopic : undefined;
      const res: any = await shortsAPI.feed(section, topicQuery).catch(() => null);
      const list: ShortVideo[] = Array.isArray(res) ? res : (res?.data ?? []);
      // Honest empty state — no mock fallback.
      setShorts(list);
    } catch {
      setShorts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [section, activeTopic]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ──────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>
            {isStudent ? 'Student ' : 'Trainer '}
            <Text style={{ color: accent }}>Shorts</Text>
          </Text>
          <Text style={s.headerSub}>Videos by {isStudent ? 'Students' : 'BodhaSoft Trainers'}</Text>
        </View>
        <TouchableOpacity style={s.iconBtn} activeOpacity={0.7}>
          <Ionicons name="search" size={16} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* ── Topic Filter Chips ───────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.topicScroll}
        contentContainerStyle={s.topicContent}
      >
        {TOPICS.map((t) => {
          const isActive = t === activeTopic;
          return (
            <TouchableOpacity
              key={t}
              style={[s.topicChip, isActive && { backgroundColor: accent, borderColor: accent }]}
              onPress={() => setActiveTopic(t)}
              activeOpacity={0.8}
            >
              <Text style={[s.topicChipText, isActive && { color: '#fff' }]}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={accent} /></View>
      ) : shorts.length === 0 ? (
        <View style={s.empty}>
          <MaterialCommunityIcons name="video-off-outline" size={48} color="#D1D5DB" />
          <Text style={s.emptyTitle}>No shorts yet</Text>
          <Text style={s.emptySub}>Be the first to upload — the queue is empty.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={accent} />
          }
        >
          {shorts.map((v) => (
            <TouchableOpacity
              key={v._id}
              style={s.listCard}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ShortsPlayer', { shortId: v._id, section })}
            >
              {/* Thumbnail — first frame of the real video if available */}
              <View style={[s.listThumb, { backgroundColor: v.thumbnailColor ?? '#4C1D95' }]}>
                {v.videoUrl ? (
                  <>
                    <Video
                      source={{ uri: resolveMediaUrl(v.videoUrl) }}
                      style={s.listThumbVideo}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={false}
                      isMuted
                    />
                    <View style={s.listThumbPlay}>
                      <Ionicons name="play" size={14} color="#fff" />
                    </View>
                  </>
                ) : (
                  <Text style={s.listThumbTitle} numberOfLines={3}>{v.title}</Text>
                )}
                <View style={s.listDuration}>
                  <Text style={s.listDurationText}>{v.durationLabel ?? '00:30'}</Text>
                </View>
              </View>

              {/* Right side */}
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.listTitle} numberOfLines={2}>{v.title}</Text>
                  <TouchableOpacity style={s.menuBtn} activeOpacity={0.6}>
                    <Ionicons name="ellipsis-horizontal" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                <View style={[s.listAuthor, { backgroundColor: accentSoft, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  <Text style={[s.listAuthorText, { color: accent }]}>{v.creatorName}</Text>
                  {v.creatorRole === 'trainer' && <MaterialCommunityIcons name="check-decagram" size={12} color={accent} />}
                </View>
                <Text style={s.listMeta}>
                  {fmtCount(v.views)} views • {timeAgo(v.uploadedAt)}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginTop: 10 },
  emptySub:   { fontSize: 12, color: '#9CA3AF', marginTop: 4, textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:     { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  headerSub:   { fontSize: 11, color: '#6B7280', marginTop: 1 },
  iconBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },

  topicScroll:  { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', maxHeight: 50 },
  topicContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, alignItems: 'center' },
  topicChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 18,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  topicChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },

  listCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  listThumb: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden', padding: 8, position: 'relative' },
  listThumbVideo: { ...StyleSheet.absoluteFillObject },
  listThumbPlay:  { position: 'absolute', top: '50%', left: '50%', width: 28, height: 28, borderRadius: 14, marginTop: -14, marginLeft: -14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  listThumbTitle: { fontSize: 11, fontWeight: '800', color: '#fff', lineHeight: 14 },
  listDuration:   { position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  listDurationText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  listTitle:     { fontSize: 13, fontWeight: '800', color: '#111827', flex: 1, marginRight: 8, lineHeight: 17 },
  menuBtn:       { padding: 2, marginTop: -2 },
  listAuthor:    { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginTop: 6 },
  listAuthorText:{ fontSize: 11, fontWeight: '700' },
  listMeta:      { fontSize: 11, color: '#9CA3AF', marginTop: 6 },
});
