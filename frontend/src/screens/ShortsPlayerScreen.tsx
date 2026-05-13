import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, StatusBar, Share, ActivityIndicator,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { shortsAPI } from '../services/api';
import { resolveMediaUrl } from '../utils/constants';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShortVideo {
  _id: string;
  title: string;
  description?: string;
  topic: string;
  thumbnailColor?: string;
  videoUrl?: string;            // server path, e.g. /uploads/shorts/abc.mp4
  creatorName: string;
  creatorRole: 'trainer' | 'student';
  creatorHandle?: string;
  views: number;
  likes: number;
  shares: number;
  liked?: boolean;
}

interface Props {
  navigation: any;
  route: { params?: { shortId?: string; section?: 'trainer' | 'student' } };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}


// ─── ShortItem ────────────────────────────────────────────────────────────────
interface ShortItemProps {
  video: ShortVideo;
  isActive: boolean;
  onLike: () => void;
  onShare: () => void;
  navigation: any;
}

const ShortItem: React.FC<ShortItemProps> = ({ video, isActive, onLike, onShare, navigation }) => {
  const videoRef = useRef<Video>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [paused, setPaused] = useState(false);   // user tap-to-pause toggle

  const remoteUrl = video.videoUrl ? resolveMediaUrl(video.videoUrl) : '';
  const canPlay = remoteUrl.length > 0 && !errored;
  const shouldPlay = isActive && !paused && canPlay;

  // Reset paused state when the active item changes
  useEffect(() => {
    if (!isActive) setPaused(false);
  }, [isActive]);

  // Imperatively pause/resume when active flag flips (defence in depth)
  useEffect(() => {
    if (!videoRef.current || !canPlay) return;
    if (isActive && !paused) videoRef.current.playAsync().catch(() => {});
    else                     videoRef.current.pauseAsync().catch(() => {});
  }, [isActive, paused, canPlay]);

  return (
    <View style={[item.container, { backgroundColor: video.thumbnailColor ?? '#111827' }]}>
      {/* Real video — fills the cell. Tap to pause/resume. */}
      {canPlay && (
        <TouchableOpacity
          activeOpacity={1}
          style={item.videoTouch}
          onPress={() => setPaused((p) => !p)}
        >
          <Video
            ref={videoRef}
            source={{ uri: remoteUrl }}
            style={item.video}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay={shouldPlay}
            isMuted={false}
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            useNativeControls={false}
          />
          {/* Pause indicator overlay */}
          {paused && isActive && (
            <View style={item.pauseOverlay}>
              <Ionicons name="play" size={68} color="rgba(255,255,255,0.85)" />
            </View>
          )}
          {/* Loading spinner before first frame */}
          {!loaded && (
            <View style={item.spinnerOverlay}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Placeholder/error state — title + "now playing" badge */}
      {!canPlay && (
        <View style={item.center}>
          <Text style={item.bigTitle}>{video.title}</Text>
          {errored
            ? <Text style={item.errText}>Video unavailable</Text>
            : isActive && (
                <View style={item.playingBadge}>
                  <View style={item.playingDot} />
                  <Text style={item.playingText}>NOW PLAYING</Text>
                </View>
              )}
        </View>
      )}

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={item.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={item.topIcon}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={item.topTitle}>Shorts</Text>
        <TouchableOpacity activeOpacity={0.7} style={item.topIcon}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom info */}
      <View style={item.bottomInfo}>
        <View style={item.creatorRow}>
          <View style={item.creatorAv}>
            <Text style={item.creatorAvText}>{video.creatorName[0]}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={item.creatorName}>{video.creatorName}</Text>
              {video.creatorRole === 'trainer' && <MaterialCommunityIcons name="check-decagram" size={14} color="#60A5FA" />}
            </View>
            <Text style={item.creatorHandle}>{video.creatorHandle ?? ''}</Text>
          </View>
          <TouchableOpacity style={item.followPill} activeOpacity={0.85}>
            <Text style={item.followPillText}>Follow</Text>
          </TouchableOpacity>
        </View>
        {video.description ? <Text style={item.desc} numberOfLines={2}>{video.description}</Text> : null}
        <View style={item.topicChipRow}>
          <View style={item.topicChip}><Text style={item.topicChipText}># {video.topic}</Text></View>
          <Text style={item.dotMeta}>• {fmtCount(video.views)} views</Text>
        </View>
      </View>

      {/* Right action rail */}
      <View style={item.actions}>
        <TouchableOpacity style={item.actionBtn} onPress={onLike} activeOpacity={0.7}>
          <Ionicons name={video.liked ? 'heart' : 'heart-outline'} size={30} color={video.liked ? '#EF4444' : '#fff'} />
          <Text style={item.actionText}>{fmtCount(video.likes)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={item.actionBtn} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={26} color="#fff" />
          <Text style={item.actionText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity style={item.actionBtn} onPress={onShare} activeOpacity={0.7}>
          <Ionicons name="arrow-redo-outline" size={26} color="#fff" />
          <Text style={item.actionText}>{fmtCount(video.shares)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={item.actionBtn} activeOpacity={0.7}>
          <Ionicons name="bookmark-outline" size={26} color="#fff" />
          <Text style={item.actionText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function ShortsPlayerScreen({ navigation, route }: Props) {
  const section = route?.params?.section ?? 'trainer';
  const initialId = route?.params?.shortId;

  const [feed, setFeed] = useState<ShortVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);   // backend says no more pages

  const listRef = useRef<FlatList<ShortVideo>>(null);

  // Initial load — honest: empty backend → empty feed (no mock cycle).
  useEffect(() => {
    (async () => {
      try {
        const res: any = await shortsAPI.feed(section as any, undefined, 1).catch(() => null);
        const list: ShortVideo[] = Array.isArray(res) ? res : (res?.data ?? []);
        setFeed(list);
        setExhausted(list.length === 0);

        // If user came in with a specific shortId, jump to it
        if (initialId) {
          const idx = list.findIndex((v) => v._id === initialId);
          if (idx > 0) setTimeout(() => listRef.current?.scrollToIndex({ index: idx, animated: false }), 50);
        }
      } catch {
        setFeed([]);
        setExhausted(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [section, initialId]);

  // Infinite scroll — only paginate while the backend keeps returning items.
  const loadMore = useCallback(async () => {
    if (fetchingMore || exhausted) return;
    setFetchingMore(true);
    try {
      const nextPage = page + 1;
      const res: any = await shortsAPI.feed(section as any, undefined, nextPage).catch(() => null);
      const more: ShortVideo[] = Array.isArray(res) ? res : (res?.data ?? []);
      if (more.length) {
        setFeed((prev) => [...prev, ...more]);
        setPage(nextPage);
      } else {
        setExhausted(true);
      }
    } catch {
      setExhausted(true);
    } finally {
      setFetchingMore(false);
    }
  }, [fetchingMore, exhausted, page, section]);

  // Track which video is active (snap-page detection)
  const onViewableItemsChanged = useRef<(info: { viewableItems: ViewToken[] }) => void>(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setActiveIndex(viewableItems[0].index);
      const v = viewableItems[0].item as ShortVideo;
      if (v?._id) shortsAPI.view(v._id).catch(() => {});
    }
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  // Engagement
  const handleLike = useCallback((id: string) => {
    setFeed((prev) => prev.map((v) => v._id === id
      ? { ...v, liked: !v.liked, likes: v.likes + (v.liked ? -1 : 1) }
      : v));
    shortsAPI.like(id).catch(() => {});
  }, []);

  const handleShare = useCallback(async (v: ShortVideo) => {
    try {
      await Share.share({
        message: `Check out "${v.title}" on BodhaSoft 30-Sec Shorts!`,
      });
      setFeed((prev) => prev.map((x) => x._id === v._id ? { ...x, shares: x.shares + 1 } : x));
      shortsAPI.share(v._id).catch(() => {});
    } catch {
      // user cancelled
    }
  }, []);

  if (loading) {
    return (
      <View style={[s.fill, { backgroundColor: '#000' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (feed.length === 0) {
    return (
      <View style={[s.fill, { backgroundColor: '#000', paddingHorizontal: 32 }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <MaterialCommunityIcons name="video-off-outline" size={56} color="rgba(255,255,255,0.45)" />
        <Text style={s.emptyTitle}>No shorts available</Text>
        <Text style={s.emptySub}>Nothing approved in this section yet. Check back soon.</Text>
        <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={s.emptyBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.fill}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <FlatList
        ref={listRef}
        data={feed}
        keyExtractor={(v) => v._id}
        renderItem={({ item: v, index }) => (
          <ShortItem
            video={v}
            isActive={index === activeIndex}
            onLike={() => handleLike(v._id)}
            onShare={() => handleShare(v)}
            navigation={navigation}
          />
        )}
        pagingEnabled
        snapToInterval={SCREEN_H}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={loadMore}
        onEndReachedThreshold={0.8}
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        initialScrollIndex={0}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { marginTop: 14, fontSize: 16, fontWeight: '800', color: '#fff', textAlign: 'center' },
  emptySub:   { marginTop: 6,  fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center', lineHeight: 17 },
  emptyBtn:   { marginTop: 22, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.8)' },
  emptyBtnText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

const item = StyleSheet.create({
  container:    { width: SCREEN_W, height: SCREEN_H, position: 'relative' },
  videoTouch:   { ...StyleSheet.absoluteFillObject },
  video:        { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.15)' },
  spinnerOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  bigTitle:     { fontSize: 32, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 38 },
  errText:      { marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  playingBadge: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  playingDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  playingText:  { fontSize: 10, fontWeight: '700', color: '#fff', letterSpacing: 0.6 },

  topBar:   { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  topIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },

  bottomInfo: { position: 'absolute', left: 16, right: 80, bottom: 28 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  creatorAv:  { width: 38, height: 38, borderRadius: 19, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  creatorAvText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  creatorName:   { color: '#fff', fontSize: 14, fontWeight: '800' },
  creatorHandle: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 1 },
  followPill:    { marginLeft: 'auto', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5, borderColor: '#fff' },
  followPillText:{ color: '#fff', fontSize: 11, fontWeight: '800' },

  desc:         { color: '#fff', fontSize: 13, lineHeight: 18, marginTop: 4 },
  topicChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  topicChip:    { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 6 },
  topicChipText:{ color: '#fff', fontSize: 10, fontWeight: '700' },
  dotMeta:      { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  actions:    { position: 'absolute', right: 12, bottom: 70, alignItems: 'center', gap: 22 },
  actionBtn:  { alignItems: 'center', gap: 3 },
  actionText: { fontSize: 11, color: '#fff', fontWeight: '700' },
});
