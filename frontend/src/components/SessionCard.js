import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DAY_COLORS } from '../utils/constants';

const CATEGORY_ICONS = {
  'Computer Science': '</>',
  'Frontend': '🌐',
  'Backend': '⚙️',
  'Database': '🗄️',
  'Mathematics': '📐',
  'Physics': '⚛️',
  'Chemistry': '🧪',
  'Biology': '🧬',
  'Networks': '🔗',
  'Security': '🔒',
  'AI': '🧠',
  'Operating Systems': '💻',
  'default': '📚',
};

const STATE_CONFIG = {
  LIVE:          { label: 'LIVE',         bg: '#FEE2E2', color: '#EF4444', dot: true },
  DOUBT_SESSION: { label: 'DOUBT',        bg: '#FFF7ED', color: '#F97316', dot: false },
  UPCOMING:      { label: null,           bg: null,      color: null,      dot: false },
  COMPLETED:     { label: '🎬 Recording', bg: '#F0FDF4', color: '#16A34A', dot: false },
};

const formatTime = (dateStr) =>
  new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

const getDayLabel = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });

const getDateNum = (dateStr) => new Date(dateStr).getDate();
const getMonth   = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-US', { month: 'short' });

const SessionCard = ({ session, onPress, onRemind, isReminded, isSelected }) => {
  const day      = getDayLabel(session.scheduledAt);
  const dayColor = DAY_COLORS[day] || '#7C3AED';
  const icon     = CATEGORY_ICONS[session.category] || CATEGORY_ICONS.default;
  const stateCfg = STATE_CONFIG[session.state] || STATE_CONFIG.UPCOMING;
  const isCompleted = session.state === 'COMPLETED';
  const isLive      = session.state === 'LIVE';
  const isDoubt     = session.state === 'DOUBT_SESSION';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        isSelected && !isCompleted && styles.cardHighlighted,
        isCompleted && styles.cardCompleted,
        (isLive || isDoubt) && styles.cardLive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Date column */}
      <View style={styles.dateCol}>
        <Text style={[styles.dayLabel, { color: isCompleted ? '#9CA3AF' : dayColor }]}>{day}</Text>
        <Text style={[styles.dateNum,  { color: isCompleted ? '#9CA3AF' : dayColor }]}>
          {getDateNum(session.scheduledAt)}
        </Text>
        <Text style={styles.monthLabel}>{getMonth(session.scheduledAt)}</Text>
      </View>

      {/* Category icon */}
      <View style={[styles.iconBox, { backgroundColor: isCompleted ? '#F3F4F6' : `${dayColor}18` }]}>
        <Text style={[
          icon === '</>' ? [styles.iconText, { fontSize: 13, fontWeight: '800', color: isCompleted ? '#9CA3AF' : dayColor }]
                        : styles.iconText,
          isCompleted && { opacity: 0.5 },
        ]}>
          {icon}
        </Text>
      </View>

      {/* Session info */}
      <View style={styles.infoCol}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={1}>
            {session.title}
          </Text>
          {stateCfg.label && (
            <View style={[styles.statePill, { backgroundColor: stateCfg.bg }]}>
              {stateCfg.dot && <View style={[styles.liveDot, { backgroundColor: stateCfg.color }]} />}
              <Text style={[styles.stateText, { color: stateCfg.color }]}>{stateCfg.label}</Text>
            </View>
          )}
        </View>

        <Text style={styles.instructor} numberOfLines={1}>
          {session.instructor?.name || 'Instructor TBD'}
        </Text>

        <View style={[styles.categoryPill, isCompleted && { backgroundColor: '#F0FDF4' }]}>
          <Text style={[styles.categoryText, { color: isCompleted ? '#16A34A' : dayColor }]}>
            {session.category}
          </Text>
        </View>
      </View>

      {/* Time & remind */}
      <View style={styles.rightCol}>
        <View style={styles.timeRow}>
          <Text style={styles.clockIcon}>{isCompleted ? '📽' : '🕐'}</Text>
          <Text style={[styles.timeText, isCompleted && { color: '#9CA3AF' }]}>
            {formatTime(session.scheduledAt)}
          </Text>
        </View>
        <Text style={styles.durationText}>{session.durationMinutes} min</Text>

        {/* No remind button for completed sessions */}
        {!isCompleted ? (
          <TouchableOpacity
            style={styles.remindBtn}
            onPress={() => onRemind(session._id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.bellIcon}>{isReminded ? '🔔' : '🔕'}</Text>
            <Text style={[styles.remindText, { color: isReminded ? dayColor : '#9CA3AF' }]}>
              {isReminded ? 'Reminded' : 'Remind Me'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.watchBtn}>
            <Text style={styles.watchText}>▶ Watch</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardHighlighted: {
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    backgroundColor: '#FAF5FF',
  },
  cardCompleted: {
    backgroundColor: '#FAFAFA',
    opacity: 0.85,
  },
  cardLive: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  dateCol: { width: 42, alignItems: 'center', marginRight: 10 },
  dayLabel:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  dateNum:   { fontSize: 26, fontWeight: '800', lineHeight: 30 },
  monthLabel:{ fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  iconText: { fontSize: 20 },
  infoCol: { flex: 1, marginRight: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '700', color: '#111827', flex: 1 },
  titleCompleted: { color: '#6B7280' },
  instructor: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  categoryPill: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  categoryText: { fontSize: 10, fontWeight: '600' },
  statePill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2, gap: 3,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  stateText: { fontSize: 9, fontWeight: '700' },
  rightCol: { alignItems: 'flex-end', minWidth: 72 },
  timeRow:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  clockIcon:{ fontSize: 11 },
  timeText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  durationText: { fontSize: 10, color: '#9CA3AF', marginTop: 1 },
  remindBtn: { alignItems: 'center', marginTop: 6 },
  bellIcon:  { fontSize: 18 },
  remindText:{ fontSize: 9, fontWeight: '600', marginTop: 2 },
  watchBtn: {
    marginTop: 6, backgroundColor: '#F0FDF4',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  watchText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
});

export default SessionCard;
