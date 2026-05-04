import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { leaderboardAPI } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';

interface Challenge {
  _id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface Props { navigation?: { goBack?: () => void } }

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function ChallengesScreen({ navigation }: Props): React.ReactElement {
  const [list, setList] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debug, setDebug] = useState<string>('');

  const load = async () => {
    try {
      const res: any = await leaderboardAPI.getChallenges();
      const arr = Array.isArray(res) ? res : (res?.data ?? res?.data?.data ?? []);
      setList(Array.isArray(arr) ? arr : []);
      setDebug(`OK • ${Array.isArray(arr) ? arr.length : 0} item(s) • shape: ${typeof res} ${Array.isArray(res) ? '(array)' : (res?.data ? 'has .data' : 'no .data')}`);
    } catch (e: any) {
      setList([]);
      const msg = e?.message || e?.error || JSON.stringify(e).slice(0, 120);
      setDebug(`FAIL • ${msg}`);
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  useEffect(() => {
    let active = true;
    const setup = async () => {
      const sock = await connectSocket();
      if (!active) return;
      const handler = () => load();
      sock.on('challenges:updated', handler);
    };
    setup();
    return () => {
      active = false;
      const s = getSocket();
      s?.off('challenges:updated');
    };
  }, []);

  if (loading) {
    return <SafeAreaView style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerIconBox}>
            <Text style={{ fontSize: 18 }}>🎯</Text>
          </View>
          <View>
            <Text style={s.headerTitle}>Challenges</Text>
            <Text style={s.headerSub}>Complete tasks & earn team points!</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {!!debug && (
        <View style={s.debugBanner}>
          <Text style={s.debugText}>{debug}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#7C3AED" />}
      >
        {list.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>🎯</Text>
            <Text style={s.emptyTitle}>No challenges yet</Text>
            <Text style={s.emptySub}>New challenges will appear here when admins create them.</Text>
          </View>
        )}
        {list.map((c) => (
          <View key={c._id} style={[s.card, c.isActive && s.cardActive]}>
            <View style={s.cardHead}>
              <Text style={s.cardName}>{c.name}</Text>
              {c.isActive && <View style={s.activePill}><Text style={s.activeText}>ACTIVE</Text></View>}
            </View>
            <Text style={s.cardDate}>{fmt(c.startDate)} – {fmt(c.endDate)}</Text>
            {!!c.description && <Text style={s.cardDesc}>{c.description}</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#F9FAFB' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' },
  header:        { backgroundColor: '#4C1D95', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:       { padding: 4 },
  backIcon:      { fontSize: 22, color: '#fff', fontWeight: '600' },
  headerCenter:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerSub:     { fontSize: 11, color: '#C4B5FD', marginTop: 1 },
  card:        { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  cardActive:  { borderColor: '#C4B5FD', backgroundColor: '#F5F3FF' },
  cardHead:    { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardName:    { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  activePill:  { backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  activeText:  { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardDate:    { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  cardDesc:    { fontSize: 13, color: '#374151', marginTop: 8, lineHeight: 18 },
  emptyBox:    { alignItems: 'center', padding: 40 },
  emptyEmoji:  { fontSize: 48, marginBottom: 12 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: '#111827' },
  emptySub:    { fontSize: 13, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  debugBanner: { backgroundColor: '#FEF3C7', borderBottomWidth: 1, borderBottomColor: '#FDE68A', paddingHorizontal: 12, paddingVertical: 6 },
  debugText:   { fontSize: 11, color: '#92400E', fontFamily: 'monospace' },
});
