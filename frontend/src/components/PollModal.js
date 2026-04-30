import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Animated,
} from 'react-native';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

const PollModal = ({ visible, poll, onSubmit, onDismiss }) => {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultCounts, setResultCounts] = useState(null);

  // Pre-answered or closed poll — show results immediately
  const showResults = submitted || poll?.answered != null || poll?.closed;
  const displayCounts = resultCounts ?? poll?.counts ?? null;
  const total = displayCounts ? displayCounts.reduce((s, c) => s + c, 0) : 0;

  const handleSubmit = async () => {
    if (selected === null || submitting) return;
    setSubmitting(true);
    try {
      const res = await onSubmit(poll.pollId, selected);
      setResultCounts(res?.data?.counts ?? null);
      setSubmitted(true);
    } catch {
      // keep modal open so student can retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelected(null);
    setSubmitted(false);
    setResultCounts(null);
    onDismiss();
  };

  if (!poll) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.pill, poll?.closed && { backgroundColor: '#F3F4F6' }]}>
              <View style={[styles.liveDot, poll?.closed && { backgroundColor: '#9CA3AF' }]} />
              <Text style={[styles.pillText, poll?.closed && { color: '#6B7280' }]}>
                {poll?.closed ? 'POLL ENDED' : 'LIVE POLL'}
              </Text>
            </View>
            {(showResults) && (
              <TouchableOpacity onPress={handleClose}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.question}>{poll.question}</Text>

          {/* Options */}
          {poll.options.map((opt, i) => {
            const pct = showResults && total > 0 ? Math.round(((displayCounts?.[i] ?? 0) / total) * 100) : 0;
            const isSelected = selected === i || poll.answered === i;
            const isWinner = showResults && displayCounts && displayCounts[i] === Math.max(...displayCounts);
            const isCorrect = poll.correctOption === i && poll.closed;

            return (
              <TouchableOpacity
                key={i}
                style={[
                  styles.option,
                  isSelected && !showResults && styles.optionSelected,
                  showResults && styles.optionResult,
                  showResults && isWinner && styles.optionWinner,
                  isCorrect && styles.optionCorrect,
                ]}
                onPress={() => !showResults && setSelected(i)}
                activeOpacity={showResults ? 1 : 0.7}
              >
                {/* Bar fill */}
                {showResults && (
                  <View style={[styles.bar, { width: `${pct}%`, backgroundColor: isCorrect ? '#DCFCE7' : isWinner ? '#7C3AED20' : '#F3F4F6' }]} />
                )}

                <View style={styles.optionInner}>
                  <View style={[
                    styles.letter,
                    isSelected && !showResults && styles.letterSelected,
                    showResults && isWinner && styles.letterWinner,
                    isCorrect && styles.letterCorrect,
                  ]}>
                    <Text style={[styles.letterText, (isSelected && !showResults) || (showResults && (isWinner || isCorrect)) ? styles.letterTextActive : null]}>
                      {OPTION_LETTERS[i]}
                    </Text>
                  </View>
                  <Text style={[styles.optText, showResults && isWinner && { fontWeight: '700', color: '#1E1B4B' }, isCorrect && { color: '#15803D', fontWeight: '700' }]} numberOfLines={2}>
                    {opt}{isCorrect ? ' ✓' : ''}
                  </Text>
                  {showResults && (
                    <Text style={[styles.pct, isWinner && { color: '#7C3AED', fontWeight: '700' }, isCorrect && { color: '#15803D' }]}>{pct}%</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {showResults ? (
            <View style={styles.footer}>
              <Text style={styles.totalText}>{total} student{total !== 1 ? 's' : ''} responded</Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, selected === null && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={selected === null || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Submit Answer</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
  },
  liveDot: {
    width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444',
  },
  pillText: { fontSize: 11, fontWeight: '800', color: '#EF4444', letterSpacing: 0.5 },
  closeBtn: { fontSize: 18, color: '#9CA3AF', padding: 4 },
  question: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 18,
    lineHeight: 22,
  },
  option: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  optionSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  optionResult: {
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  optionWinner: {
    borderColor: '#7C3AED',
  },
  optionCorrect: {
    borderColor: '#16A34A',
  },
  bar: {
    position: 'absolute',
    top: 0, left: 0, bottom: 0,
    borderRadius: 8,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  letter: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  letterSelected: { backgroundColor: '#7C3AED' },
  letterWinner: { backgroundColor: '#7C3AED' },
  letterCorrect: { backgroundColor: '#16A34A' },
  letterText: { fontSize: 12, fontWeight: '800', color: '#6B7280' },
  letterTextActive: { color: '#fff' },
  optText: { flex: 1, fontSize: 13, color: '#374151', lineHeight: 18 },
  pct: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', minWidth: 36, textAlign: 'right' },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#C4B5FD' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalText: { fontSize: 12, color: '#9CA3AF' },
  doneBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  doneBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default PollModal;
