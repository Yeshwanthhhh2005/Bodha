import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type MCIconName  = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Puzzle {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
  points: number;
  solvedCount: number;
  isSolved?: boolean;
  isNew?: boolean;
  iconLib: 'mci' | 'ion';
  icon: MCIconName | IoniconName;
  bg: string;
  accent: string;
}

const DAILY: Puzzle = {
  id: 'daily',
  title: 'Reverse a Linked List',
  difficulty: 'Medium',
  topic: 'Data Structures',
  points: 50,
  solvedCount: 1240,
  iconLib: 'mci',
  icon: 'link-variant',
  bg: '#FEF3C7',
  accent: '#D97706',
};

const PUZZLES: Puzzle[] = [
  { id: 'p1', title: 'Two Sum',                 difficulty: 'Easy',   topic: 'Arrays',         points: 20, solvedCount: 4520, isSolved: true,  iconLib: 'mci', icon: 'numeric-2-circle-outline', bg: '#DCFCE7', accent: '#059669' },
  { id: 'p2', title: 'Valid Parentheses',       difficulty: 'Easy',   topic: 'Stack',          points: 25, solvedCount: 3210, isSolved: true,  iconLib: 'mci', icon: 'code-tags-check',          bg: '#DBEAFE', accent: '#2563EB' },
  { id: 'p3', title: 'Merge Two Sorted Lists',  difficulty: 'Easy',   topic: 'Linked List',    points: 25, solvedCount: 2890,                  iconLib: 'mci', icon: 'merge',                    bg: '#FCE7F3', accent: '#DB2777' },
  { id: 'p4', title: 'Binary Tree Inorder',     difficulty: 'Medium', topic: 'Trees',          points: 40, solvedCount: 1840, isNew: true,     iconLib: 'mci', icon: 'file-tree-outline',        bg: '#EDE9FE', accent: '#7C3AED' },
  { id: 'p5', title: 'Longest Substring',       difficulty: 'Medium', topic: 'Strings',        points: 40, solvedCount: 1560,                  iconLib: 'mci', icon: 'format-text',              bg: '#FED7AA', accent: '#EA580C' },
  { id: 'p6', title: 'Word Ladder',             difficulty: 'Hard',   topic: 'Graphs',         points: 80, solvedCount: 620,                   iconLib: 'mci', icon: 'graph',                    bg: '#FEE2E2', accent: '#DC2626' },
];

const DIFFICULTY_META = {
  Easy:   { color: '#059669', bg: '#DCFCE7' },
  Medium: { color: '#D97706', bg: '#FEF3C7' },
  Hard:   { color: '#DC2626', bg: '#FEE2E2' },
};

const FILTERS = ['All', 'Easy', 'Medium', 'Hard', 'Solved'] as const;
type Filter = typeof FILTERS[number];

