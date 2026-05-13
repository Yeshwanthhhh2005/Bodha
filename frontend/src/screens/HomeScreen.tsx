import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_GAP = 12;
const HORIZ_PAD = 16;
const CARD_W = (SCREEN_W - HORIZ_PAD * 2 - CARD_GAP) / 2;

interface Props { navigation: any }

// ─── Feature card data ───────────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type MCIconName  = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface FeatureCard {
  key: string;
  title: string;
  subtitle: string;
  iconLib: 'ion' | 'mci';
  iconName: IoniconName | MCIconName;
  color: string;       // accent color
  bgColor: string;     // soft tinted background for icon
  /** When tapped, do this. */
  onPress: (nav: any) => void;
  badge?: string;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }: Props) {
  /** Home is a tab. Feature screens live on the root stack (one level up). */
  const openRoot = (routeName: string) =>
    (navigation.getParent?.()?.navigate?.(routeName)) ?? navigation.navigate(routeName);

  const features: FeatureCard[] = [
    {
      key: 'shorts',
      title: '30 Sec Shorts',
      subtitle: 'Learn fast.\nShare smart.',
      iconLib: 'ion', iconName: 'play-circle',
      color: '#10B981', bgColor: '#DCFCE7',
      badge: 'NEW',
      onPress: () => openRoot('ShortsRoot'),
    },
    {
      key: 'live',
      title: 'Live Sessions',
      subtitle: 'Join live classes\nwith trainers',
      iconLib: 'ion', iconName: 'videocam',
      color: '#7C3AED', bgColor: '#EDE9FE',
      onPress: () => openRoot('LiveSessionsRoot'),
    },
    {
      key: 'schedule',
      title: 'Class Schedule',
      subtitle: 'This week\'s\ntimetable',
      iconLib: 'ion', iconName: 'calendar',
      color: '#0EA5E9', bgColor: '#E0F2FE',
      onPress: () => openRoot('ClassScheduleRoot'),
    },
    {
      key: 'leaderboard',
      title: 'Leaderboard',
      subtitle: 'Top performers\n& streaks',
      iconLib: 'ion', iconName: 'trophy',
      color: '#F59E0B', bgColor: '#FEF3C7',
      onPress: () => openRoot('AchievementsRoot'),
    },
    {
      key: 'practice',
      title: 'Practice Zone',
      subtitle: 'Coding challenges\n& quizzes',
      iconLib: 'mci', iconName: 'rocket-launch',
      color: '#EC4899', bgColor: '#FCE7F3',
      onPress: () => navigation.navigate('Puzzle'),
    },
    {
      key: 'notes',
      title: 'Notes',
      subtitle: 'Class notes &\nresources',
      iconLib: 'mci', iconName: 'notebook',
      color: '#6366F1', bgColor: '#E0E7FF',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* ── Top Header (purple) ────────────────────────── */}
      <View style={s.header}>
        <View style={s.brandRow}>
          <View style={s.brandIcon}>
            <MaterialCommunityIcons name="school" size={20} color="#fff" />
          </View>
          <Text style={s.brandText}>BodhaSoft</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity style={s.iconBtn}>
            <Ionicons name="notifications-outline" size={18} color="#fff" />
            <View style={s.bellDot}><Text style={s.bellDotText}>3</Text></View>
          </TouchableOpacity>
          <View style={s.avatar}><Text style={s.avatarText}>YK</Text></View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ────────────────────────────────── */}
        <View style={s.greetWrap}>
          <Text style={s.greetHi}>Hello, Yeshwanth 👋</Text>
          <Text style={s.greetSub}>Ready to learn something new today?</Text>
        </View>

        {/* ── Continue Learning Hero ───────────────── */}
        <TouchableOpacity
          style={s.heroCard}
          activeOpacity={0.9}
          onPress={() => openRoot('LiveSessionsRoot')}
        >
          <View style={s.heroLeft}>
            <Text style={s.heroLabel}>CONTINUE LEARNING</Text>
            <Text style={s.heroTitle}>Java Programming</Text>
            <View style={s.heroMetaRow}>
              <MaterialCommunityIcons name="language-java" size={16} color="#FBBF24" />
              <Text style={s.heroMeta}>45% complete · 7 of 15 classes</Text>
            </View>
            <View style={s.heroProgressTrack}>
              <View style={[s.heroProgressFill, { width: '45%' }]} />
            </View>
            <View style={s.heroCta}>
              <Ionicons name="play" size={12} color="#fff" />
              <Text style={s.heroCtaText}>Resume Learning</Text>
            </View>
          </View>
          <View style={s.heroLogo}>
            <MaterialCommunityIcons name="language-java" size={48} color="#FBBF24" />
          </View>
        </TouchableOpacity>

        {/* ── Section heading ─────────────────────── */}
        <View style={s.sectionHeadRow}>
          <Text style={s.sectionTitle}>Explore</Text>
          <Text style={s.sectionSub}>Tap a card to dive in</Text>
        </View>

        {/* ── Feature card grid ─────────────────── */}
        <View style={s.cardsGrid}>
          {features.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={s.featureCard}
              activeOpacity={0.85}
              onPress={() => f.onPress(navigation)}
            >
              <View style={[s.featureIconBox, { backgroundColor: f.bgColor }]}>
                {f.iconLib === 'ion'
                  ? <Ionicons name={f.iconName as IoniconName} size={26} color={f.color} />
                  : <MaterialCommunityIcons name={f.iconName as MCIconName} size={26} color={f.color} />}
              </View>
              {f.badge && (
                <View style={[s.featureBadge, { backgroundColor: f.color }]}>
                  <Text style={s.featureBadgeText}>{f.badge}</Text>
                </View>
              )}
              <Text style={s.featureTitle}>{f.title}</Text>
              <Text style={s.featureSub}>{f.subtitle}</Text>
              <View style={s.featureArrow}>
                <Ionicons name="arrow-forward" size={14} color={f.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quick stat strip ─────────────────────── */}
        <View style={s.statStrip}>
          <View style={s.statCell}>
            <MaterialCommunityIcons name="fire" size={18} color="#F97316" />
            <Text style={s.statValue}>7</Text>
            <Text style={s.statLabel}>Day Streak</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <Ionicons name="ribbon" size={18} color="#7C3AED" />
            <Text style={s.statValue}>320</Text>
            <Text style={s.statLabel}>Points</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCell}>
            <Ionicons name="checkmark-done" size={18} color="#10B981" />
            <Text style={s.statValue}>12</Text>
            <Text style={s.statLabel}>Completed</Text>
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#4C1D95' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#4C1D95',
  },
  brandRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon:   { width: 36, height: 36, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  brandText:   { fontSize: 17, fontWeight: '800', color: '#fff' },
  iconBtn:     { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot:     { position: 'absolute', top: 4, right: 4, minWidth: 14, height: 14, paddingHorizontal: 3, borderRadius: 7, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  bellDotText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  avatar:      { width: 36, height: 36, borderRadius: 18, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 12, fontWeight: '800', color: '#fff' },

  greetWrap:   { backgroundColor: '#4C1D95', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 22 },
  greetHi:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  greetSub:    { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  heroCard: {
    marginHorizontal: 16, marginTop: -8, padding: 18, borderRadius: 18,
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'flex-start',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5,
  },
  heroLeft:    { flex: 1, paddingRight: 14 },
  heroLabel:   { fontSize: 10, fontWeight: '800', color: '#7C3AED', letterSpacing: 0.8 },
  heroTitle:   { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 4 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  heroMeta:    { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  heroProgressTrack: { marginTop: 10, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  heroProgressFill:  { height: '100%', backgroundColor: '#10B981' },
  heroCta:     { marginTop: 12, alignSelf: 'flex-start', backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroCtaText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  heroLogo:    { width: 70, height: 70, borderRadius: 14, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' },

  sectionHeadRow: { paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },
  sectionTitle:   { fontSize: 16, fontWeight: '800', color: '#111827' },
  sectionSub:     { fontSize: 11, color: '#9CA3AF', marginTop: 3 },

  cardsGrid: { paddingHorizontal: HORIZ_PAD, flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP, justifyContent: 'space-between' },
  featureCard: {
    width: CARD_W, padding: 14, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3F4F6',
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  featureIconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureBadge:   { position: 'absolute', top: 12, right: 12, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  featureBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  featureTitle:   { fontSize: 14, fontWeight: '800', color: '#111827' },
  featureSub:     { fontSize: 11, color: '#6B7280', marginTop: 4, lineHeight: 15 },
  featureArrow:   { marginTop: 10 },

  statStrip: {
    marginHorizontal: 16, marginTop: 22, padding: 16, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3F4F6',
    flexDirection: 'row', alignItems: 'center',
  },
  statCell:    { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 36, backgroundColor: '#F3F4F6' },
  statValue:   { fontSize: 17, fontWeight: '800', color: '#111827', marginTop: 4 },
  statLabel:   { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },
});
