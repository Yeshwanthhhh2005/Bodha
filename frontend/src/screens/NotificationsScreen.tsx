import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { notificationAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { useNotification } from '../context/NotificationContext';
import type { AppNotification } from '../types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { LiveSessionsStackParamList } from '../types';

interface NotificationsScreenProps {
  navigation?: NativeStackNavigationProp<LiveSessionsStackParamList, 'Notifications'>;
}

const TYPE_ICONS: Record<string, string> = {
  session_reminder: '⏰',
  admin_broadcast:  '📢',
  daily_reminder:   '🌅',
  new_content:      '📚',
  achievement:      '🏆',
  points:           '⭐',
  assessment:       '📝',
  system:           '🔔',
};

const timeAgo = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({ navigation }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { setUnreadCount } = useNotification();

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data || []);
    } catch (err: unknown) {
      console.error('Notifications load error:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    setUnreadCount(0);
  }, [load, setUnreadCount]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (notif: AppNotification): void => {
      setNotifications((prev) => [notif, ...prev]);
    };
    socket.on('notification:new', handler);
    return () => socket.off('notification:new', handler);
  }, []);

  const markRead = async (id: string): Promise<void> => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    try {
      await notificationAPI.markRead(id);
    } catch {}
  };

  const markAllRead = async (): Promise<void> => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await notificationAPI.markAllRead();
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderItem = ({ item }: { item: AppNotification }) => (
    <TouchableOpacity
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={() => markRead(item._id)}
      activeOpacity={0.75}
    >
      <View style={styles.iconBox}>
        <Text style={styles.iconText}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, !item.isRead && styles.titleUnread]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const ListEmpty: React.FC = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySub}>You'll see session reminders and updates here.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headerIconBox}>
            <Text style={{ fontSize: 18 }}>🔔</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSub}>Stay updated. Never miss a thing.</Text>
          </View>
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#7C3AED" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="#7C3AED"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F9FAFB' },
  header:        { backgroundColor: '#4C1D95', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:       { padding: 4 },
  backIcon:      { fontSize: 22, color: '#fff', fontWeight: '600' },
  headerCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub:     { fontSize: 11, color: '#C4B5FD', marginTop: 1 },
  markAllBtn:    { paddingHorizontal: 4 },
  markAllText:   { fontSize: 12, color: '#C4B5FD', fontWeight: '600' },
  loader:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  item:        { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff' },
  itemUnread:  { backgroundColor: '#FAF5FF' },
  iconBox:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0, position: 'relative' },
  iconText:    { fontSize: 18 },
  unreadDot:   { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#7C3AED', borderWidth: 1.5, borderColor: '#fff' },
  content:     { flex: 1 },
  title:       { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 3 },
  titleUnread: { color: '#111827', fontWeight: '700' },
  message:     { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  time:        { fontSize: 11, color: '#9CA3AF', marginTop: 5 },
  separator:   { height: 1, backgroundColor: '#F3F4F6' },
  empty:        { alignItems: 'center', paddingTop: 80 },
  emptyContainer: { flex: 1 },
  emptyIcon:    { fontSize: 52, marginBottom: 14 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 6 },
  emptySub:     { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
});

export default NotificationsScreen;
