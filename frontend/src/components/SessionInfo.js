import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const SessionInfo = ({ session, onAskQuestion }) => {
  if (!session) return null;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={2}>{session.title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{session.subtitle}</Text>
        </View>
      </View>

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
          <Text style={styles.instructorName} numberOfLines={1}>{session.instructor?.name}</Text>
          <Text style={styles.instructorDept} numberOfLines={1}>{session.instructor?.department}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.askBtn} onPress={onAskQuestion} activeOpacity={0.7}>
        <Text style={styles.askBtnIcon}>💬</Text>
        <Text style={styles.askBtnText}>Ask a Question</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  titleRow: {
    marginBottom: 12,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  instructorInfo: {
    marginLeft: 10,
  },
  instructorName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  instructorDept: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  askBtnIcon: { fontSize: 14 },
  askBtnText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default SessionInfo;
