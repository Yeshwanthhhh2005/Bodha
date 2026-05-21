import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { shortsAPI } from '../services/api';

interface Props { navigation: any; }

type Step = 'pick' | 'details' | 'preview' | 'success';

const GREEN = '#00C853';
const PURPLE = '#6C3CE1';
const RED = '#EF4444';

const TOPICS = [
  'Data Structures',
  'Algorithms',
  'DBMS',
  'OS',
  'Networking',
  'OOPs',
  'Other',
];

const MAX_DURATION_SEC = 30;
const MAX_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXT = ['mp4', 'mov', 'm4v', 'webm', 'mkv', '3gp'];

interface PickedVideo {
  uri: string;
  name: string;
  mime: string;
  durationSec: number;
  sizeBytes: number;
}

function extOf(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

function bytesToMb(n: number): string {
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function UploadShortScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('pick');
  const [picked, setPicked] = useState<PickedVideo | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState<string>('');
  const [description, setDescription] = useState('');
  const [showTopicMenu, setShowTopicMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<Video>(null);

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your gallery to pick a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: MAX_DURATION_SEC,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const name = asset.fileName || asset.uri.split('/').pop() || 'short.mp4';
    const ext = extOf(name) || 'mp4';
    if (!ALLOWED_EXT.includes(ext)) {
      Alert.alert('Unsupported format', `Use one of: ${ALLOWED_EXT.join(', ').toUpperCase()}.`);
      return;
    }
    const durationSec = (asset.duration ?? 0) / 1000;
    if (durationSec > MAX_DURATION_SEC + 0.5) {
      Alert.alert(
        'Video too long',
        `This video is ${durationSec.toFixed(1)}s. Please pick one ${MAX_DURATION_SEC} seconds or shorter.`
      );
      return;
    }
    const sizeBytes = (asset as any).fileSize ?? 0;
    if (sizeBytes && sizeBytes > MAX_BYTES) {
      Alert.alert(
        'File too large',
        `Max 50MB allowed. This file is ${bytesToMb(sizeBytes)}.`
      );
      return;
    }

    setPicked({
      uri: asset.uri,
      name,
      mime: asset.mimeType || (ext === 'mov' ? 'video/quicktime' : 'video/mp4'),
      durationSec,
      sizeBytes,
    });
    setStep('details');
  };

  const goNext = () => {
    if (step === 'pick') {
      if (!picked) {
        Alert.alert('No video', 'Please pick a video from your gallery.');
        return;
      }
      setStep('details');
    } else if (step === 'details') {
      if (!title.trim()) { Alert.alert('Missing title', 'Please enter a title.'); return; }
      if (!topic.trim()) { Alert.alert('Missing topic', 'Please select a topic.'); return; }
      setStep('preview');
    }
  };

  const submitUpload = async () => {
    if (!picked) {
      Alert.alert('No video', 'Please pick a video first.');
      return;
    }
    setSubmitting(true);
    try {
      await shortsAPI.upload({
        title: title.trim(),
        topic,
        description: description.trim(),
        videoUri: picked.uri,
        videoName: picked.name,
        videoMime: picked.mime,
        durationSec: picked.durationSec,
        bgTop: '#86EFAC',
        bgBot: '#22C55E',
      });
      setStep('success');
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepIdx = step === 'pick' ? 1 : step === 'details' ? 2 : 3;

  // ── Success screen ─────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.successWrap}>
          <View style={s.confettiTopLeft}>
            <Ionicons name="sparkles" size={28} color="#FCD34D" />
          </View>
          <View style={s.confettiTopRight}>
            <Ionicons name="sparkles" size={28} color="#A78BFA" />
          </View>
          <View style={s.checkCircle}>
            <Ionicons name="checkmark" size={56} color="#fff" />
          </View>
          <Text style={s.successTitle}>Uploaded Successfully!</Text>
          <Text style={s.successSub}>
            Your short has been submitted and is pending admin approval.
          </Text>
          <Text style={s.successSub}>
            You will be notified once it's live.
          </Text>
          <TouchableOpacity
            style={s.successBtn}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('MyUploads')}
          >
            <Text style={s.successBtnText}>View My Uploads</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.successSecondaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('StudentShorts')}
          >
            <Text style={s.successSecondaryText}>Go to Student Shorts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => {
            if (step === 'pick') navigation.goBack();
            else if (step === 'details') setStep('pick');
            else setStep('details');
          }}
        >
          <Ionicons name="arrow-back" size={22} color="#1a1a2e" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Upload Short</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Step indicator */}
      <View style={s.steps}>
        {[1, 2, 3].map((n) => {
          const labels = ['Select', 'Details', 'Preview'];
          const active = n === stepIdx;
          const done = n < stepIdx;
          return (
            <View key={n} style={s.stepCol}>
              <View style={[s.stepDot, (active || done) && s.stepDotActive]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : (
                  <Text style={[s.stepDotText, active && { color: '#fff' }]}>{n}</Text>
                )}
              </View>
              <Text style={[s.stepLabel, active && s.stepLabelActive]}>{labels[n - 1]}</Text>
              {n < 3 && <View style={[s.stepLine, done && s.stepLineActive]} />}
            </View>
          );
        })}
      </View>

      {/* Step content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        {step === 'pick' && (
          <View style={s.pickWrap}>
            <TouchableOpacity
              style={s.pickCircle}
              onPress={pickFromGallery}
              activeOpacity={0.85}
            >
              <Ionicons name={picked ? 'videocam' : 'images'} size={56} color="#fff" />
            </TouchableOpacity>
            <Text style={s.pickLabel}>
              {picked ? 'Video selected — tap to change' : 'Tap to pick from gallery'}
            </Text>
            <Text style={s.pickHint}>Max 30 seconds · MP4 / MOV · up to 50MB</Text>

            {picked && (
              <View style={s.pickedMeta}>
                <View style={s.pickedRow}>
                  <Ionicons name="film-outline" size={14} color="#6B7280" />
                  <Text style={s.pickedText} numberOfLines={1}>{picked.name}</Text>
                </View>
                <View style={s.pickedRow}>
                  <Ionicons name="time-outline" size={14} color="#6B7280" />
                  <Text style={s.pickedText}>{picked.durationSec.toFixed(1)}s</Text>
                  {picked.sizeBytes > 0 && (
                    <>
                      <Text style={s.pickedDot}>·</Text>
                      <Text style={s.pickedText}>{bytesToMb(picked.sizeBytes)}</Text>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {step === 'details' && (
          <View style={s.form}>
            <Text style={s.formLabel}>Title</Text>
            <TextInput
              style={s.input}
              placeholder="Enter a catchy title"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
            />

            <Text style={s.formLabel}>Topic</Text>
            <TouchableOpacity
              style={s.select}
              onPress={() => setShowTopicMenu((v) => !v)}
              activeOpacity={0.85}
            >
              <Text style={[s.selectText, !topic && { color: '#9CA3AF' }]}>
                {topic || 'Select Topic'}
              </Text>
              <Ionicons name={showTopicMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
            </TouchableOpacity>
            {showTopicMenu && (
              <View style={s.dropdown}>
                {TOPICS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={s.dropdownItem}
                    onPress={() => { setTopic(t); setShowTopicMenu(false); }}
                  >
                    <Text style={s.dropdownText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.formLabel}>Description (Optional)</Text>
            <TextInput
              style={[s.input, s.textarea]}
              placeholder="Add a short description..."
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {step === 'preview' && (
          <View style={s.previewWrap}>
            {picked && (
              <Video
                ref={videoRef}
                source={{ uri: picked.uri }}
                style={s.previewPlayer}
                useNativeControls
                resizeMode={ResizeMode.COVER}
                isLooping
              />
            )}

            <View style={s.previewMetaCard}>
              <Text style={s.previewTitle}>{title}</Text>
              <View style={s.previewBadgeRow}>
                <View style={s.topicBadge}>
                  <Ionicons name="pricetag" size={11} color={PURPLE} />
                  <Text style={s.topicBadgeText}>{topic}</Text>
                </View>
                {picked && (
                  <View style={s.durBadge}>
                    <Ionicons name="time-outline" size={11} color="#6B7280" />
                    <Text style={s.durBadgeText}>{picked.durationSec.toFixed(0)}s</Text>
                  </View>
                )}
              </View>
              {!!description && (
                <Text style={s.previewDesc}>{description}</Text>
              )}
            </View>

            <View style={s.reviewNotice}>
              <Ionicons name="information-circle" size={18} color="#0369A1" />
              <Text style={s.reviewNoticeText}>
                After submission, your short will be reviewed by an admin before going live.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer button */}
      <View style={s.footer}>
        {step === 'preview' ? (
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: GREEN }, submitting && { opacity: 0.6 }]}
            onPress={submitUpload}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.ctaBtnText}>Submit for Review</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: step === 'pick' && !picked ? '#9CA3AF' : GREEN }]}
            onPress={step === 'pick' && !picked ? pickFromGallery : goNext}
            activeOpacity={0.85}
          >
            <Text style={s.ctaBtnText}>
              {step === 'pick' && !picked ? 'Choose from Gallery' : 'Next'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn:     { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a2e' },

  steps: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: 36, paddingVertical: 22,
  },
  stepCol: {
    alignItems: 'center', flex: 1,
    position: 'relative',
  },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#E5E7EB',
  },
  stepDotActive: { backgroundColor: PURPLE, borderColor: PURPLE },
  stepDotText:   { fontSize: 13, fontWeight: '800', color: '#9CA3AF' },
  stepLabel:     { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 6 },
  stepLabelActive: { color: PURPLE, fontWeight: '800' },
  stepLine: {
    position: 'absolute',
    top: 15, left: '60%', right: '-40%',
    height: 2, backgroundColor: '#E5E7EB',
  },
  stepLineActive: { backgroundColor: PURPLE },

  // Pick step
  pickWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 40, paddingHorizontal: 28,
  },
  pickCircle: {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  pickLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginTop: 22, textAlign: 'center' },
  pickHint:   { fontSize: 12, color: '#9CA3AF', marginTop: 6, textAlign: 'center' },
  pickedMeta: {
    marginTop: 24, padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 10, width: '100%',
    borderWidth: 1, borderColor: '#E5E7EB',
    gap: 8,
  },
  pickedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pickedText: { fontSize: 12, color: '#374151', fontWeight: '600', flexShrink: 1 },
  pickedDot: { color: '#9CA3AF', fontSize: 12 },

  // Details step
  form: { padding: 22, gap: 6 },
  formLabel: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 14 },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#111827',
    borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 6,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  select: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: '#E5E7EB',
    marginTop: 6,
  },
  selectText: { fontSize: 14, color: '#111827' },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownText: { fontSize: 13, color: '#1a1a2e' },

  // Preview step
  previewWrap: { padding: 18, gap: 16 },
  previewPlayer: {
    width: '100%', aspectRatio: 9 / 14,
    backgroundColor: '#000',
    borderRadius: 14,
  },
  previewMetaCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  previewTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e' },
  previewBadgeRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 6 },
  topicBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EDE9FE', borderRadius: 12,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  topicBadgeText: { color: PURPLE, fontSize: 11, fontWeight: '700' },
  durBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3F4F6', borderRadius: 12,
    paddingHorizontal: 9, paddingVertical: 4,
  },
  durBadgeText: { color: '#374151', fontSize: 11, fontWeight: '700' },
  previewDesc: { fontSize: 13, color: '#374151', marginTop: 4, lineHeight: 18 },
  reviewNotice: {
    flexDirection: 'row', gap: 8, padding: 12,
    backgroundColor: '#EFF6FF', borderRadius: 10,
    borderWidth: 1, borderColor: '#BFDBFE',
    alignItems: 'flex-start',
  },
  reviewNoticeText: { flex: 1, fontSize: 12, color: '#1E40AF', lineHeight: 18 },

  footer: {
    padding: 16, paddingBottom: 22,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  ctaBtn:     { borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Success
  successWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, position: 'relative' },
  confettiTopLeft:  { position: 'absolute', top: 60, left: 30 },
  confettiTopRight: { position: 'absolute', top: 100, right: 40 },
  checkCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: GREEN,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GREEN, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 10,
    marginBottom: 28,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 12, textAlign: 'center' },
  successSub:   { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
  successBtn: {
    marginTop: 36, backgroundColor: GREEN,
    borderRadius: 14, paddingHorizontal: 36, paddingVertical: 15,
  },
  successBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  successSecondaryBtn: {
    marginTop: 10, paddingHorizontal: 24, paddingVertical: 12,
  },
  successSecondaryText: { color: PURPLE, fontSize: 13, fontWeight: '700' },
});