export default function PuzzleScreen() {
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = PUZZLES.filter((p) => {
    if (filter === 'All') return true;
    if (filter === 'Solved') return p.isSolved;
    return p.difficulty === filter;
  });

  const solvedCount = PUZZLES.filter((p) => p.isSolved).length;
  const totalPoints = PUZZLES.filter((p) => p.isSolved).reduce((sum, p) => sum + p.points, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerIconCircle}>
          <Ionicons name="extension-puzzle" size={22} color="#FBBF24" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Puzzles</Text>
          <Text style={s.headerSub}>Solve. Earn points. Level up.</Text>
        </View>
        <View style={s.streakBox}>
          <MaterialCommunityIcons name="fire" size={14} color="#F97316" />
          <Text style={s.streakText}>7</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero: Daily Challenge */}
        <View style={s.heroWrap}>
          <View style={s.heroCard}>
            <View style={s.heroTopRow}>
              <View style={s.heroBadge}>
                <Ionicons name="calendar" size={11} color="#fff" />
                <Text style={s.heroBadgeText}>DAILY CHALLENGE</Text>
              </View>
              <View style={s.heroPoints}>
                <Ionicons name="diamond" size={11} color="#FBBF24" />
                <Text style={s.heroPointsText}>+{DAILY.points} pts</Text>
              </View>
            </View>
            <Text style={s.heroTitle}>{DAILY.title}</Text>
            <View style={s.heroMetaRow}>
              <View style={[s.heroChip, { backgroundColor: DIFFICULTY_META[DAILY.difficulty].bg }]}>
                <Text style={[s.heroChipText, { color: DIFFICULTY_META[DAILY.difficulty].color }]}>
                  {DAILY.difficulty}
                </Text>
              </View>
              <Text style={s.heroMetaText}>{DAILY.topic}</Text>
              <Text style={s.heroMetaText}>• {DAILY.solvedCount.toLocaleString()} solved</Text>
            </View>
            <TouchableOpacity style={s.heroCta} activeOpacity={0.85}>
              <Ionicons name="rocket" size={14} color="#fff" />
              <Text style={s.heroCtaText}>Start Challenge</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick stats */}
        <View style={s.statRow}>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="checkmark-done" size={16} color="#059669" />
            </View>
            <Text style={s.statValue}>{solvedCount}</Text>
            <Text style={s.statLabel}>Solved</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="diamond" size={16} color="#D97706" />
            </View>
            <Text style={s.statValue}>{totalPoints}</Text>
            <Text style={s.statLabel}>Points</Text>
          </View>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: '#EDE9FE' }]}>
              <MaterialCommunityIcons name="trophy-variant" size={16} color="#7C3AED" />
            </View>
            <Text style={s.statValue}>#42</Text>
            <Text style={s.statLabel}>Rank</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.filterScroll}
          contentContainerStyle={s.filterContent}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[s.filterChip, active && s.filterChipActive]}
                onPress={() => setFilter(f)}
                activeOpacity={0.85}
              >
                <Text style={[s.filterText, active && { color: '#fff' }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Puzzle list */}
        <View style={{ paddingHorizontal: 16, gap: 10 }}>
          <Text style={s.sectionTitle}>All Puzzles</Text>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <MaterialCommunityIcons name="puzzle-outline" size={48} color="#D1D5DB" />
              <Text style={s.emptyTitle}>No puzzles in this filter</Text>
            </View>
          ) : filtered.map((p) => {
            const diff = DIFFICULTY_META[p.difficulty];
            return (
              <TouchableOpacity key={p.id} style={s.row} activeOpacity={0.85}>
                <View style={[s.rowIcon, { backgroundColor: p.bg }]}>
                  {p.iconLib === 'mci'
                    ? <MaterialCommunityIcons name={p.icon as MCIconName} size={22} color={p.accent} />
                    : <Ionicons name={p.icon as IoniconName} size={22} color={p.accent} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.rowTitle}>{p.title}</Text>
                    {p.isNew && (
                      <View style={s.newBadge}><Text style={s.newBadgeText}>NEW</Text></View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <View style={[s.diffChip, { backgroundColor: diff.bg }]}>
                      <Text style={[s.diffChipText, { color: diff.color }]}>{p.difficulty}</Text>
                    </View>
                    <Text style={s.rowMeta}>{p.topic}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <Ionicons name="diamond-outline" size={11} color="#9CA3AF" />
                      <Text style={s.rowMeta}>{p.points}</Text>
                    </View>
                  </View>
                </View>
                {p.isSolved ? (
                  <View style={s.solvedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#4C1D95',
  },
  headerIconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub:        { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  streakBox:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  streakText:       { fontSize: 13, fontWeight: '800', color: '#fff' },

  heroWrap: { padding: 16, paddingTop: 18, paddingBottom: 8 },
  heroCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  heroTopRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  heroBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#7C3AED', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  heroBadgeText:{ fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  heroPoints:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  heroPointsText:{ fontSize: 10, fontWeight: '800', color: '#D97706' },
  heroTitle:    { fontSize: 18, fontWeight: '800', color: '#111827', marginTop: 12 },
  heroMetaRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  heroChip:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  heroChipText: { fontSize: 10, fontWeight: '800' },
  heroMetaText: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  heroCta:      { marginTop: 14, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  heroCtaText:  { fontSize: 12, fontWeight: '800', color: '#fff' },

  statRow: { paddingHorizontal: 16, marginTop: 6, flexDirection: 'row', gap: 8 },
  statCard:  { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6' },
  statIcon:  { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },

  filterScroll:  { maxHeight: 50, marginTop: 16 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' },
  filterChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive:  { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterText:        { fontSize: 11, fontWeight: '700', color: '#374151' },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 4 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1, borderColor: '#F3F4F6',
  },
  rowIcon:    { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowTitle:   { fontSize: 13, fontWeight: '800', color: '#111827' },
  rowMeta:    { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  diffChip:    { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  diffChipText:{ fontSize: 10, fontWeight: '800' },
  newBadge:    { backgroundColor: '#EF4444', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  newBadgeText:{ fontSize: 8, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
  solvedBadge: { },

  empty: { alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 10 },
});
