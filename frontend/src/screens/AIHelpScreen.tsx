import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Platform, KeyboardAvoidingView,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { aiAssistantAPI } from '../services/api';

interface Suggestion {
  key: string;
  label: string;
  prompt: string;
  iconLib: 'ion' | 'mci';
  icon: string;
  color: string;
  bg: string;
}

const SUGGESTIONS: Suggestion[] = [
  { key: 'explain',  label: 'Explain a topic',         prompt: 'Explain a tricky CS concept I should know for my course.', iconLib: 'mci', icon: 'lightbulb-on-outline', color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'debug',    label: 'Debug my code',           prompt: 'Help me debug a snippet of code.',                          iconLib: 'mci', icon: 'bug-outline',          color: '#EF4444', bg: '#FEE2E2' },
  { key: 'quiz',     label: 'Quiz me on this topic',   prompt: 'Quiz me with 3 short questions on a recent topic.',         iconLib: 'mci', icon: 'help-circle-outline',  color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'compare',  label: 'Compare two concepts',    prompt: 'Compare two related programming concepts side-by-side.',    iconLib: 'mci', icon: 'compare-horizontal',   color: '#10B981', bg: '#DCFCE7' },
  { key: 'roadmap',  label: 'Build a study plan',      prompt: 'Build a 1-week study plan for an upcoming exam.',           iconLib: 'mci', icon: 'map-marker-path',      color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'practice', label: 'Practice problems',       prompt: 'Give me 2 practice problems to try right now.',             iconLib: 'mci', icon: 'dumbbell',             color: '#EC4899', bg: '#FCE7F3' },
];

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME: UIMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm Bodha AI. I can explain concepts, debug code, generate quizzes, and help you navigate the app. What would you like to learn today?",
};

export default function AIHelpScreen() {
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState<UIMessage[]>([WELCOME]);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  // Load conversation history on mount
  useEffect(() => {
    (async () => {
      try {
        const res: any = await aiAssistantAPI.history().catch(() => null);
        const list = res?.messages ?? res?.data?.messages ?? [];
        if (Array.isArray(list) && list.length > 0) {
          setMessages(list.map((m: any, i: number) => ({
            id:      m._id ?? `m${i}`,
            role:    m.role,
            content: m.content,
          })));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }, [messages, sending]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: UIMessage = { id: `u${Date.now()}`, role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res: any = await aiAssistantAPI.send(trimmed);
      const reply = res?.reply ?? res?.data?.reply ?? "Sorry, I couldn't respond just now.";
      setMessages(prev => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (e: any) {
      const msg = e?.message || 'Network issue — please try again.';
      setMessages(prev => [...prev, { id: `e${Date.now()}`, role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
      setSending(false);
    }
  }, [sending]);

  const clearChat = () => {
    Alert.alert('Clear conversation?', 'This wipes your AI Help history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive', onPress: async () => {
          try { await aiAssistantAPI.clear(); } catch {}
          setMessages([WELCOME]);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />

      {/* Header */}
      <View style={s.header}>
        <View style={s.aiAvatar}>
          <MaterialCommunityIcons name="robot-happy" size={22} color="#fff" />
          <View style={s.pulse} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Bodha AI</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={s.onlineDot} />
            <Text style={s.subtitle}>{sending ? 'Thinking...' : 'Online · ready to help'}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.iconBtn} onPress={clearChat} activeOpacity={0.7}>
          <Ionicons name="refresh" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text style={s.loadingTxt}>Loading conversation...</Text>
            </View>
          ) : (
            <>
              {/* Suggestion grid — only when conversation is fresh */}
              {messages.length <= 1 && (
                <>
                  <Text style={s.sectionTitle}>What can I help with?</Text>
                  <View style={s.grid}>
                    {SUGGESTIONS.map((sg) => (
                      <TouchableOpacity
                        key={sg.key}
                        style={s.suggCard}
                        activeOpacity={0.85}
                        onPress={() => send(sg.prompt)}
                        disabled={sending}
                      >
                        <View style={[s.suggIcon, { backgroundColor: sg.bg }]}>
                          {sg.iconLib === 'mci'
                            ? <MaterialCommunityIcons name={sg.icon as any} size={20} color={sg.color} />
                            : <Ionicons name={sg.icon as any} size={20} color={sg.color} />}
                        </View>
                        <Text style={s.suggLabel}>{sg.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Conversation */}
              <Text style={[s.sectionTitle, { marginTop: messages.length <= 1 ? 20 : 4 }]}>Conversation</Text>
              {messages.map((m) => (
                <View
                  key={m.id}
                  style={[s.bubbleRow, m.role === 'user' ? { justifyContent: 'flex-end' } : null]}
                >
                  {m.role === 'assistant' && (
                    <View style={s.bubbleAiAv}>
                      <MaterialCommunityIcons name="robot-happy-outline" size={14} color="#7C3AED" />
                    </View>
                  )}
                  <View style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
                    <Text style={m.role === 'user' ? s.bubbleUserText : s.bubbleAiText}>{m.content}</Text>
                  </View>
                </View>
              ))}

              {/* Typing indicator */}
              {sending && (
                <View style={s.bubbleRow}>
                  <View style={s.bubbleAiAv}>
                    <MaterialCommunityIcons name="robot-happy-outline" size={14} color="#7C3AED" />
                  </View>
                  <View style={[s.bubble, s.bubbleAi, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    <ActivityIndicator size="small" color="#7C3AED" />
                    <Text style={s.typingTxt}>Bodha AI is thinking...</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Composer */}
        <View style={s.composer}>
          <TextInput
            style={s.input}
            placeholder="Ask Bodha AI anything..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            editable={!sending}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, (!input.trim() || sending) && { opacity: 0.5 }]}
            disabled={!input.trim() || sending}
            onPress={() => send(input)}
            activeOpacity={0.85}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#4C1D95',
  },
  aiAvatar:  { width: 42, height: 42, borderRadius: 21, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pulse:     { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#4C1D95' },
  title:     { fontSize: 16, fontWeight: '800', color: '#fff' },
  subtitle:  { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  iconBtn:   { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#374151', marginBottom: 10, marginTop: 4 },

  loadingBox: { padding: 24, alignItems: 'center', gap: 8 },
  loadingTxt: { fontSize: 12, color: '#9CA3AF' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  suggCard: {
    width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#F3F4F6', flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  suggIcon:  { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  suggLabel: { fontSize: 12, fontWeight: '700', color: '#111827', flex: 1 },

  bubbleRow:    { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'flex-end' },
  bubbleAiAv:   { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  bubble:       { maxWidth: '80%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleAi:     { backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3F4F6', borderTopLeftRadius: 4 },
  bubbleAiText: { fontSize: 13, color: '#111827', lineHeight: 19 },
  bubbleUser:   { backgroundColor: '#7C3AED', borderTopRightRadius: 4 },
  bubbleUserText:{ fontSize: 13, color: '#fff', lineHeight: 19, fontWeight: '500' },
  typingTxt:    { fontSize: 12, color: '#7C3AED', fontWeight: '600' },

  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  input:    { flex: 1, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F9FAFB', borderRadius: 22, borderWidth: 1, borderColor: '#F3F4F6', fontSize: 13, color: '#111827', maxHeight: 100 },
  sendBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
});
