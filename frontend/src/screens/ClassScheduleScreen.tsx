import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { classScheduleAPI, courseConfigAPI } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ScheduleEntry {
  _id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  technology: string;
  topic: string;
  content: string;
}

interface TechItem { name: string; icon: string; }

interface CourseConfig {
  currentTechnology: string;
  startDate:         string | null;
  totalClasses:      number;
  completedClasses:  number;
  techList:          TechItem[];
}

// ─── Fixed timings (NPT-004 spec) ─────────────────────────────────────────────
const DAY_TIME: Record<string, string> = {
  Monday: '7:00 PM –\n8:00 PM', Tuesday: '7:00 PM –\n8:00 PM',
  Wednesday: '7:00 PM –\n8:00 PM', Thursday: '',
  Friday: '7:00 PM –\n8:00 PM', Saturday: '7:00 PM –\n9:00 PM',
  Sunday: '3:00 PM –\n5:00 PM',
};

const LONG_CLASS_DAYS = new Set(['Saturday', 'Sunday']);
const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getMondayOf(d: Date): Date {
  const r = new Date(d);
  const dow = r.getDay();
  r.setDate(r.getDate() - (dow === 0 ? 6 : dow - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}

function formatDateRange(ws: Date): string {
  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  return `${ws.getDate()} ${MONTHS[ws.getMonth()]} – ${we.getDate()} ${MONTHS[we.getMonth()]} ${we.getFullYear()}`;
}

function getTodayName(): string {
  const dow = new Date().getDay();
  return WEEK_DAYS[dow === 0 ? 6 : dow - 1];
}

function getDateForDay(weekStart: Date, dayName: string): Date {
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + WEEK_DAYS.indexOf(dayName));
  return d;
}

function fmtStartDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Tech name → vector icon (renders <MaterialCommunityIcons>) ──────────────
type TechIconSpec =
  | { kind: 'mci'; name: React.ComponentProps<typeof MaterialCommunityIcons>['name']; color: string }
  | { kind: 'ion'; name: React.ComponentProps<typeof Ionicons>['name']; color: string };

const TECH_ICON_MAP: { match: RegExp; spec: TechIconSpec }[] = [
  { match: /\bjava(?!script)/i,             spec: { kind: 'mci', name: 'language-java',       color: '#EA2D2E' } },
  { match: /\bpython\b|\bpy\b/i,            spec: { kind: 'mci', name: 'language-python',     color: '#3B82F6' } },
  { match: /\bc\+\+|\bcpp\b/i,              spec: { kind: 'mci', name: 'language-cpp',        color: '#0284C7' } },
  { match: /\bc#|\bcsharp\b/i,              spec: { kind: 'mci', name: 'language-csharp',     color: '#7C3AED' } },
  { match: /^\s*c(\s|$)|\bclang\b/i,        spec: { kind: 'mci', name: 'language-c',          color: '#0EA5E9' } },
  { match: /\btypescript\b|\bts\b/i,        spec: { kind: 'mci', name: 'language-typescript', color: '#2563EB' } },
  { match: /\bjavascript\b|\bjs\b/i,        spec: { kind: 'mci', name: 'language-javascript', color: '#EAB308' } },
  { match: /\breact\b/i,                    spec: { kind: 'mci', name: 'react',               color: '#06B6D4' } },
  { match: /\bnode/i,                       spec: { kind: 'mci', name: 'nodejs',              color: '#10B981' } },
  { match: /\bhtml/i,                       spec: { kind: 'mci', name: 'language-html5',      color: '#F97316' } },
  { match: /\bcss/i,                        spec: { kind: 'mci', name: 'language-css3',       color: '#2563EB' } },
  { match: /\bgo\b|\bgolang\b/i,            spec: { kind: 'mci', name: 'language-go',         color: '#06B6D4' } },
  { match: /\bphp\b/i,                      spec: { kind: 'mci', name: 'language-php',        color: '#6366F1' } },
  { match: /\bruby\b/i,                     spec: { kind: 'mci', name: 'language-ruby',       color: '#DC2626' } },
  { match: /\bswift\b/i,                    spec: { kind: 'mci', name: 'language-swift',      color: '#F97316' } },
  { match: /\bkotlin\b/i,                   spec: { kind: 'mci', name: 'language-kotlin',     color: '#A855F7' } },
  { match: /\brust\b/i,                     spec: { kind: 'mci', name: 'language-rust',       color: '#B45309' } },
  { match: /\b(sql|database|dbms|mongo|postgres|mysql)\b/i, spec: { kind: 'mci', name: 'database', color: '#059669' } },
  { match: /\b(data\s*structure|algorithm|dsa)\b/i,         spec: { kind: 'mci', name: 'sitemap',  color: '#7C3AED' } },
  { match: /\b(ai|machine|ml|deep)\b/i,     spec: { kind: 'mci', name: 'brain',               color: '#7C3AED' } },
  { match: /\b(network|networking)\b/i,     spec: { kind: 'ion', name: 'globe-outline',       color: '#3B82F6' } },
  { match: /\b(security|cyber)\b/i,         spec: { kind: 'mci', name: 'shield-account',      color: '#EC4899' } },
];

const renderTechIcon = (
  techName: string,
  size: number,
  fallbackColor = '#7C3AED',
): React.ReactElement => {
  const found = TECH_ICON_MAP.find((m) => m.match.test(techName));
  if (!found) {
    return <MaterialCommunityIcons name="book-open-variant" size={size} color={fallbackColor} />;
  }
  const { spec } = found;
  return spec.kind === 'mci'
    ? <MaterialCommunityIcons name={spec.name} size={size} color={spec.color} />
    : <Ionicons name={spec.name} size={size} color={spec.color} />;
};

// ─── Arc progress ring ────────────────────────────────────────────────────────
const ArcProgress: React.FC<{ pct: number; total: number; done: number }> = ({ pct, total, done }) => {
  const angle = (pct / 100) * 360;
  return (
    <View style={arc.wrap}>
      <View style={[arc.ring, {
        borderTopColor:    angle > 0   ? '#14B8A6' : 'rgba(255,255,255,0.2)',
        borderRightColor:  angle > 90  ? '#14B8A6' : 'rgba(255,255,255,0.2)',
        borderBottomColor: angle > 180 ? '#14B8A6' : 'rgba(255,255,255,0.2)',
        borderLeftColor:   angle > 270 ? '#14B8A6' : 'rgba(255,255,255,0.2)',
      }]}>
        <Text style={arc.pct}>{pct}%</Text>
      </View>
      <Text style={arc.sub}>{done} / {total} Classes Completed</Text>
    </View>
  );
};
const arc = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  ring: { width: 68, height: 68, borderRadius: 34, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  pct:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  sub:  { fontSize: 10, color: 'rgba(255,255,255,0.75)', textAlign: 'center', fontWeight: '500', maxWidth: 90 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
interface Props { navigation: any }

export default function ClassScheduleScreen({ navigation }: Props) {
  const [entries,    setEntries]    = useState<ScheduleEntry[]>([]);
  const [config,     setConfig]     = useState<CourseConfig | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeTech, setActiveTech] = useState<string>('');

  const today     = new Date();
  const todayName = getTodayName();
  const monday    = getMondayOf(today);
  const weekStart = new Date(monday);
  weekStart.setDate(monday.getDate() + weekOffset * 7);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [entriesRes, configRes] = await Promise.all([
        classScheduleAPI.getAll() as any,
        courseConfigAPI.getConfig() as any,
      ]);
      const list: ScheduleEntry[] = Array.isArray(entriesRes) ? entriesRes : (entriesRes?.data ?? []);
      const cfg: CourseConfig     = configRes?.data ?? configRes;
      setEntries(list);
      setConfig(cfg);
      // Active tab: prefer admin-set currentTechnology, fall back to first entry's tech
      const preferred = cfg?.currentTechnology || list[0]?.technology || '';
      setActiveTech((prev) => prev || preferred);
    } catch { /* silent — show empty state */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { fetchAll(); }, [fetchAll]));

  useEffect(() => {
    let active = true;
    const setup = async () => {
      const sock = await connectSocket();
      if (!active) return;
      const handler = () => fetchAll(true);
      sock.on('class-schedule:updated', handler);
      sock.on('course-config:updated', handler);
    };
    setup();
    return () => {
      active = false;
      const s = getSocket();
      s?.off('class-schedule:updated');
      s?.off('course-config:updated');
    };
  }, [fetchAll]);

  const techList    = config?.techList ?? [];
  const totalCls    = config?.totalClasses    ?? 0;
  const doneCls     = config?.completedClasses ?? 0;
  const progressPct = totalCls > 0 ? Math.round((doneCls / totalCls) * 100) : 0;
  const startLabel  = fmtStartDate(config?.startDate ?? null);
  const entryByDay  = Object.fromEntries(entries.map((e) => [e.day, e]));

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ────────────────────────────────────────── */}
      <View style={s.header}>
        {navigation?.canGoBack?.() && (
          <TouchableOpacity
            style={s.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={22} color="#111827" />
          </TouchableOpacity>
        )}
        <View style={s.headerIconBox}>
          <Ionicons name="calendar" size={22} color="#7C3AED" />
        </View>
        <View style={s.headerTextWrap}>
          <Text style={s.headerTitle}>Class Schedule</Text>
          <Text style={s.headerSub}>Your weekly schedule. One class per day.</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingTop: 10 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(true); }} tintColor="#7C3AED" />
        }
      >

        {/* ── Technology Tabs (from admin-managed tech list) ─ */}
        {techList.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabsScroll} contentContainerStyle={s.tabsContent}>
            {techList.map((tech) => {
              const isActive = tech.name === activeTech;
              return (
                <TouchableOpacity
                  key={tech.name}
                  style={[s.tab, isActive && s.tabActive]}
                  onPress={() => setActiveTech(tech.name)}
                  activeOpacity={0.75}
                >
                  <View style={[s.tabIconBox, isActive && s.tabIconBoxActive]}>
                    {renderTechIcon(tech.name, 18)}
                  </View>
                  <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{tech.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Progress Card ─────────────────────────────────── */}
        <View style={s.progressCard}>
          <View style={s.progLeft}>
            <View style={s.progLogoBox}>
              {renderTechIcon(activeTech, 36, '#FFFFFF')}
            </View>
            <View style={s.progMeta}>
              <Text style={s.progLabel}>Current Technology</Text>
              <View style={s.progTitleRow}>
                <Text style={s.progName}>{activeTech || '—'}</Text>
                <View style={s.inProgressBadge}><Text style={s.inProgressText}>In Progress</Text></View>
              </View>
              {startLabel !== '' && (
                <Text style={s.progStarted}>Started on {startLabel}</Text>
              )}
            </View>
          </View>
          <View style={s.progRight}>
            <Text style={s.progRightLabel}>Progress</Text>
            <ArcProgress pct={progressPct} total={totalCls} done={doneCls} />
          </View>
        </View>

        {/* ── This Week's Schedule ──────────────────────────── */}
        <View style={s.weekCard}>
          <View style={s.weekHeader}>
            <Text style={s.weekTitle}>This Week's Schedule</Text>
            <View style={s.weekNav}>
              <View style={s.datePill}>
                <Ionicons name="calendar-outline" size={13} color="#7C3AED" />
                <Text style={s.datePillText} numberOfLines={1}>{formatDateRange(weekStart)}</Text>
                <Ionicons name="chevron-down" size={11} color="#9CA3AF" />
              </View>
              <TouchableOpacity style={s.arrowBtn} onPress={() => setWeekOffset((o) => o - 1)}>
                <Ionicons name="chevron-back" size={16} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity style={s.arrowBtn} onPress={() => setWeekOffset((o) => o + 1)}>
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.colHeader}>
            <View style={[s.colHCell, { width: COL_DAY }]}>
              <Text style={s.colHText}>Day</Text>
            </View>
            <View style={[s.colHCell, { width: COL_TIME }]}>
              <Text style={s.colHText}>Time</Text>
            </View>
            <View style={[s.colHCell, { flex: 1 }]}>
              <Text style={s.colHText}>Topics / Content</Text>
            </View>
            <View style={[s.colHCell, s.colHCellLast, { width: COL_STATUS }]}>
              <Text style={s.colHText}>Status</Text>
            </View>
          </View>

          {WEEK_DAYS.map((dayName, idx) => {
            const isThursday = dayName === 'Thursday';
            const isToday    = dayName === todayName && weekOffset === 0;
            const entry      = entryByDay[dayName] as ScheduleEntry | undefined;
            const hasClass   = !isThursday && !!entry;
            const isLong     = LONG_CLASS_DAYS.has(dayName) && hasClass;
            const dayDate    = getDateForDay(weekStart, dayName);
            const bullets    = hasClass && entry.content
              ? entry.content.split('\n').filter(Boolean).map((l) => l.replace(/^[•\-]\s*/, ''))
              : [];

            return (
              <View
                key={dayName}
                style={[
                  s.row,
                  isToday && s.rowToday,
                  isThursday && s.rowHoliday,
                  idx === WEEK_DAYS.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                {/* Day */}
                <View style={[s.cell, s.dayCell, { width: COL_DAY }]}>
                  <Text
                    style={[s.dayName, isToday && s.dayNameToday]}
                    numberOfLines={1}
                    allowFontScaling={false}
                  >
                    {dayName.slice(0, 3)}
                  </Text>
                  <Text style={s.dayDate} numberOfLines={1} allowFontScaling={false}>
                    {dayDate.getDate()} {MONTHS[dayDate.getMonth()]}
                  </Text>
                  {hasClass && (
                    <Ionicons name="calendar-outline" size={13} color="#9CA3AF" style={{ marginTop: 10 }} />
                  )}
                </View>

                {/* Time */}
                <View style={[s.cell, { width: COL_TIME }]}>
                  {hasClass ? (
                    <View style={s.timeCell}>
                      <Ionicons name="time-outline" size={13} color="#6B7280" style={{ marginTop: 1 }} />
                      <Text style={s.timeLine}>{DAY_TIME[dayName]}</Text>
                    </View>
                  ) : (
                    <Text style={s.dash}>—</Text>
                  )}
                </View>

                {/* Topic */}
                <View style={[s.cell, { flex: 1 }, isThursday && s.topicCellHoliday]}>
                  {isThursday ? (
                    <View style={s.holidayCell}>
                      <MaterialCommunityIcons name="palm-tree" size={32} color="#F59E0B" />
                      <View>
                        <Text style={s.holidayTitle}>Holiday</Text>
                        <Text style={s.holidaySub}>No Class</Text>
                      </View>
                    </View>
                  ) : hasClass ? (
                    <>
                      <Text style={s.topicTitle}>{entry!.topic}</Text>
                      <View style={{ marginTop: 2 }}>
                        {bullets.map((b, i) => (
                          <View key={i} style={s.bulletRow}>
                            <Text style={s.bulletDot}>•</Text>
                            <Text style={s.bulletText}>{b}</Text>
                          </View>
                        ))}
                      </View>
                      <View style={s.notesRow}>
                        <Ionicons name="document-text-outline" size={13} color="#B0B7C3" />
                        <Text style={s.notesText}>Notes after class</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={s.noClass}>No class scheduled</Text>
                  )}
                </View>

                {/* Status */}
                <View style={[s.cell, s.cellLast, s.statusCell, { width: COL_STATUS }]}>
                  {isThursday || !hasClass ? (
                    <Text style={s.dash}>—</Text>
                  ) : isToday ? (
                    <>
                      <View style={s.liveBadge}><Text style={s.liveBadgeText}>Live Today</Text></View>
                      <TouchableOpacity style={s.joinBtn} onPress={() => navigation.navigate('LiveSessionsRoot')} activeOpacity={0.8}>
                        <Ionicons name="videocam" size={12} color="#7C3AED" style={{ marginRight: 4 }} />
                        <Text style={s.joinBtnText}>Join Live</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={s.upcomingBadge}><Text style={s.upcomingText}>Upcoming</Text></View>
                      {isLong && <View style={s.twoHrBadge}><Text style={s.twoHrText}>2 Hour Class</Text></View>}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Notes Card ───────────────────────────────────── */}
        <View style={s.notesCard}>
          <View style={s.notesIconBox}>
            <MaterialCommunityIcons name="clipboard-text-outline" size={26} color="#7C3AED" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.notesCardTitle}>Notes & Mini Assignments</Text>
            <Text style={s.notesCardSub}>Notes and mini assignments will be released after each live class is completed.</Text>
          </View>
          <MaterialCommunityIcons name="pencil" size={24} color="#7C3AED" style={{ marginLeft: 8 }} />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const COL_DAY    = 64;
const COL_TIME   = 78;
const COL_STATUS = 90;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F9FAFB' },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:        { backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerBackBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  headerIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  headerTextWrap:{ flex: 1 },
  headerTitle:   { fontSize: 19, fontWeight: '800', color: '#111827' },
  headerSub:     { fontSize: 12, color: '#6B7280', marginTop: 2 },

  tabsScroll:      { marginBottom: 14 },
  tabsContent:     { paddingHorizontal: 18, gap: 10 },
  tab:             { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#fff' },
  tabActive:       { borderColor: '#7C3AED', backgroundColor: '#F5F3FF' },
  tabIconBox:      { width: 28, height: 28, borderRadius: 6, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  tabIconBoxActive:{ backgroundColor: '#EDE9FE' },
  tabLabel:        { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabLabelActive:  { color: '#7C3AED' },

  progressCard:   { marginHorizontal: 18, marginBottom: 18, borderRadius: 18, backgroundColor: '#4C1D95', padding: 18, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  progLeft:       { flexDirection: 'row', alignItems: 'flex-start', flex: 1, gap: 14 },
  progLogoBox:    { width: 60, height: 60, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  progMeta:       { flex: 1, justifyContent: 'center', gap: 4 },
  progLabel:      { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '500', letterSpacing: 0.3 },
  progTitleRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  progName:       { fontSize: 22, fontWeight: '800', color: '#fff' },
  inProgressBadge:{ backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  inProgressText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  progStarted:    { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  progRight:      { alignItems: 'center', gap: 6, paddingLeft: 10 },
  progRightLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },

  weekCard:   { marginHorizontal: 12, marginBottom: 18, borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  weekHeader: { flexDirection: 'column', alignItems: 'stretch', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', gap: 12 },
  weekTitle:  { fontSize: 16, fontWeight: '800', color: '#111827', letterSpacing: 0.1 },
  weekNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  datePill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, flex: 1 },
  datePillText: { fontSize: 12, fontWeight: '600', color: '#374151', flex: 1 },
  arrowBtn:   { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  colHeader:   { flexDirection: 'row', backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  colHCell:    { paddingVertical: 12, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
  colHCellLast:{ borderRightWidth: 0 },
  colHText:    { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.3 },

  row:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', alignItems: 'stretch', minHeight: 124 },
  rowToday:    { backgroundColor: '#FAF7FF' },
  cell:        { paddingVertical: 22, paddingHorizontal: 10, borderRightWidth: 1, borderRightColor: '#E5E7EB', justifyContent: 'flex-start' },
  cellLast:    { borderRightWidth: 0 },
  dayCell:         { alignItems: 'flex-start', paddingHorizontal: 10 },
  statusCell:      { alignItems: 'flex-end', gap: 10, justifyContent: 'flex-start', paddingHorizontal: 8 },
  topicCellHoliday:{ justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' },
  rowHoliday:      { backgroundColor: '#FAFAFA' },

  dayName:     { fontSize: 14, fontWeight: '800', color: '#111827', lineHeight: 18 },
  dayNameToday:{ color: '#7C3AED' },
  dayDate:     { fontSize: 11, color: '#9CA3AF', marginTop: 5, fontWeight: '500' },
  calIcon:     { fontSize: 13, marginTop: 12 },

  timeCell:  { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  clockIcon: { fontSize: 12, marginTop: 1 },
  timeLine:  { fontSize: 11, fontWeight: '500', color: '#6B7280', lineHeight: 17 },
  dash:      { fontSize: 16, color: '#D1D5DB', fontWeight: '300' },

  topicTitle:  { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 8, lineHeight: 18 },
  bulletRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 5 },
  bulletDot:   { fontSize: 11, color: '#6B7280', lineHeight: 17, marginRight: 6, width: 6 },
  bulletText:  { flex: 1, fontSize: 11, color: '#4B5563', lineHeight: 17 },
  notesRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 },
  notesIcon:   { fontSize: 13 },
  notesText:   { fontSize: 10, color: '#B0B7C3', fontStyle: 'italic' },
  noClass:     { fontSize: 11, color: '#D1D5DB', fontStyle: 'italic' },

  holidayCell:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  holidayPalm:  { fontSize: 32 },
  holidayTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  holidaySub:   { fontSize: 11, color: '#9CA3AF', marginTop: 2 },

  liveBadge:     { backgroundColor: '#FEE2E2', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: '#EF4444', letterSpacing: 0.2 },
  joinBtn:       { backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#7C3AED' },
  joinBtnText:   { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  upcomingBadge: { backgroundColor: '#ECFDF5', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  upcomingText:  { fontSize: 10, fontWeight: '700', color: '#059669' },
  twoHrBadge:    { backgroundColor: '#F5F3FF', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: '#DDD6FE' },
  twoHrText:     { fontSize: 9, fontWeight: '700', color: '#7C3AED' },

  notesCard:     { marginHorizontal: 18, marginBottom: 8, backgroundColor: '#EDE9FE', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  notesIconBox:  { width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  notesCardTitle:{ fontSize: 14, fontWeight: '800', color: '#4C1D95' },
  notesCardSub:  { fontSize: 12, color: '#7C3AED', marginTop: 3, lineHeight: 17 },
});
