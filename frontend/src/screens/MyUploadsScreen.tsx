import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, FlatList, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { shortsAPI } from '../services/api';

interface Props { navigation: any; }

interface MyShort {
  _id: string;
  title: string;
  description?: string;
  topic: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  videoUrl: string;
  bgTop: string;
  bgBot: string;
  views: number;
  likes: number;
  createdAt: string;
  publishedAt?: string;
}

const GREEN = '#00C853';
const PURPLE = '#6C3CE1';

const STATUS_STYLES: Record<MyShort['status'], { bg: string; fg: string; icon: any; label: string }> = {
  pending:  { bg: '#FEF3C7', fg: '#92400E', icon: 'time-outline',      label: 'Pending Review' },
  approved: { bg: '#D1FAE5', fg: '#065F46', icon: 'checkmark-circle',  label: 'Approved · Live' },
  rejected: { bg: '#FEE2E2', fg: '#991B1B', icon: 'close-circle',      label: 'Rejected' },
};

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(ms / day);
  if (days <= 0) {
    const hrs = Math.floor(ms / (60 * 60 * 1000));
    if (hrs <= 0) {
      const mins = Math.max(1, Math.floor(ms / (60 * 1000)));
      return `${mins}m ago`;
    }
    return `${hrs}h ago`;
  }
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export default function MyUploadsScreen({ navigation }: Props) {
  const [items, setItems] = useState<MyShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data: any = await shortsAPI.myUploads();
      setItems(Array.isArray(data) ? data : (data?.data ?? []));
    } catch {
      setItems([]);
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

  const counts = {
    pending: items.filter((x) => x.status === 'pending').length,
    approved: items.filter((x) => x.status === 'approved').length,
    rejected: items.filter((x) => x.status === 'rejected').length,
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8FF" />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>My Uploads</Text>
          <Text style={s.headerSub}>Track the status of your submitted shorts</Text>
        </View>
        <TouchableOpacity
          style={s.newBtn}
          onPress={() => navigation.navigate('UploadShort')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <View style={s.statsRow}>
        <View style={[s.stat, { backgroundColor: '#FEF3C7' }]}>
          <Text style={[s.statNum, { color: '#92400E' }]}>{counts.pending}</Text>
          <Text style={[s.statLabel, { color: '#92400E' }]}>Pending</Text>
        </View>
        <View style={[s.stat, { backgroundColor: '#D1FAE5' }]}>
          <Text style={[s.statNum, { color: '#065F46' }]}>{counts.approved}</Text>
          <Text style={[s.statLabel, { color: '#065F46' }]}>Approved</Text>
        </View>
        <View style={[s.stat, { backgroundColor: '#FEE2E2' }]}>
          <Text style={[s.statNum, { color: '#991B1B' }]}>{counts.rejected}</Text>
          <Text style={[s.statLabel, { color: '#991B1B' }]}>Rejected</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator color={PURPLE} /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it._id}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cloud-upload-outline" size={48} color="#D1D5DB" />
              <Text style={s.emptyTitle}>No uploads yet</Text>
              <Text style={s.emptySub}>
                Upload your first 30-second short to share your knowledge.
              </Text>
              <TouchableOpacity
                style={s.emptyCta}
                onPress={() => navigation.navigate('UploadShort')}
                activeOpacity={0.85}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={s.emptyCtaText}>Upload Short</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const styleObj = STATUS_STYLES[item.status];
            return (
              <View style={s.card}>
                <View style={[s.thumb, { backgroundColor: item.bgTop }]}>
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: item.bgBot, opacity: 0.55, top: '50%' }]} />
                  <Text style={s.thumbTitle} numberOfLines={3}>{item.title}</Text>
                  <View style={s.thumbBottom}>
                    <View style={s.playSmall}>
                      <Ionicons name="play" size={9} color="#fff" style={{ marginLeft: 1 }} />
                    </View>
                    <Text style={s.thumbDur}>00:30</Text>
                  </View>
                </View>

                <View style={s.cardInfo}>
                  <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={s.cardMeta}>
                    <Text style={s.cardMetaText}>{item.topic}</Text>
                    <Text style={s.cardDot}>·</Text>
                    <Text style={s.cardMetaText}>{timeAgo(item.createdAt)}</Text>
                  </View>

                  <View style={[s.statusBadge, { backgroundColor: styleObj.bg }]}>
                    <Ionicons name={styleObj.icon} size={12} color={styleObj.fg} />
                    <Text style={[s.statusBadgeText, { color: styleObj.fg }]}>{styleObj.label}</Text>
                  </View>

                  {item.status === 'rejected' && item.rejectionReason ? (
                    <Text style={s.reason} numberOfLines={3}>
                      <Text style={s.reasonLabel}>Reason: </Text>{item.rejectionReason}
                    </Text>
                  ) : null}

                  {item.status === 'approved' && (
                    <View style={s.cardStats}>
                      <Ionicons name="eye-outline" size={12} color="#9CA3AF" />
                      <Text style={s.cardStat}>{item.views}</Text>
                      <Ionicons name="heart-outline" size={12} color="#9CA3AF" />
                      <Text style={s.cardStat}>{item.likes}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
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
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: GREEN, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 18,
  },
  newBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  listContent: { paddingHorizontal: 16, paddingBottom: 22, gap: 12 },

  card: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderRadius: 14, padding: 12, gap: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  thumb: {
    width: 86, height: 110, borderRadius: 10,
    padding: 8, overflow: 'hidden',
    justifyContent: 'space-between',
  },
  thumbTitle: { color: '#fff', fontSize: 11, fontWeight: '800', lineHeight: 14 },
  thumbBottom:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playSmall: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  thumbDur: { color: '#fff', fontSize: 9, fontWeight: '700' },

  cardInfo: { flex: 1, gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  cardMeta:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { fontSize: 11, color: '#9CA3AF' },
  cardDot: { fontSize: 11, color: '#9CA3AF' },

  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },

  reason: { fontSize: 11, color: '#7F1D1D', lineHeight: 16 },
  reasonLabel: { fontWeight: '800' },

  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardStat: { fontSize: 11, color: '#9CA3AF', marginRight: 6 },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#374151', marginTop: 12 },
  emptySub:   { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: GREEN, paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 24, marginTop: 18,
  },
  emptyCtaText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
