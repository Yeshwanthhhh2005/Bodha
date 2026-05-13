import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface Suggestion {
  key: string;
  label: string;
  iconLib: 'ion' | 'mci';
  icon: string;
  color: string;
  bg: string;
}

const SUGGESTIONS: Suggestion[] = [
  { key: 'explain',  label: 'Explain a topic',         iconLib: 'mci', icon: 'lightbulb-on-outline',     color: '#F59E0B', bg: '#FEF3C7' },
  { key: 'debug',    label: 'Debug my code',           iconLib: 'mci', icon: 'bug-outline',              color: '#EF4444', bg: '#FEE2E2' },
  { key: 'quiz',     label: 'Quiz me on this topic',   iconLib: 'mci', icon: 'help-circle-outline',      color: '#7C3AED', bg: '#EDE9FE' },
  { key: 'compare',  label: 'Compare two concepts',    iconLib: 'mci', icon: 'compare-horizontal',       color: '#10B981', bg: '#DCFCE7' },
  { key: 'roadmap',  label: 'Build a study plan',      iconLib: 'mci', icon: 'map-marker-path',          color: '#3B82F6', bg: '#DBEAFE' },
  { key: 'practice', label: 'Practice problems',       iconLib: 'mci', icon: 'dumbbell',                 color: '#EC4899', bg: '#FCE7F3' },
];

interface ChatMessage {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

const STARTER_CHAT: ChatMessage[] = [
  {
    id: 'm1',
    role: 'ai',
    text: "Hi Yeshwanth! I'm Bodha AI. I can explain concepts, debug code, generate quizzes, and build study plans tailored to your course. What would you like to learn today?",
  },
];

export default function AIHelpScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER_CHAT);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = String(Date.now());
    setMessages((prev) => [
      ...prev,
      { id, role: 'user', text: trimmed },
      {
        id: id + '-r',
        role: 'ai',
        text: "I'm being wired up — the AI Help backend connects soon. Once live, you'll get instant answers, code reviews, and quizzes grounded in your course material.",
      },
    ]);
    setInput('');
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
            <Text style={s.subtitle}>Online · ready to help</Text>
          </View>
        </View>
        <TouchableOpacity style={s.iconBtn}>
          <Ionicons name="settings-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Suggestion grid */}
          <Text style={s.sectionTitle}>What can I help with?</Text>
          <View style={s.grid}>
            {SUGGESTIONS.map((sg) => (
              <TouchableOpacity
                key={sg.key}
                style={s.suggCard}
                activeOpacity={0.85}
                onPress={() => send(sg.label)}
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

          {/* Conversation */}
          <Text style={[s.sectionTitle, { marginTop: 20 }]}>Conversation</Text>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[s.bubbleRow, m.role === 'user' ? { justifyContent: 'flex-end' } : null]}
            >
              {m.role === 'ai' && (
                <View style={s.bubbleAiAv}>
                  <MaterialCommunityIcons name="robot-happy-outline" size={14} color="#7C3AED" />
                </View>
              )}
              <View style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleAi]}>
                <Text style={m.role === 'user' ? s.bubbleUserText : s.bubbleAiText}>{m.text}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Composer */}
        <View style={s.composer}>
          <TouchableOpacity style={s.composerIcon} activeOpacity={0.7}>
            <Ionicons name="attach" size={20} color="#7C3AED" />
          </TouchableOpacity>
          <TextInput
            style={s.input}
            placeholder="Ask Bodha AI anything..."
            placeholderTextColor="#9CA3AF"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[s.sendBtn, !input.trim() && { opacity: 0.5 }]}
            disabled={!input.trim()}
            onPress={() => send(input)}
            activeOpacity={0.85}
          >
            <Ionicons name="send" size={18} color="#fff" />
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

  composer: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6',
  },
  composerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  input:    { flex: 1, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#F9FAFB', borderRadius: 22, borderWidth: 1, borderColor: '#F3F4F6', fontSize: 13, color: '#111827' },
  sendBtn:  { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
});
