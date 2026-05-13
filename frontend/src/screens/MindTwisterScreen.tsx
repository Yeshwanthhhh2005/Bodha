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
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
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

  const done       = result?.isCorrect ?? false;
  const exhausted  = !!(result && !result.isCorrect && result.attemptsRemaining === 0);
  const showInput  = !done && !exhausted;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mind Twister</Text>
        <View style={s.streakPill}>
          <MaterialCommunityIcons name="fire" size={14} color="#F97316" />
          <Text style={s.streakNum}>12</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 48 }}>

        {/* ── Date ───────────────────────────────────────────── */}
        <View style={s.dateRow}>
          <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
          <Text style={s.dateText}>{puzzle ? fmtDate(puzzle.releaseDate) : ''}</Text>
        </View>

        {/* ── Question ───────────────────────────────────────── */}
        <View style={s.questionBox}>
          <Text style={s.questionText}>{puzzle?.title}</Text>
        </View>

        {/* ── ? Illustration ─────────────────────────────────── */}
        <View style={s.illustrationWrap}>
          <View style={s.illustrationCircle}>
            {/* Sparkles */}
            <View style={[s.spark, { top: 12, left: 22 }]}><Text style={s.sparkTxt}>✦</Text></View>
            <View style={[s.spark, { top: 30, right: 16 }]}><Text style={[s.sparkTxt, { fontSize: 8 }]}>✦</Text></View>
            <View style={[s.spark, { bottom: 18, left: 30 }]}><Text style={[s.sparkTxt, { fontSize: 7 }]}>✦</Text></View>
            {/* The big ? */}
            <Text style={s.qMark}>?</Text>
            {/* Small dot below */}
            <View style={s.qDot} />
          </View>
        </View>

        {/* ── Result banner (shown after attempt) ────────────── */}
        {result && (
          <View style={[s.resultBanner, done ? s.resultSuccess : s.resultFail]}>
            <Ionicons name={done ? 'checkmark-circle' : 'close-circle'} size={26} color={done ? '#059669' : '#DC2626'} />
            <View style={{ flex: 1 }}>
              <Text style={[s.resultTitle, { color: done ? '#059669' : '#DC2626' }]}>
                {done ? `Correct! +${result.pointsEarned} pts` : exhausted ? 'Out of attempts' : 'Wrong, try again'}
              </Text>
              {result.correctAnswer && (
                <Text style={s.resultAnswer}>Answer: <Text style={{ fontWeight: '800' }}>{result.correctAnswer}</Text></Text>
              )}
              {result.explanation ? <Text style={s.resultExp}>{result.explanation}</Text> : null}
            </View>
          </View>
        )}

        {/* ── Hint ───────────────────────────────────────────── */}
        {puzzle?.hint && showInput && (
          <View style={s.hintCard}>
            <View style={s.hintRow}>
              <Text style={s.hintIcon}>💡</Text>
              <Text style={s.hintLabel}>Hint</Text>
            </View>
            <Text style={s.hintText}>{puzzle.hint}</Text>
          </View>
        )}

        {/* ── Answer Input ───────────────────────────────────── */}
        {showInput && (
          <View style={s.inputWrap}>
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
          </View>
        )}

        {/* ── How It Works ───────────────────────────────────── */}
        <View style={s.howSection}>
          <View style={s.howDivider}>
            <View style={s.howLine} />
            <Text style={s.howDivTxt}>How It Works</Text>
            <View style={s.howLine} />
          </View>
          {[
            { icon: 'calendar-outline' as const, title: 'One Puzzle Everyday', desc: 'A new Mind Twister is released every day at 12:00 AM.' },
            { icon: 'time-outline'     as const, title: 'Think & Solve',        desc: 'Use your logic and creativity to find the answer.' },
            { icon: 'location-outline' as const, title: 'Earn Points',          desc: 'Solve daily and build your streak to earn more points.' },
          ].map(item => (
            <View key={item.title} style={s.howRow}>
              <View style={s.howIconBox}>
                <Ionicons name={item.icon} size={22} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.howTitle}>{item.title}</Text>
                <Text style={s.howDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Top Solvers ────────────────────────────────────── */}
        {leaders.length > 0 && (
          <View style={s.lbSection}>
            <View style={s.lbHead}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="trophy" size={16} color="#F59E0B" />
                <Text style={s.lbTitle}>Top Solvers</Text>
              </View>
              <View style={s.monthPill}>
                <Text style={s.monthTxt}>This Month</Text>
                <Ionicons name="chevron-down" size={12} color="#6B7280" />
              </View>
            </View>

            {leaders.slice(0, 3).map(l => (
              <View key={l.rank} style={s.lbRow}>
                <Text style={[s.lbRank, l.rank <= 3 && s.lbRankGold]}>{l.rank}</Text>
                <View style={[s.lbAvatar, { backgroundColor: avatarColor(l.name) }]}>
                  <Text style={s.lbAvatarTxt}>{l.name[0]}</Text>
                </View>
                <Text style={[s.lbName, l.isMe && s.lbNameMe]}>{l.isMe ? 'You' : l.name}</Text>
                <Text style={s.lbPts}>{l.points} Pts</Text>
              </View>
            ))}

            {/* My rank row if not in top 3 */}
            {myRank > 3 && (
              <View style={[s.lbRow, s.lbMeRow]}>
                <Text style={[s.lbRank]}>{myRank}</Text>
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
  safe:   { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:     { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: '#111827' },
  streakPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  streakNum:   { fontSize: 13, fontWeight: '800', color: '#92400E' },

  /* Date */
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 2 },
  dateText:{ fontSize: 13, fontWeight: '600', color: '#7C3AED' },

  /* Question */
  questionBox: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 4, alignItems: 'center' },
  questionText:{ fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center', lineHeight: 32 },

  /* ? Illustration */
  illustrationWrap:   { alignItems: 'center', paddingVertical: 24 },
  illustrationCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#F5F3FF',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  spark:    { position: 'absolute' },
  sparkTxt: { fontSize: 11, color: '#A78BFA', fontWeight: '900' },
  qMark:    { fontSize: 96, fontWeight: '900', color: '#7C3AED', lineHeight: 120, marginBottom: -10 },
  qDot:     { width: 16, height: 16, borderRadius: 8, backgroundColor: '#7C3AED', marginTop: 2 },

  /* Result */
  resultBanner:  { marginHorizontal: 16, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  resultSuccess: { backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  resultFail:    { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  resultTitle:   { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  resultAnswer:  { fontSize: 13, color: '#374151' },
  resultExp:     { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 18 },

  /* Hint */
  hintCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 14, padding: 14,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
  },
  hintRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  hintIcon: { fontSize: 16 },
  hintLabel:{ fontSize: 14, fontWeight: '800', color: '#92400E' },
  hintText: { fontSize: 13, color: '#78350F', lineHeight: 19 },

  /* Input */
  inputWrap: { marginHorizontal: 16, marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827',
    backgroundColor: '#fff', marginBottom: 6,
  },
  attNote:    { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 10 },
  submitBtn:  { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitOff:  { backgroundColor: '#C4B5FD' },
  submitTxt:  { fontSize: 16, fontWeight: '800', color: '#fff' },

  /* How It Works */
  howSection: { marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  howDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: 8 },
  howLine:    { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  howDivTxt:  { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  howRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 18 },
  howIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  howTitle:   { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 3 },
  howDesc:    { fontSize: 12, color: '#6B7280', lineHeight: 17 },

  /* Leaderboard */
  lbSection:  { marginHorizontal: 16, marginTop: 4 },
  lbHead:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  lbTitle:    { fontSize: 15, fontWeight: '800', color: '#111827' },
  monthPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  monthTxt:   { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  lbRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  lbMeRow:    { backgroundColor: '#F5F3FF', borderRadius: 10, paddingHorizontal: 8, borderBottomWidth: 0, marginTop: 4 },
  lbRank:     { fontSize: 14, fontWeight: '800', color: '#9CA3AF', width: 22 },
  lbRankGold: { color: '#F59E0B' },
  lbAvatar:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lbAvatarTxt:{ fontSize: 14, fontWeight: '800', color: '#fff' },
  lbName:     { flex: 1, fontSize: 14, fontWeight: '700', color: '#111827' },
  lbNameMe:   { color: '#7C3AED', fontWeight: '800' },
  lbPts:      { fontSize: 14, fontWeight: '800', color: '#7C3AED' },
});
