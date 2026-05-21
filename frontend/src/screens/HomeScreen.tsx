import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface HomeScreenProps {
  navigation: any;
}

interface QuickAccessTile {
  key: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  bg: string;
  fg: string;
  onPress: () => void;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const parent = navigation?.getParent?.();

  const goTab = (tab: string) => () => parent?.navigate?.(tab);
  const goScreen = (route: string) => () => navigation?.navigate?.(route);

  const tiles: QuickAccessTile[] = [
    {
      key: 'live',
      label: 'Live Sessions',
      sub: 'Join class now',
      icon: <Ionicons name="videocam" size={26} color="#7C3AED" />,
      bg: '#EDE9FE', fg: '#7C3AED',
      onPress: goScreen('LiveSessions'),
    },
    {
      key: 'schedule',
      label: 'Class Schedule',
      sub: 'This week',
      icon: <Ionicons name="calendar" size={26} color="#2563EB" />,
      bg: '#DBEAFE', fg: '#2563EB',
      onPress: goTab('MyLearning'),
    },
    {
      key: 'shorts',
      label: '30 Sec Shorts',
      sub: 'Learn fast',
      icon: <Ionicons name="play-circle" size={26} color="#00C853" />,
      bg: '#DCFCE7', fg: '#00C853',
      onPress: goTab('Shorts'),
    },
    {
      key: 'leaderboard',
      label: 'Leaderboard',
      sub: 'Your ranking',
      icon: <Ionicons name="trophy" size={26} color="#D97706" />,
      bg: '#FEF3C7', fg: '#D97706',
      onPress: goScreen('Leaderboard'),
    },
    {
      key: 'challenges',
      label: 'Challenges',
      sub: 'Weekly tasks',
      icon: <MaterialCommunityIcons name="target" size={26} color="#DB2777" />,
      bg: '#FCE7F3', fg: '#DB2777',
      onPress: goScreen('Challenges'),
    },
    {
      key: 'notifications',
      label: 'Notifications',
      sub: 'Latest updates',
      icon: <Ionicons name="notifications" size={26} color="#0891B2" />,
      bg: '#CFFAFE', fg: '#0891B2',
      onPress: goScreen('Notifications'),
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F8FF" />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoBox}>
            <Ionicons name="school" size={20} color="#fff" />
          </View>
          <View>
            <Text style={s.hello}>Hi, Student 👋</Text>
            <Text style={s.welcome}>Welcome back to Bodha</Text>
          </View>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity
            style={s.bellBtn}
            onPress={goScreen('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#374151" />
            <View style={s.bellDot} />
          </TouchableOpacity>
          <View style={s.avatar}>
            <Text style={s.avatarText}>Y</Text>
          </View>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Continue Learning banner ─────────────────────────── */}
        <TouchableOpacity
          style={s.banner}
          activeOpacity={0.9}
          onPress={goTab('MyLearning')}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.bannerLabel}>CONTINUE LEARNING</Text>
            <Text style={s.bannerTitle}>Java — Variables & Data Types</Text>
            <Text style={s.bannerSub}>Today · 7:00 PM</Text>
            <View style={s.bannerCta}>
              <Text style={s.bannerCtaText}>Open Schedule</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
          <View style={s.bannerIcon}>
            <Ionicons name="book" size={42} color="rgba(255,255,255,0.85)" />
          </View>
        </TouchableOpacity>

        {/* ── Quick Access grid ────────────────────────────────── */}
        <Text style={s.sectionTitle}>Quick Access</Text>
        <View style={s.grid}>
          {tiles.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={s.tile}
              activeOpacity={0.85}
              onPress={t.onPress}
            >
              <View style={[s.tileIcon, { backgroundColor: t.bg }]}>
                {t.icon}
              </View>
              <Text style={s.tileLabel}>{t.label}</Text>
              <Text style={s.tileSub}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Today's class quick card ───────────────────────── */}
        <Text style={s.sectionTitle}>Today's Class</Text>
        <TouchableOpacity
          style={s.todayCard}
          activeOpacity={0.9}
          onPress={goScreen('LiveSessions')}
        >
          <View style={s.todayIconBox}>
            <Ionicons name="videocam" size={24} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.todayTitle}>Introduction to Java</Text>
            <View style={s.todayMeta}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={s.todayMetaText}>7:00 – 8:00 PM</Text>
              <View style={s.liveBadge}><Text style={s.liveBadgeText}>LIVE</Text></View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const PURPLE = '#7C3AED';

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F8F8FF' },
  scroll: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  logoBox: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  hello:    { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  welcome:  { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute', top: 8, right: 9,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5, borderColor: '#fff',
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  banner: {
    marginHorizontal: 16, marginTop: 16,
    borderRadius: 18,
    backgroundColor: '#4C1D95',
    padding: 18,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  bannerLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 0.6 },
  bannerTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginTop: 6 },
  bannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  bannerCta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 18, marginTop: 12,
  },
  bannerCtaText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bannerIcon:    { marginLeft: 12 },

  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: '#1a1a2e',
    paddingHorizontal: 16, marginTop: 22, marginBottom: 12,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, gap: 10,
  },
  tile: {
    width: '47.7%',
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  tileIcon: {
    width: 46, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  tileLabel: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  tileSub:   { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  todayCard: {
    marginHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  todayIconBox: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center',
  },
  todayTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a2e' },
  todayMeta:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  todayMetaText: { fontSize: 11, color: '#6B7280' },
  liveBadge: {
    marginLeft: 6,
    backgroundColor: '#FEE2E2',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  liveBadgeText: { fontSize: 9, fontWeight: '800', color: '#DC2626', letterSpacing: 0.4 },
});
