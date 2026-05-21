import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  FlatList, Dimensions, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { shortsAPI } from '../services/api';

interface Props { navigation: any; route: any; }

interface FeedShort {
  _id: string;
  title: string;
  description?: string;
  topic: string;
  videoUrl: string;
  creator?: { _id: string; name: string; role: string };
  creatorType: 'trainer' | 'student';
  views: number;
  likes: number;
  bgTop: string;
  bgBot: string;
  publishedAt?: string;
  createdAt: string;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PURPLE = '#6C3CE1';

export default function ShortsFeedScreen({ navigation, route }: Props) {
  const initialId: string | undefined = route?.params?.shortId;
  const initialKind: 'trainer' | 'student' | 'all' = route?.params?.kind ?? 'all';

  const [items, setItems] = useState<FeedShort[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());
  const [viewedSet, setViewedSet] = useState<Set<string>>(new Set());
  const listRef = useRef<FlatList<FeedShort>>(null);

  const load = useCallback(async () => {
    try {
      const data: any = await shortsAPI.feed('recent');
      const arr: FeedShort[] = Array.isArray(data) ? data : (data?.data ?? []);
      const filtered = initialKind === 'all'
        ? arr
        : arr.filter((x) => x.creatorType === initialKind);
      setItems(filtered);

      if (initialId) {
        const idx = filtered.findIndex((x) => x._id === initialId);
        if (idx >= 0) {
          setActiveIndex(idx);
          setTimeout(() => listRef.current?.scrollToIndex({ index: idx, animated: false }), 50);
        }
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [initialId, initialKind]);

  useEffect(() => { load(); }, [load]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems?.[0]?.index != null) {
      setActiveIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

  // Track view once per session per short
  useEffect(() => {
    const cur = items[activeIndex];
    if (!cur) return;
    if (viewedSet.has(cur._id)) return;
    setViewedSet((prev) => new Set(prev).add(cur._id));
    shortsAPI.view(cur._id).catch(() => {});
  }, [activeIndex, items, viewedSet]);

  const toggleLike = (item: FeedShort) => {
    if (likedSet.has(item._id)) return;
    setLikedSet((prev) => new Set(prev).add(item._id));
    setItems((prev) => prev.map((x) => x._id === item._id ? { ...x, likes: x.likes + 1 } : x));
    shortsAPI.like(item._id).catch(() => {});
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={s.empty}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Ionicons name="videocam-off-outline" size={56} color="#4B5563" />
        <Text style={s.emptyTitle}>No shorts yet</Text>
        <Text style={s.emptySub}>Check back soon for new content.</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <TouchableOpacity style={s.backFloating} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item._id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_H}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={activeIndex}
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        renderItem={({ item, index }) => (
          <FeedItem
            item={item}
            isActive={index === activeIndex}
            liked={likedSet.has(item._id)}
            onLike={() => toggleLike(item)}
            onTapCreator={() => {
              // Future: navigate to creator profile
            }}
          />
        )}
      />
    </View>
  );
}

interface FeedItemProps {
  item: FeedShort;
  isActive: boolean;
  liked: boolean;
  onLike: () => void;
  onTapCreator: () => void;
}

function FeedItem({ item, isActive, liked, onLike, onTapCreator }: FeedItemProps) {
  const videoRef = useRef<Video>(null);
  const heartAnim = useRef(new Animated.Value(0)).current;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && !paused) videoRef.current.playAsync().catch(() => {});
    else videoRef.current.pauseAsync().catch(() => {});
  }, [isActive, paused]);

  const onStatus = (status: AVPlaybackStatus) => {
    if ('isLoaded' in status && status.isLoaded && status.didJustFinish) {
      videoRef.current?.replayAsync().catch(() => {});
    }
  };

  const handleDoubleTap = () => {
    if (!liked) onLike();
    Animated.sequence([
      Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, friction: 4 }),
      Animated.timing(heartAnim, { toValue: 0, duration: 320, delay: 280, useNativeDriver: true }),
    ]).start();
  };

  const lastTapRef = useRef(0);
  const onTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      handleDoubleTap();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
    setTimeout(() => {
      if (lastTapRef.current && Date.now() - lastTapRef.current >= 280) {
        setPaused((v) => !v);
        lastTapRef.current = 0;
      }
    }, 300);
  };

  const hasVideo = !!item.videoUrl;
  const isTrainer = item.creatorType === 'trainer';

  return (
    <TouchableOpacity activeOpacity={1} style={s.item} onPress={onTap}>
      {hasVideo ? (
        <Video
          ref={videoRef}
          source={{ uri: item.videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isActive}
          onPlaybackStatusUpdate={onStatus}
          isMuted={false}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: item.bgTop }]}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: item.bgBot, opacity: 0.55, top: '45%' }]} />
        </View>
      )}

      {paused && hasVideo && (
        <View style={s.pausedOverlay}>
          <Ionicons name="play" size={64} color="rgba(255,255,255,0.85)" />
        </View>
      )}

      {/* Animated heart on double-tap */}
      <Animated.View style={[s.bigHeart, {
        opacity: heartAnim,
        transform: [{ scale: heartAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.4] }) }],
      }]} pointerEvents="none">
        <Ionicons name="heart" size={120} color="#fff" />
      </Animated.View>

      {/* Right rail actions */}
      <View style={s.rightRail}>
        <TouchableOpacity style={s.railBtn} onPress={onLike} activeOpacity={0.7}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32} color={liked ? '#EF4444' : '#fff'} />
          <Text style={s.railLabel}>{formatCount(item.likes)}</Text>
        </TouchableOpacity>
        <View style={s.railBtn}>
          <Ionicons name="eye-outline" size={28} color="#fff" />
          <Text style={s.railLabel}>{formatCount(item.views)}</Text>
        </View>
        <View style={s.railBtn}>
          <Ionicons name="chatbubble-outline" size={28} color="#fff" />
          <Text style={s.railLabel}>0</Text>
        </View>
        <View style={s.railBtn}>
          <Ionicons name="share-social-outline" size={28} color="#fff" />
          <Text style={s.railLabel}>Share</Text>
        </View>
      </View>

      {/* Bottom info */}
      <View style={s.bottomInfo}>
        <TouchableOpacity style={s.creatorRow} onPress={onTapCreator} activeOpacity={0.85}>
          <View style={[s.creatorAvatar, { backgroundColor: isTrainer ? PURPLE : '#00C853' }]}>
            <Text style={s.creatorInitial}>{item.creator?.name?.[0] ?? '?'}</Text>
          </View>
          <Text style={s.creatorName}>{item.creator?.name ?? 'Unknown'}</Text>
          {isTrainer && <Ionicons name="checkmark-circle" size={14} color="#60A5FA" />}
          <View style={[s.kindBadge, { backgroundColor: isTrainer ? 'rgba(124,58,237,0.4)' : 'rgba(0,200,83,0.4)' }]}>
            <Text style={s.kindBadgeText}>{isTrainer ? 'Trainer' : 'Student'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={s.title} numberOfLines={2}>{item.title}</Text>
        {!!item.description && (
          <Text style={s.desc} numberOfLines={2}>{item.description}</Text>
        )}
        <View style={s.topicChip}>
          <Ionicons name="pricetag" size={10} color="#fff" />
          <Text style={s.topicChipText}>{item.topic}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading:   { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  empty:     { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyTitle:{ color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 12 },
  emptySub:  { color: '#9CA3AF', fontSize: 12, marginTop: 4 },

  backBtn: {
    position: 'absolute', top: 48, left: 16, zIndex: 5,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  backFloating: {
    position: 'absolute', top: 48, left: 16, zIndex: 5,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },

  item: {
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#000',
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },

  bigHeart: {
    position: 'absolute', alignSelf: 'center', top: '40%',
  },

  rightRail: {
    position: 'absolute', right: 12, bottom: 110,
    alignItems: 'center', gap: 22,
  },
  railBtn: { alignItems: 'center', gap: 4 },
  railLabel: { color: '#fff', fontSize: 11, fontWeight: '700' },

  bottomInfo: {
    position: 'absolute', left: 14, right: 80, bottom: 100,
    gap: 8,
  },
  creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creatorAvatar: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
  },
  creatorInitial: { color: '#fff', fontSize: 15, fontWeight: '800' },
  creatorName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  kindBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, marginLeft: 4,
  },
  kindBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  title: { color: '#fff', fontSize: 16, fontWeight: '800', lineHeight: 22 },
  desc:  { color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 17 },

  topicChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12,
  },
  topicChipText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
