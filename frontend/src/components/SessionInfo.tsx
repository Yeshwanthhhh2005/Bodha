import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Session } from '../types';

interface SessionInfoProps {
  session: Session | null | undefined;
  onAskQuestion: () => void;
}

const SessionInfo: React.FC<SessionInfoProps> = ({ session, onAskQuestion }) => {
  if (!session) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title} numberOfLines={2}>{session.title}</Text>
      {!!session.subtitle && (
        <Text style={styles.subtitle} numberOfLines={1}>{session.subtitle}</Text>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.instructorRow}>
          {session.instructor?.avatar ? (
            <Image source={{ uri: session.instructor.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {session.instructor?.name?.[0] ?? 'T'}
              </Text>
            </View>
          )}
          <View style={styles.instructorInfo}>
            <Text style={styles.instructorName} numberOfLines={1}>
              {session.instructor?.name || 'Instructor'}
            </Text>
            <Text style={styles.instructorDept} numberOfLines={1}>
              {session.instructor?.department || session.category || ''}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.askBtn} onPress={onAskQuestion} activeOpacity={0.7}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color="#7C3AED" />
          <Text style={styles.askBtnText}>Ask a Question</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  title:    { fontSize: 19, fontWeight: '800', color: '#111827', lineHeight: 24 },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 3 },
  bottomRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 10 },
  instructorRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar:        { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E5E7EB' },
  avatarPlaceholder: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial:   { color: '#fff', fontSize: 14, fontWeight: '700' },
  instructorInfo:  { marginLeft: 10, flex: 1 },
  instructorName:  { fontSize: 13, fontWeight: '700', color: '#111827' },
  instructorDept:  { fontSize: 11, color: '#6B7280', marginTop: 1 },
  askBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#7C3AED', borderRadius: 22,
    paddingHorizontal: 14, paddingVertical: 9, gap: 6,
  },
  askBtnIcon: { fontSize: 13 },
  askBtnText: { color: '#7C3AED', fontSize: 12, fontWeight: '700' },
});

export default SessionInfo;
