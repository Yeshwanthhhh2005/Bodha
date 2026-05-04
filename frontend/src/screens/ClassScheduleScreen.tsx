import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
  const activeIcon  = techList.find((t) => t.name === activeTech)?.icon ?? '📚';
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
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* ── Header ────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={{ width: 30 }} />
        <View style={s.headerCenter}>
          <View style={s.headerIconBox}><Text style={{ fontSize: 18 }}>📅</Text></View>
          <View>
            <Text style={s.headerTitle}>Class Schedule</Text>
            <Text style={s.headerSub}>Your weekly schedule. One class per day.</Text>
          </View>
        </View>
        <View style={{ width: 30 }} />
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
                    <Text style={{ fontSize: 18 }}>{tech.icon}</Text>
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
              <Text style={{ fontSize: 32 }}>{activeIcon}</Text>
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
                <Text style={{ fontSize: 13 }}>📅</Text>
                <Text style={s.datePillText}>{formatDateRange(weekStart)}</Text>
                <Text style={s.datePillChevron}>▾</Text>
              </View>
              <View style={s.navArrows}>
                <TouchableOpacity style={s.arrowBtn} onPress={() => setWeekOffset((o) => o - 1)}>
                  <Text style={s.arrowText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.arrowBtn} onPress={() => setWeekOffset((o) => o + 1)}>
                  <Text style={s.arrowText}>›</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={s.colHeader}>
            <Text style={[s.colHText, { width: COL_DAY }]}>Day</Text>
            <Text style={[s.colHText, { width: COL_TIME }]}>Time</Text>
            <Text style={[s.colHText, { flex: 1 }]}>Topics / Content</Text>
            <Text style={[s.colHText, { width: COL_STATUS, textAlign: 'right' }]}>Status</Text>
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
                  idx % 2 !== 0 && s.rowAlt,
                  isToday && s.rowToday,
                  idx === WEEK_DAYS.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                {/* Day */}
                <View style={{ width: COL_DAY }}>
                  <Text style={[s.dayName, isToday && s.dayNameToday]}>{dayName.slice(0, 3)}</Text>
                  <Text style={s.dayDate}>{dayDate.getDate()} {MONTHS[dayDate.getMonth()]}</Text>
                  {hasClass && <Text style={s.calIcon}>📅</Text>}
                </View>

                {/* Time */}
                <View style={{ width: COL_TIME, paddingTop: 1 }}>
                  {hasClass ? (
                    <View style={s.timeCell}>
                      <Text style={s.clockIcon}>🕐</Text>
                      <Text style={s.timeLine}>{DAY_TIME[dayName]}</Text>
                    </View>
                  ) : (
                    <Text style={s.dash}>—</Text>
                  )}
                </View>

                {/* Topic */}
                <View style={{ flex: 1, paddingRight: 6 }}>
                  {isThursday ? (
                    <View style={s.holidayCell}>
                      <Text style={s.holidayPalm}>🌴</Text>
                      <View>
                        <Text style={s.holidayTitle}>Holiday</Text>
                        <Text style={s.holidaySub}>No Class</Text>
                      </View>
                    </View>
                  ) : hasClass ? (
                    <>
                      <Text style={s.topicTitle}>{entry!.topic}</Text>
                      {bullets.map((b, i) => <Text key={i} style={s.bullet}>• {b}</Text>)}
                      <View style={s.notesRow}>
                        <Text style={s.notesIcon}>📄</Text>
                        <Text style={s.notesText}>Notes after class</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={s.noClass}>No class scheduled</Text>
                  )}
                </View>

                {/* Status */}
                <View style={{ width: COL_STATUS, alignItems: 'flex-end', gap: 5 }}>
                  {isThursday || !hasClass ? (
                    <Text style={s.dash}>—</Text>
                  ) : isToday ? (
                    <>
                      <View style={s.liveBadge}><Text style={s.liveBadgeText}>Live Today</Text></View>
                      <TouchableOpacity style={s.joinBtn} onPress={() => navigation.navigate('LiveSessions')} activeOpacity={0.8}>
                        <Text style={s.joinBtnText}>📹 Join Live</Text>
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
          <View style={s.notesIconBox}><Text style={{ fontSize: 26 }}>📋</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.notesCardTitle}>Notes & Mini Assignments</Text>
            <Text style={s.notesCardSub}>Notes and mini assignments will be released after each live class is completed.</Text>
          </View>
          <Text style={{ fontSize: 24, marginLeft: 8 }}>✏️</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const COL_DAY    = 58;
const COL_TIME   = 74;
const COL_STATUS = 86;

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F5F3FF' },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:        { backgroundColor: '#4C1D95', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  headerCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  headerIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub:     { fontSize: 11, color: '#C4B5FD', marginTop: 1 },

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

  weekCard:   { marginHorizontal: 18, marginBottom: 18, borderRadius: 18, backgroundColor: '#fff', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  weekHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  weekTitle:  { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 10 },
  weekNav:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  datePill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6 },
  datePillText:   { fontSize: 12, fontWeight: '600', color: '#374151' },
  datePillChevron:{ fontSize: 11, color: '#9CA3AF' },
  navArrows:  { flexDirection: 'row', gap: 6 },
  arrowBtn:   { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  arrowText:  { fontSize: 20, color: '#374151', lineHeight: 24 },

  colHeader:  { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  colHText:   { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.6 },
  row:        { flexDirection: 'row', paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'flex-start' },
  rowAlt:     { backgroundColor: '#FAFAFA' },
  rowToday:   { backgroundColor: '#F5F3FF' },

  dayName:     { fontSize: 14, fontWeight: '800', color: '#111827' },
  dayNameToday:{ color: '#7C3AED' },
  dayDate:     { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  calIcon:     { fontSize: 12, marginTop: 4 },

  timeCell:  { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  clockIcon: { fontSize: 12, marginTop: 1 },
  timeLine:  { fontSize: 11, fontWeight: '600', color: '#374151', lineHeight: 17 },
  dash:      { fontSize: 16, color: '#D1D5DB', fontWeight: '300' },

  topicTitle: { fontSize: 12, fontWeight: '800', color: '#111827', marginBottom: 4, lineHeight: 16 },
  bullet:     { fontSize: 11, color: '#6B7280', marginBottom: 2, lineHeight: 16 },
  notesRow:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  notesIcon:  { fontSize: 11 },
  notesText:  { fontSize: 10, color: '#B0B7C3', fontStyle: 'italic' },
  noClass:    { fontSize: 11, color: '#D1D5DB', fontStyle: 'italic' },

  holidayCell:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  holidayPalm:  { fontSize: 28 },
  holidayTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
  holidaySub:   { fontSize: 11, color: '#9CA3AF', marginTop: 1 },

  liveBadge:     { backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  liveBadgeText: { fontSize: 10, fontWeight: '700', color: '#EF4444', letterSpacing: 0.2 },
  joinBtn:       { backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  joinBtnText:   { fontSize: 10, fontWeight: '700', color: '#fff' },
  upcomingBadge: { backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  upcomingText:  { fontSize: 10, fontWeight: '700', color: '#059669' },
  twoHrBadge:    { backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  twoHrText:     { fontSize: 9, fontWeight: '700', color: '#D97706' },

  notesCard:     { marginHorizontal: 18, marginBottom: 8, backgroundColor: '#EDE9FE', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  notesIconBox:  { width: 52, height: 52, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  notesCardTitle:{ fontSize: 14, fontWeight: '800', color: '#4C1D95' },
  notesCardSub:  { fontSize: 12, color: '#7C3AED', marginTop: 3, lineHeight: 17 },
});
