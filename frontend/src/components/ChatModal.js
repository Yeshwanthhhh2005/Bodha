import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { chatAPI, escalationAPI } from '../services/api';
import { getSocket } from '../services/socket';
import { SESSION_STATES } from '../utils/constants';

const MessageBubble = ({ msg }) => {
  const isStudent = msg.sender === 'student';
  const isTrainer = msg.sender === 'trainer';
  const isAI = msg.sender === 'ai';

  return (
    <View style={[styles.bubbleWrapper, isStudent && styles.bubbleRight]}>
      {!isStudent && (
        <View style={styles.senderTag}>
          <Text style={styles.senderLabel}>{isTrainer ? '👨‍🏫 Trainer' : '🤖 AI'}</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isStudent && styles.bubbleStudent,
          isAI && styles.bubbleAI,
          isTrainer && styles.bubbleTrainer,
          msg.isHighlighted && styles.bubbleHighlighted,
        ]}
      >
        <Text style={[styles.bubbleText, isStudent && styles.bubbleTextStudent]}>
          {msg.content}
        </Text>
        <Text style={[styles.bubbleTime, isStudent && styles.bubbleTimeStudent]}>
          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const ChatModal = ({ visible, onClose, session }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [isEscalating, setIsEscalating] = useState(false);
  const [waitingForTrainer, setWaitingForTrainer] = useState(false);
  const flatListRef = useRef(null);
  const sessionId = session?._id;
  const sessionState = session?.state;

  const canUseAI =
    session?.aiEnabled &&
    (sessionState === SESSION_STATES.UPCOMING ||
      sessionState === SESSION_STATES.LIVE ||
      sessionState === SESSION_STATES.COMPLETED);

  const canEscalate =
    sessionState === SESSION_STATES.LIVE ||
    sessionState === SESSION_STATES.DOUBT_SESSION;

  const isDoubtSession = sessionState === SESSION_STATES.DOUBT_SESSION;

  useEffect(() => {
    if (!visible || !sessionId) return;

    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const res = await chatAPI.getHistory(sessionId);
        setMessages(res.data || []);
      } catch {}
      setHistoryLoading(false);
    };

    loadHistory();

    const socket = getSocket();
    if (!socket) return;

    const onMessage = (msg) => {
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        return [...prev, msg];
      });
      if (msg.sender === 'ai' && msg.content.includes('sent to the trainer')) {
        setWaitingForTrainer(true);
      }
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const onTrainerResponse = ({ message }) => {
      setWaitingForTrainer(false);
      setMessages((prev) => {
        if (prev.find((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:trainer_response', onTrainerResponse);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:trainer_response', onTrainerResponse);
    };
  }, [visible, sessionId]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput('');
    setLoading(true);
    try {
      await chatAPI.sendMessage(sessionId, trimmed);
    } catch (err) {
      const errMsg = err?.message || 'Failed to send message';
      setMessages((prev) => [
        ...prev,
        { _id: Date.now().toString(), sender: 'ai', content: errMsg, createdAt: new Date() },
      ]);
    }
    setLoading(false);
  };

  const escalateToTrainer = async () => {
    const lastStudentMsg = [...messages].reverse().find((m) => m.sender === 'student');
    if (!lastStudentMsg) return;

    setIsEscalating(true);
    try {
      await escalationAPI.escalate(sessionId, lastStudentMsg.content, lastStudentMsg._id);
    } catch (err) {
      const errMsg = err?.message || 'Could not escalate. Try again.';
      setMessages((prev) => [
        ...prev,
        { _id: Date.now().toString(), sender: 'ai', content: errMsg, createdAt: new Date() },
      ]);
    }
    setIsEscalating(false);
  };

  const chatModeLabel = () => {
    if (isDoubtSession) return '💬 Doubt Session — Trainer Direct Chat';
    if (canUseAI) return '🤖 AI Assistant';
    return '💬 Chat';
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Ask a Question</Text>
              <View style={styles.modePill}>
                <Text style={styles.modeText}>{chatModeLabel()}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Doubt session banner */}
          {isDoubtSession && (
            <View style={styles.doubtBanner}>
              <Text style={styles.doubtBannerText}>🎓 Live Doubt Session Ongoing — Trainer is available!</Text>
            </View>
          )}

          {/* Messages */}
          {historyLoading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#7C3AED" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item._id?.toString() ?? Math.random().toString()}
              renderItem={({ item }) => <MessageBubble msg={item} />}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={
                <View style={styles.emptyChat}>
                  <Text style={styles.emptyChatText}>
                    {isDoubtSession
                      ? 'Trainer is available — ask your doubts directly!'
                      : canUseAI && sessionState === SESSION_STATES.COMPLETED
                      ? 'Session ended — review concepts with AI anytime!'
                      : canUseAI
                      ? 'Ask anything about the session topic!'
                      : 'Chat will be available once the session starts.'}
                  </Text>
                </View>
              }
            />
          )}

          {/* Waiting indicator */}
          {waitingForTrainer && (
            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={styles.waitingText}>Waiting for trainer response...</Text>
            </View>
          )}

          {/* Escalate button */}
          {canEscalate && !isDoubtSession && !waitingForTrainer && messages.some((m) => m.sender === 'student') && (
            <TouchableOpacity
              style={[styles.escalateBtn, isEscalating && styles.escalateBtnDisabled]}
              onPress={escalateToTrainer}
              disabled={isEscalating}
            >
              {isEscalating ? (
                <ActivityIndicator size="small" color="#7C3AED" />
              ) : (
                <Text style={styles.escalateBtnText}>👨‍🏫 Ask Trainer</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={
                isDoubtSession
                  ? 'Ask your trainer directly...'
                  : canUseAI
                  ? 'Type your question...'
                  : 'Chat will be available once the session starts'
              }
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
              editable={canUseAI || isDoubtSession}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: { flex: 1 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  modePill: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 12,
  },
  closeIcon: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  doubtBanner: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  doubtBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5B21B6',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  messageList: {
    padding: 16,
    flexGrow: 1,
  },
  emptyChat: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyChatText: {
    color: '#9CA3AF',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  bubbleWrapper: {
    marginBottom: 12,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  bubbleRight: {
    alignSelf: 'flex-end',
  },
  senderTag: {
    marginBottom: 3,
  },
  senderLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  bubble: {
    borderRadius: 14,
    padding: 10,
    backgroundColor: '#F3F4F6',
  },
  bubbleStudent: {
    backgroundColor: '#7C3AED',
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: '#F0FDF4',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  bubbleTrainer: {
    backgroundColor: '#EFF6FF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bubbleHighlighted: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  bubbleText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  bubbleTextStudent: {
    color: '#fff',
  },
  bubbleTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeStudent: {
    color: 'rgba(255,255,255,0.7)',
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
  },
  waitingText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  escalateBtn: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  escalateBtnDisabled: { opacity: 0.6 },
  escalateBtnText: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ChatModal;
