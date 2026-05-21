import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shortsAPI } from '../services/api';

type Kind = 'trainer' | 'student';

interface ApiShort {
  _id: string;
  title: string;
  description?: string;
  topic: string;
  creator?: { _id: string; name: string; role: string };
  creatorType: 'trainer' | 'student';
  views: number;
  likes: number;
  bgTop: string;
  bgBot: string;
  publishedAt?: string;
  createdAt: string;
}

interface Props {
  navigation: any;
  route: any;
}

const TRAINER_CATS = ['All', 'Data Structures', 'DBMS', 'OS', 'Algorithms'];
const STUDENT_CATS = ['All', 'Data Structures', 'Algorithms', 'DBMS'];

const PURPLE = '#6C3CE1';
const GREEN  = '#00C853';

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

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(ms / day);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 month ago';
  return `${months} months ago`;
}

export default function ShortsListScreen({ navigation, route }: Props) {
  const kind: Kind = route?.params?.kind ?? 'trainer';
  const isTrainer = kind === 'trainer';
  const accent = isTrainer ? PURPLE : GREEN;
  const cats = isTrainer ? TRAINER_CATS : STUDENT_CATS;

  const [activeCat, setActiveCat] = useState<string>('All');
  const [shorts, setShorts] = useState<ApiShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const fetcher = isTrainer ? shortsAPI.trainer : shortsAPI.student;
      const data: any = await fetcher(activeCat);
      setShorts(Array.isArray(data) ? data : (data?.data ?? []));
    } catch {
      setShorts([]);
    } finally {
      setLoading(false);
    }
  }, [isTrainer, activeCat]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const data = shorts;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8FF" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>
            {isTrainer ? 'Trainer ' : 'Student '}
            <Text style={{ color: accent }}>Shorts</Text>
          </Text>
          <Text style={s.headerSub}>
            {isTrainer ? 'Videos by BodhaSoft Trainers' : 'Videos by Students'}
          </Text>
        </View>
        {!isTrainer ? (
          <TouchableOpacity
            style={s.uploadHeaderBtn}
            onPress={() => navigation.navigate('UploadShort')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={s.uploadHeaderBtnText}>Upload Short</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="search-outline" size={20} color="#374151" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.catList}
        style={s.catScroll}
      >
        {cats.map((c) => {
          const isActive = c === activeCat;
          return (
            <TouchableOpacity
              key={c}
              style={[s.catChip, isActive && { backgroundColor: accent, borderColor: accent }]}
              onPress={() => setActiveCat(c)}
              activeOpacity={0.85}
            >
              <Text style={[s.catChipText, isActive && { color: '#fff' }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={s.centered}><ActivityIndicator color={accent} /></View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item._id}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            !isTrainer ? (
              <TouchableOpacity
                style={s.myUploadsLink}
                onPress={() => navigation.navigate('MyUploads')}
                activeOpacity={0.85}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={GREEN} />
                <Text style={s.myUploadsLinkText}>View My Uploads</Text>
                <Ionicons name="chevron-forward" size={14} color={GREEN} style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="videocam-off-outline" size={42} color="#D1D5DB" />
              <Text style={s.emptyTitle}>No shorts yet</Text>
              <Text style={s.emptySub}>
                {isTrainer
                  ? 'Trainer shorts will appear here once published from the admin panel.'
                  : 'Be the first to upload a short!'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.row}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('ShortsFeed', { shortId: item._id, kind })}
            >
              <View style={[s.thumb, { backgroundColor: item.bgTop }]}>
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: item.bgBot, opacity: 0.55, top: '50%' }]} />
                <Text style={s.thumbOverlay}>{buildOverlay(item.title)}</Text>
                <View style={s.thumbBottom}>
                  <View style={s.playSmall}>
                    <Ionicons name="play" size={9} color="#fff" style={{ marginLeft: 1 }} />
                  </View>
                  <Text style={s.thumbDur}>00:30</Text>
                </View>
              </View>

              <View style={s.info}>
                <Text style={s.rowTitle} numberOfLines={2}>{item.title}</Text>
                <View style={s.rowCreatorLine}>
                  {!isTrainer && (
                    <View style={[s.creatorAvatarSmall, { backgroundColor: '#7C3AED' }]}>
                      <Text style={s.creatorAvatarText}>{item.creator?.name?.[0] ?? '?'}</Text>
                    </View>
                  )}
                  <Text style={[s.rowCreator, isTrainer && { color: PURPLE }]}>
                    {item.creator?.name ?? 'Unknown'}
                  </Text>
                  {item.creatorType === 'trainer' && (
                    <Ionicons name="checkmark-circle" size={12} color={accent} />
                  )}
                </View>
                <View style={s.rowMeta}>
                  <Ionicons name="eye-outline" size={11} color="#9CA3AF" />
                  <Text style={s.rowMetaText}>{formatCount(item.views)} views</Text>
                  <Text style={s.rowDot}>•</Text>
                  <Text style={s.rowMetaText}>{timeAgo(item.publishedAt || item.createdAt)}</Text>
                </View>
              </View>

              <TouchableOpacity style={s.menuBtn}>
                <Ionicons name="ellipsis-horizontal" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F8FF' },

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
  iconBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  uploadHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: GREEN,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 20,
    shadowColor: GREEN, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 3,
  },
  uploadHeaderBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  catScroll:  { backgroundColor: '#F8F8FF', maxHeight: 56 },
  catList:    { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  catChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 18,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB',
  },
  catChipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16, gap: 12 },

  myUploadsLink: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 12,
  },
  myUploadsLinkText: { color: GREEN, fontSize: 13, fontWeight: '700' },

  row: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 14, padding: 10, gap: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  thumb: {
    width: 86, height: 96, borderRadius: 10,
    padding: 8, overflow: 'hidden',
    justifyContent: 'space-between',
  },
  thumbOverlay: { color: '#fff', fontSize: 11, fontWeight: '800', lineHeight: 14 },
  thumbBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playSmall: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbDur: { color: '#fff', fontSize: 9, fontWeight: '700' },

  info: { flex: 1, gap: 4 },
  rowTitle:    { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  rowCreatorLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creatorAvatarSmall: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', marginRight: 2,
  },
  creatorAvatarText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  rowCreator:  { fontSize: 12, fontWeight: '600', color: '#1a1a2e' },
  rowMeta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMetaText: { fontSize: 11, color: '#9CA3AF' },
  rowDot:      { fontSize: 11, color: '#9CA3AF', marginHorizontal: 1 },
  menuBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  empty:      { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#374151', marginTop: 12 },
  emptySub:   { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
