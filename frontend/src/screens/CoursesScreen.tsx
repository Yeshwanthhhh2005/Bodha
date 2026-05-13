import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type MCIconName  = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Course {
  id: string;
  title: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  classes: number;
  hours: number;
  rating: number;
  enrolled: number;
  status: 'in-progress' | 'enrolled' | 'available';
  progress?: number;     // 0..1
  accent: string;
  bg: string;
  iconLib: 'mci' | 'ion';
  icon: MCIconName | IoniconName;
}

const COURSES: Course[] = [
  { id: 'java',   title: 'Java Programming',  level: 'Beginner',     classes: 15, hours: 22, rating: 4.8, enrolled: 1240, status: 'in-progress', progress: 0.45, accent: '#EA2D2E', bg: '#FEE2E2', iconLib: 'mci', icon: 'language-java' },
  { id: 'python', title: 'Python Essentials', level: 'Beginner',     classes: 12, hours: 18, rating: 4.9, enrolled: 1845, status: 'enrolled',     progress: 0.0,  accent: '#3B82F6', bg: '#DBEAFE', iconLib: 'mci', icon: 'language-python' },
  { id: 'sql',    title: 'SQL & Databases',   level: 'Intermediate', classes: 10, hours: 14, rating: 4.7, enrolled: 920,  status: 'available',                       accent: '#059669', bg: '#DCFCE7', iconLib: 'mci', icon: 'database' },
  { id: 'html',   title: 'HTML & CSS',        level: 'Beginner',     classes: 8,  hours: 10, rating: 4.6, enrolled: 1560, status: 'available',                       accent: '#F97316', bg: '#FED7AA', iconLib: 'mci', icon: 'language-html5' },
  { id: 'js',     title: 'JavaScript',        level: 'Intermediate', classes: 14, hours: 20, rating: 4.8, enrolled: 1330, status: 'available',                       accent: '#CA8A04', bg: '#FEF3C7', iconLib: 'mci', icon: 'language-javascript' },
  { id: 'dsa',    title: 'Data Structures',   level: 'Advanced',     classes: 18, hours: 30, rating: 4.9, enrolled: 880,  status: 'available',                       accent: '#7C3AED', bg: '#EDE9FE', iconLib: 'mci', icon: 'sitemap' },
];

const FILTERS = ['All', 'In Progress', 'Beginner', 'Intermediate', 'Advanced'] as const;
type Filter = typeof FILTERS[number];

const STATUS_META = {
  'in-progress': { label: 'Continue',     color: '#10B981', bg: '#DCFCE7', icon: 'play-circle'      as IoniconName },
  enrolled:      { label: 'Start Course', color: '#7C3AED', bg: '#EDE9FE', icon: 'play-circle'      as IoniconName },
  available:     { label: 'Enroll',       color: '#3B82F6', bg: '#DBEAFE', icon: 'add-circle'       as IoniconName },
};

