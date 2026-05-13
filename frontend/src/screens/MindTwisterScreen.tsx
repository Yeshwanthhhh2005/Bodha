import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { puzzleAPI } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PuzzleDetail {
  _id: string;
  title: string;
  hint?: string;
  explanation?: string;
  releaseDate: string;
  pointsAwarded: number;
  maxAttempts: number;
  myAttempts: number;
  isSolved: boolean;
  attemptsRemaining: number;
}
interface SubmitResult {
  isCorrect: boolean;
  pointsEarned: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  correctAnswer?: string;
  explanation?: string;
}

interface Props {
  navigation: any;
  route: { params: { puzzleId: string } };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MindTwisterScreen({ navigation, route }: Props) {
  const { puzzleId } = route.params;
  const [puzzle, setPuzzle]   = useState<PuzzleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]   = useState<SubmitResult | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res: any = await puzzleAPI.getPuzzle(puzzleId);
        const data = res?.data ?? res;
        setPuzzle(data);
        if (data?.isSolved) setResult({
          isCorrect: true,
          pointsEarned: data.pointsEarned ?? 0,
          attemptsUsed: data.myAttempts,
          attemptsRemaining: 0,
          explanation: data.explanation,
        });
      } catch {
        Alert.alert('Error', 'Could not load puzzle');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [puzzleId]);

  const submit = async () => {
    if (!answer.trim()) return;
    setSubmitting(true);
    try {
      const res: any = await puzzleAPI.submitAnswer(puzzleId, answer.trim());
      const data: SubmitResult = res?.data ?? res;
      setResult(data);
      setPuzzle(prev => prev ? {
        ...prev,
        isSolved: data.isCorrect,
        myAttempts: data.attemptsUsed,
        attemptsRemaining: data.attemptsRemaining,
      } : prev);
    } catch (e: any) {
      Alert.alert('Oops', e?.message || 'Could not submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color="#7C3AED" /></View>
      </SafeAreaView>
    );
  }

  const isExhausted = !!(result && !result.isCorrect && result.attemptsRemaining === 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color="#1E1B4B" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Mind Twister</Text>
        <View style={s.streakBadge}>
          <MaterialCommunityIcons name="fire" size={13} color="#F97316" />
          <Text style={s.streakText}>12</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Date */}
        <View style={s.dateRow}>
          <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
          <Text style={s.dateText}>{puzzle ? fmtDate(puzzle.releaseDate) : ''}</Text>
        </View>

        {/* Question */}
        <View style={s.questionCard}>
          <Text style={s.questionText}>{puzzle?.title}</Text>
          {/* Illustrated question mark */}
          <View style={s.qMarkWrap}>
            <View style={s.qMarkCircle}>
              <Text style={s.qMark}>?</Text>
            </View>
          </View>
        </View>

        {/* Result state (solved or exhausted) */}
        {result && (
          <View style={[s.resultCard, result.isCorrect ? s.resultSuccess : s.resultWrong]}>
            <View style={s.resultTop}>
              <Ionicons
                name={result.isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={28}
                color={result.isCorrect ? '#059669' : '#DC2626'}
              />
              <Text style={[s.resultTitle, { color: result.isCorrect ? '#059669' : '#DC2626' }]}>
                {result.isCorrect ? `Correct! +${result.pointsEarned} pts` : isExhausted ? 'Out of attempts' : 'Wrong answer'}
              </Text>
            </View>
            {result.correctAnswer && (
              <View style={s.answerReveal}>
                <Text style={s.answerRevealLabel}>Correct Answer:</Text>
                <Text style={s.answerRevealText}>{result.correctAnswer}</Text>
              </View>
            )}
            {result.explanation ? (
              <Text style={s.explanationText}>{result.explanation}</Text>
            ) : null}
          </View>
        )}

        {/* Hint */}
        {puzzle?.hint && !result?.isCorrect && !isExhausted && (
          <TouchableOpacity style={s.hintCard} activeOpacity={0.85} onPress={() => setShowHint(v => !v)}>
            <View style={s.hintTop}>
              <Ionicons name="bulb-outline" size={18} color="#F59E0B" />
              <Text style={s.hintLabel}>Hint</Text>
              <Ionicons name={showHint ? 'chevron-up' : 'chevron-down'} size={14} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
            </View>
            {showHint && <Text style={s.hintText}>{puzzle.hint}</Text>}
          </TouchableOpacity>
        )}

        {/* Answer input */}
        {!result?.isCorrect && !isExhausted && (
          <View style={s.inputSection}>
            <TextInput
              style={s.input}
              placeholder="Type your answer here..."
              placeholderTextColor="#9CA3AF"
              value={answer}
              onChangeText={setAnswer}
              editable={!submitting}
              returnKeyType="done"
            />
            {puzzle && puzzle.maxAttempts > 1 && (
              <Text style={s.attemptsNote}>
                {puzzle.attemptsRemaining} attempt{puzzle.attemptsRemaining !== 1 ? 's' : ''} remaining
              </Text>
            )}
            <TouchableOpacity
              style={[s.submitBtn, (!answer.trim() || submitting) && s.submitBtnDisabled]}
              activeOpacity={0.85}
              onPress={submit}
              disabled={!answer.trim() || submitting}
            >
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitBtnText}>Submit Answer</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* How It Works */}
        <View style={s.howSection}>
          <View style={s.howDivider}>
            <View style={s.howLine} /><Text style={s.howTitle}>How It Works</Text><View style={s.howLine} />
          </View>
          {[
            { icon: 'calendar-outline' as const, title: 'One Puzzle Everyday', desc: 'A new Mind Twister is released every day at 12:00 AM.' },
            { icon: 'time-outline' as const, title: 'Think & Solve', desc: 'Use your logic and creativity to find the answer.' },
            { icon: 'location-outline' as const, title: 'Earn Points', desc: 'Solve daily and build your streak to earn more points.' },
          ].map((item) => (
            <View key={item.title} style={s.howRow}>
              <View style={s.howIcon}>
                <Ionicons name={item.icon} size={22} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.howItemTitle}>{item.title}</Text>
                <Text style={s.howItemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#F5F3FF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:    { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle:{ flex: 1, fontSize: 16, fontWeight: '800', color: '#1E1B4B', textAlign: 'center' },
  streakBadge:{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  streakText: { fontSize: 13, fontWeight: '800', color: '#92400E' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  dateText:{ fontSize: 12, fontWeight: '600', color: '#7C3AED' },

  questionCard: { backgroundColor: '#fff', margin: 16, borderRadius: 18, padding: 20, alignItems: 'center', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  questionText: { fontSize: 20, fontWeight: '900', color: '#1E1B4B', textAlign: 'center', lineHeight: 28 },
  qMarkWrap:    { marginTop: 20, alignItems: 'center' },
  qMarkCircle:  { width: 110, height: 110, borderRadius: 55, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  qMark:        { fontSize: 64, color: '#7C3AED', fontWeight: '900', lineHeight: 80 },

  // Result
  resultCard:   { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16 },
  resultSuccess:{ backgroundColor: '#DCFCE7', borderWidth: 1, borderColor: '#86EFAC' },
  resultWrong:  { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' },
  resultTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultTitle:  { fontSize: 15, fontWeight: '800' },
  answerReveal: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: 10, marginTop: 8 },
  answerRevealLabel: { fontSize: 11, fontWeight: '700', color: '#6B7280' },
  answerRevealText:  { fontSize: 15, fontWeight: '800', color: '#111827', marginTop: 2 },
  explanationText:   { fontSize: 12, color: '#374151', marginTop: 8, lineHeight: 18 },

  // Hint
  hintCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FDE68A' },
  hintTop:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintLabel:{ fontSize: 14, fontWeight: '700', color: '#92400E' },
  hintText: { fontSize: 13, color: '#78350F', marginTop: 8, lineHeight: 18 },

  // Input
  inputSection: { marginHorizontal: 16, marginBottom: 16 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#DDD6FE',
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#111827',
    marginBottom: 6,
  },
  attemptsNote:     { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginBottom: 10 },
  submitBtn:        { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitBtnDisabled:{ backgroundColor: '#C4B5FD' },
  submitBtnText:    { fontSize: 15, fontWeight: '800', color: '#fff' },

  // How it works
  howSection: { marginHorizontal: 16, marginTop: 4 },
  howDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  howLine:    { flex: 1, height: 1, backgroundColor: '#DDD6FE' },
  howTitle:   { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  howRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  howIcon:    { width: 42, height: 42, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  howItemTitle: { fontSize: 14, fontWeight: '800', color: '#1E1B4B' },
  howItemDesc:  { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 17 },
});
