import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { puzzleAPI } from '../services/api';

interface PuzzleDetail {
  _id: string; title: string; hint?: string; explanation?: string;
  releaseDate: string; pointsAwarded: number; maxAttempts: number;
  myAttempts: number; isSolved: boolean; attemptsRemaining: number;
}
interface SubmitResult {
  isCorrect: boolean; pointsEarned: number; attemptsUsed: number;
  attemptsRemaining: number; correctAnswer?: string; explanation?: string;
}
interface LeaderEntry { rank: number; name: string; points: number; isMe: boolean; }
interface Props { navigation: any; route: { params: { puzzleId: string } } }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const AVATAR_COLORS = ['#FBBF24', '#F87171', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function MindTwisterScreen({ navigation, route }: Props) {
  const { puzzleId } = route.params;
  const [puzzle, setPuzzle]     = useState<PuzzleDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [answer, setAnswer]     = useState('');
  const [submitting, setSubmit] = useState(false);
  const [result, setResult]     = useState<SubmitResult | null>(null);
  const [leaders, setLeaders]   = useState<LeaderEntry[]>([]);
  const [myRank, setMyRank]     = useState(0);
  const [myPts, setMyPts]       = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, lRes] = await Promise.allSettled([
          puzzleAPI.getPuzzle(puzzleId),
          puzzleAPI.getLeaderboard(),
        ]);
        if (pRes.status === 'fulfilled') {
          const d = (pRes.value as any)?.data ?? (pRes.value as any);
          setPuzzle(d);
          if (d?.isSolved) setResult({ isCorrect: true, pointsEarned: d.pointsEarned ?? 0, attemptsUsed: d.myAttempts, attemptsRemaining: 0, explanation: d.explanation });
        }
        if (lRes.status === 'fulfilled') {
          const d = (lRes.value as any)?.data ?? (lRes.value as any);
          setLeaders(d?.leaderboard ?? []);
          setMyRank(d?.myRank ?? 0);
          setMyPts(d?.myProgress?.totalPoints ?? 0);
        }
      } catch { Alert.alert('Error', 'Could not load puzzle'); navigation.goBack(); }
      finally { setLoading(false); }
    })();
  }, [puzzleId]);

  const submit = async () => {
    if (!answer.trim()) return;
    setSubmit(true);
    try {
      const res: any = await puzzleAPI.submitAnswer(puzzleId, answer.trim());
      const data: SubmitResult = res?.data ?? res;
      setResult(data);
      setPuzzle(p => p ? { ...p, isSolved: data.isCorrect, myAttempts: data.attemptsUsed, attemptsRemaining: data.attemptsRemaining } : p);
    } catch (e: any) {
      Alert.alert('Oops', e?.message || 'Could not submit');
    } finally { setSubmit(false); }
  };

  if (loading) return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
    </SafeAreaView>
  );

  const done      = result?.isCorrect ?? false;
  const exhausted = !!(result && !result.isCorrect && result.attemptsRemaining === 0);
  const showInput = !done && !exhausted;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mind Twister</Text>
        <View style={s.streakPill}>
          <MaterialCommunityIcons name="fire" size={13} color="#F97316" />
          <Text style={s.streakNum}>12</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Main Puzzle Card ────────────────────────────── */}
        <View style={s.card}>
          {/* Date chip */}
          <View style={s.dateChip}>
            <Ionicons name="calendar" size={13} color="#7C3AED" />
            <Text style={s.dateChipText}>{puzzle ? fmtDate(puzzle.releaseDate) : ''}</Text>
          </View>

          {/* Question */}
          <Text style={s.question}>{puzzle?.title}</Text>

          {/* Big ? illustration */}
          <View style={s.illusWrap}>
            <View style={s.illusCircle}>
              <Text style={[s.spk, { top: 18, left: 16 }]}>✦</Text>
              <Text style={[s.spk, { top: 32, right: 22, fontSize: 10 }]}>✦</Text>
              <Text style={[s.spk, { bottom: 24, left: 28, fontSize: 9 }]}>✦</Text>
              <Text style={[s.spk, { bottom: 16, right: 30, fontSize: 11 }]}>✦</Text>
              <Text style={s.qMark}>?</Text>
              <View style={s.qDot} />
            </View>
            {/* Subtle shadow base */}
            <View style={s.illusShadow} />
          </View>

          {/* Result banner */}
          {result && (
            <View style={[s.resultBanner, done ? s.resultOk : s.resultBad]}>
              <Ionicons name={done ? 'checkmark-circle' : 'close-circle'} size={22} color={done ? '#059669' : '#DC2626'} />
              <View style={{ flex: 1 }}>
                <Text style={[s.resultTitle, { color: done ? '#059669' : '#DC2626' }]}>
                  {done ? `Correct! +${result.pointsEarned} pts` : exhausted ? 'Out of attempts' : 'Wrong, try again'}
                </Text>
                {result.correctAnswer && <Text style={s.resultAns}>Answer: <Text style={{ fontWeight: '800' }}>{result.correctAnswer}</Text></Text>}
                {result.explanation ? <Text style={s.resultExp}>{result.explanation}</Text> : null}
              </View>
            </View>
          )}

          {/* Hint */}
          {puzzle?.hint && showInput && (
            <View style={s.hintCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MaterialCommunityIcons name="lightbulb-on" size={15} color="#F59E0B" />
                <Text style={s.hintLabel}>Hint</Text>
              </View>
              <Text style={s.hintTxt}>{puzzle.hint}</Text>
            </View>
          )}

          {/* Answer Input */}
          {showInput && (
            <>
              <TextInput
                style={s.input}
                placeholder="Type your answer here..."
                placeholderTextColor="#9CA3AF"
                value={answer}
                onChangeText={setAnswer}
                editable={!submitting}
              />
              {puzzle && puzzle.maxAttempts > 1 && (
                <Text style={s.attNote}>
                  {puzzle.attemptsRemaining} attempt{puzzle.attemptsRemaining !== 1 ? 's' : ''} remaining
                </Text>
              )}
              <TouchableOpacity
                style={[s.submitBtn, (!answer.trim() || submitting) && s.submitOff]}
                activeOpacity={0.85}
                onPress={submit}
                disabled={!answer.trim() || submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.submitTxt}>Submit Answer</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── How It Works ─────────────────────────────────── */}
        <View style={s.howSection}>
          <View style={s.howDivider}>
            <View style={s.howDash} />
            <Text style={s.howDivTxt}>How It Works</Text>
            <View style={s.howDash} />
          </View>

          {[
            { icon: 'calendar-outline' as const, lib: 'ion' as const, title: 'One Puzzle Everyday', desc: 'A new Mind Twister is released\nevery day at 12:00 AM.' },
            { icon: 'thought-bubble-outline' as const, lib: 'mci' as const, title: 'Think & Solve', desc: 'Use your logic and creativity\nto find the answer.' },
            { icon: 'shield-checkmark-outline' as const, lib: 'ion' as const, title: 'Earn Points', desc: 'Solve daily and build your streak\nto earn more points.' },
          ].map(item => (
            <View key={item.title} style={s.howRow}>
              <View style={s.howIcon}>
                {item.lib === 'ion'
                  ? <Ionicons name={item.icon as any} size={22} color="#7C3AED" />
                  : <MaterialCommunityIcons name={item.icon as any} size={22} color="#7C3AED" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.howTitle}>{item.title}</Text>
                <Text style={s.howDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Top Solvers ──────────────────────────────────── */}
        {leaders.length > 0 && (
          <View style={s.lbCard}>
            <View style={s.lbHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trophy" size={16} color="#F59E0B" />
                <Text style={s.lbTitle}>Top Solvers</Text>
              </View>
              <View style={s.monthPill}>
                <Text style={s.monthTxt}>This Month</Text>
                <Ionicons name="chevron-down" size={11} color="#6B7280" />
              </View>
            </View>

            {leaders.slice(0, 3).map(l => (
              <View key={l.rank} style={s.lbRow}>
                <Text style={[s.lbRank, l.rank <= 3 && s.lbRankTop]}>{l.rank}</Text>
                <View style={[s.lbAvatar, { backgroundColor: avatarColor(l.name) }]}>
                  <Text style={s.lbAvatarTxt}>{l.name[0]}</Text>
                </View>
                <Text style={s.lbName}>{l.isMe ? 'You' : l.name}</Text>
                <Text style={s.lbPts}>{l.points} Pts</Text>
              </View>
            ))}

            {myRank > 3 && (
              <View style={[s.lbRow, s.lbMeRow]}>
                <Text style={s.lbRank}>{myRank}</Text>
                <View style={[s.lbAvatar, { backgroundColor: '#7C3AED' }]}>
                  <Text style={[s.lbAvatarTxt, { color: '#fff' }]}>Y</Text>
                </View>
                <Text style={[s.lbName, s.lbNameMe]}>You</Text>
                <Text style={s.lbPts}>{myPts} Pts</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:     { width: 36, height: 36, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111827', marginRight: 36 },
  streakPill:  { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  streakNum:   { fontSize: 12, fontWeight: '800', color: '#92400E' },

  /* Main Card */
  card: {
    marginHorizontal: 16, marginTop: 16, marginBottom: 18,
    backgroundColor: '#fff', borderRadius: 18, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },

  /* Date chip */
  dateChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5F3FF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 22,
  },
  dateChipText: { fontSize: 12, fontWeight: '700', color: '#7C3AED' },

  /* Question */
  question: {
    fontSize: 22, fontWeight: '900', color: '#111827',
    textAlign: 'center', lineHeight: 30, paddingHorizontal: 4,
  },

  /* ? Illustration */
  illusWrap:   { alignItems: 'center', paddingVertical: 26 },
  illusCircle: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  illusShadow: {
    position: 'absolute', bottom: 22, width: 100, height: 8,
    borderRadius: 50, backgroundColor: 'rgba(167,139,250,0.18)',
  },
  spk:    { position: 'absolute', color: '#C4B5FD', fontSize: 12, fontWeight: '900' },
  qMark:  { fontSize: 110, fontWeight: '900', color: '#7C3AED', lineHeight: 124, marginTop: -8 },
  qDot:   { width: 18, height: 18, borderRadius: 9, backgroundColor: '#7C3AED', marginTop: 4 },

  /* Result */
  resultBanner: { borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  resultOk:     { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  resultBad:    { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  resultTitle:  { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  resultAns:    { fontSize: 12, color: '#374151' },
  resultExp:    { fontSize: 11, color: '#6B7280', marginTop: 3, lineHeight: 16 },

  /* Hint */
  hintCard: {
    backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14, marginBottom: 12,
  },
  hintLabel:{ fontSize: 13, fontWeight: '800', color: '#7C3AED' },
  hintTxt:  { fontSize: 13, color: '#4C1D95', lineHeight: 19 },

  /* Input */
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 14,
    color: '#111827', backgroundColor: '#fff', marginBottom: 6,
  },
  attNote:   { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 10 },
  submitBtn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  submitOff: { backgroundColor: '#C4B5FD' },
  submitTxt: { fontSize: 15, fontWeight: '800', color: '#fff' },

  /* How It Works */
  howSection: { marginHorizontal: 16, marginBottom: 18 },
  howDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 22 },
  howDash:    { flex: 1, height: 1, backgroundColor: '#C4B5FD', borderStyle: 'dashed', borderWidth: 0.5, borderColor: '#A78BFA' },
  howDivTxt:  { fontSize: 13, fontWeight: '700', color: '#111827' },
  howRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  howIcon:    { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  howTitle:   { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 3 },
  howDesc:    { fontSize: 12, color: '#6B7280', lineHeight: 17 },

  /* Leaderboard */
  lbCard: {
    marginHorizontal: 16, marginBottom: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  lbHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  lbTitle:    { fontSize: 15, fontWeight: '800', color: '#111827' },
  monthPill:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  monthTxt:   { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  lbRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  lbMeRow:    { backgroundColor: '#F5F3FF', borderRadius: 10, paddingHorizontal: 8, borderBottomWidth: 0, marginTop: 6 },
  lbRank:     { fontSize: 13, fontWeight: '800', color: '#9CA3AF', width: 20 },
  lbRankTop:  { color: '#F59E0B' },
  lbAvatar:   { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  lbAvatarTxt:{ fontSize: 13, fontWeight: '800', color: '#fff' },
  lbName:     { flex: 1, fontSize: 13, fontWeight: '700', color: '#111827' },
  lbNameMe:   { color: '#7C3AED', fontWeight: '800' },
  lbPts:      { fontSize: 13, fontWeight: '800', color: '#7C3AED' },
});