export default function CoursesScreen() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const filtered = COURSES.filter((c) => {
    if (query && !c.title.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'All') return true;
    if (filter === 'In Progress') return c.status === 'in-progress';
    return c.level === filter;
  });

  const inProgress = COURSES.filter((c) => c.status === 'in-progress').length;
  const enrolled   = COURSES.filter((c) => c.status === 'enrolled').length;
  const available  = COURSES.filter((c) => c.status === 'available').length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Courses</Text>
          <Text style={s.headerSub}>Build your skills — one class at a time</Text>
        </View>
        <TouchableOpacity style={s.headerIcon}>
          <Ionicons name="funnel-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={s.searchInput}
            placeholder="Search courses..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Stat strip */}
      <View style={s.statStrip}>
        <View style={s.statCell}>
          <Text style={[s.statValue, { color: '#10B981' }]}>{inProgress}</Text>
          <Text style={s.statLabel}>In Progress</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statCell}>
          <Text style={[s.statValue, { color: '#7C3AED' }]}>{enrolled}</Text>
          <Text style={s.statLabel}>Enrolled</Text>
        </View>
        <View style={s.statDiv} />
        <View style={s.statCell}>
          <Text style={[s.statValue, { color: '#3B82F6' }]}>{available}</Text>
          <Text style={s.statLabel}>Available</Text>
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
          const active = f === filter;
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

      {/* Course list */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 32, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={s.empty}>
            <MaterialCommunityIcons name="book-search-outline" size={48} color="#D1D5DB" />
            <Text style={s.emptyTitle}>No courses match</Text>
            <Text style={s.emptySub}>Try clearing your filter or search</Text>
          </View>
        ) : filtered.map((c) => {
          const status = STATUS_META[c.status];
          return (
            <TouchableOpacity key={c.id} style={s.card} activeOpacity={0.9}>
              <View style={s.cardTop}>
                <View style={[s.cardLogo, { backgroundColor: c.bg }]}>
                  {c.iconLib === 'mci'
                    ? <MaterialCommunityIcons name={c.icon as MCIconName} size={32} color={c.accent} />
                    : <Ionicons name={c.icon as IoniconName} size={32} color={c.accent} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{c.title}</Text>
                  <View style={s.cardMetaRow}>
                    <View style={[s.levelChip, { backgroundColor: c.bg }]}>
                      <Text style={[s.levelChipText, { color: c.accent }]}>{c.level}</Text>
                    </View>
                    <View style={s.metaCell}>
                      <Ionicons name="time-outline" size={11} color="#9CA3AF" />
                      <Text style={s.metaText}>{c.hours}h</Text>
                    </View>
                    <View style={s.metaCell}>
                      <MaterialCommunityIcons name="play-box-multiple-outline" size={11} color="#9CA3AF" />
                      <Text style={s.metaText}>{c.classes}</Text>
                    </View>
                    <View style={s.metaCell}>
                      <Ionicons name="star" size={11} color="#F59E0B" />
                      <Text style={s.metaText}>{c.rating}</Text>
                    </View>
                  </View>
                  <Text style={s.enrolled}>{c.enrolled.toLocaleString()} enrolled</Text>
                </View>
              </View>

              {/* Progress + CTA row */}
              <View style={s.cardBottom}>
                {c.status === 'in-progress' && c.progress !== undefined && (
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${c.progress * 100}%`, backgroundColor: c.accent }]} />
                    </View>
                    <Text style={s.progressText}>{Math.round(c.progress * 100)}% complete</Text>
                  </View>
                )}
                {c.status !== 'in-progress' && <View style={{ flex: 1 }} />}
                <TouchableOpacity
                  style={[s.statusBtn, { backgroundColor: status.bg }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name={status.icon} size={14} color={status.color} />
                  <Text style={[s.statusBtnText, { color: status.color }]}>{status.label}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#4C1D95',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  headerIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  searchWrap:  { backgroundColor: '#4C1D95', paddingHorizontal: 16, paddingBottom: 14 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: '#111827' },

  statStrip: { marginHorizontal: 16, marginTop: -14, marginBottom: 12, padding: 14, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  statCell:  { flex: 1, alignItems: 'center' },
  statDiv:   { width: 1, backgroundColor: '#F3F4F6' },
  statValue: { fontSize: 19, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '600' },

  filterScroll:  { maxHeight: 44, backgroundColor: '#F9FAFB' },
  filterContent: { paddingHorizontal: 16, paddingVertical: 6, gap: 8, alignItems: 'center' },
  filterChip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  filterChipActive:  { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterText:        { fontSize: 11, fontWeight: '700', color: '#374151' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#F3F4F6',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTop:     { flexDirection: 'row', gap: 12 },
  cardLogo:    { width: 56, height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle:   { fontSize: 14, fontWeight: '800', color: '#111827' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5, flexWrap: 'wrap' },
  levelChip:        { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  levelChipText:    { fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  metaCell:         { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText:         { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  enrolled:         { fontSize: 11, color: '#9CA3AF', marginTop: 6 },

  cardBottom:    { marginTop: 12, flexDirection: 'row', alignItems: 'center' },
  progressTrack: { height: 5, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 3 },
  progressText:  { fontSize: 10, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  statusBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  statusBtnText: { fontSize: 11, fontWeight: '800' },

  empty:      { alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 12 },
  emptySub:   { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
