import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { shortsAPI } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const TOPICS = [
  'Data Structures', 'Algorithms', 'DBMS', 'OS', 'Computer Networks',
  'SQL', 'Web Development', 'System Design', 'Other',
];

const MAX_DURATION = 30; // seconds
const ALLOWED_FORMATS = ['mp4', 'mov'];

// ─── Types ────────────────────────────────────────────────────────────────────
interface VideoFile {
  uri: string;              // local file:// URI (or content://) from picker
  name: string;
  mimeType: string;
  durationSec: number;
  source: 'camera' | 'gallery';
}

interface Props { navigation: any }

const extOf = (name: string): string => (name.split('.').pop() ?? '').toLowerCase();

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function UploadShortScreen({ navigation }: Props) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);  // 4 == success
  const [video, setVideo] = useState<VideoFile | null>(null);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ── Step 1 — Real camera / gallery via expo-image-picker ─────────────────
  const handlePicked = (asset: ImagePicker.ImagePickerAsset, source: 'camera' | 'gallery') => {
    // expo returns duration in MS (or undefined). Fall back to MAX_DURATION
    // so the user still gets to step 2 and we'll validate before upload.
    const durationSec = Math.max(1, Math.round((asset.duration ?? 0) / 1000) || MAX_DURATION);

    // Derive a filename + mime type. expo gives us fileName sometimes.
    const fallbackName = asset.uri.split('/').pop() || `short-${Date.now()}.mp4`;
    const name = asset.fileName || fallbackName;
    const ext = extOf(name);
    const mimeType = asset.mimeType
      || (ext === 'mov' ? 'video/quicktime' : 'video/mp4');

    // Enforce duration cap before letting the user proceed
    if (durationSec > MAX_DURATION) {
      return Alert.alert(
        'Video too long',
        `That clip is ${durationSec}s. Please choose a video up to ${MAX_DURATION} seconds.`,
      );
    }
    // Enforce format
    if (!ALLOWED_FORMATS.includes(ext)) {
      return Alert.alert(
        'Unsupported format',
        `Only ${ALLOWED_FORMATS.join('/').toUpperCase()} files are supported.`,
      );
    }

    setVideo({ uri: asset.uri, name, mimeType, durationSec, source });
    setStep(2);
  };

  const recordWithCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert(
        'Camera permission needed',
        'Please allow camera access in Settings to record a short.',
      );
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: MAX_DURATION,
      quality: 0.8,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    handlePicked(res.assets[0], 'camera');
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return Alert.alert(
        'Library permission needed',
        'Please allow photo-library access in Settings to upload a short.',
      );
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
      videoMaxDuration: MAX_DURATION,
      allowsEditing: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    handlePicked(res.assets[0], 'gallery');
  };

  // ── Step 3 — Preview / Upload ───────────────────────────────────────────
  const submit = async () => {
    if (!video) return;
    if (!title.trim()) return Alert.alert('Title required', 'Please add a catchy title for your short.');
    if (!topic)        return Alert.alert('Topic required', 'Please select a topic.');

    // Validation guard
    if (video.durationSec > MAX_DURATION) {
      return Alert.alert('Too long', `Max ${MAX_DURATION} seconds allowed.`);
    }
    const ext = extOf(video.name);
    if (!ALLOWED_FORMATS.includes(ext)) {
      return Alert.alert('Invalid format', 'Only MP4/MOV are allowed.');
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('title', title.trim());
      form.append('topic', topic);
      form.append('description', description.trim());
      form.append('durationSec', String(video.durationSec));
      // RN's FormData expects { uri, name, type } for files. The cast keeps TS happy.
      form.append('video', {
        uri: video.uri,
        name: video.name,
        type: video.mimeType,
      } as any);

      await shortsAPI.upload(form);
      setStep(4);
    } catch (err: any) {
      const msg = err?.message
        || err?.response?.data?.message
        || 'Upload failed — please check your connection and try again.';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploading(false);
    }
  };

  // ── Render: Step 4 (success) ─────────────────────────────────────────────
  if (step === 4) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={s.successWrap}>
          <View style={s.confetti}>
            <MaterialCommunityIcons name="party-popper" size={42} color="#F59E0B" />
          </View>
          <View style={s.successCheck}>
            <Ionicons name="checkmark" size={44} color="#fff" />
          </View>
          <Text style={s.successTitle}>Uploaded Successfully!</Text>
          <Text style={s.successSub}>
            Your video is under review.{'\n'}You will be notified once it's live.
          </Text>
          <TouchableOpacity
            style={s.successBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('ShortsFeed', { section: 'student' })}
          >
            <Text style={s.successBtnText}>Go to Student Shorts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.successBtn, { backgroundColor: '#F3F4F6', marginTop: 10 }]}
            activeOpacity={0.85}
            onPress={() => navigation.popToTop()}
          >
            <Text style={[s.successBtnText, { color: '#374151' }]}>Back to Shorts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => step === 1 ? navigation.goBack() : setStep((step - 1) as any)}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Upload Short</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Stepper */}
      <View style={s.stepper}>
        {[1, 2, 3].map((n) => (
          <React.Fragment key={n}>
            <View style={s.stepItem}>
              <View style={[s.stepCircle, step >= (n as any) && s.stepCircleActive, step === (n as any) && s.stepCircleCurrent]}>
                <Text style={[s.stepCircleText, step >= (n as any) && { color: '#fff' }]}>{n}</Text>
              </View>
              <Text style={[s.stepLabel, step === (n as any) && s.stepLabelActive]}>
                {n === 1 ? 'Record' : n === 2 ? 'Details' : 'Preview'}
              </Text>
            </View>
            {n < 3 && <View style={[s.stepLine, step > n && s.stepLineActive]} />}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* ── Step 1: Record / Pick ───────────────────────── */}
        {step === 1 && (
          <View style={s.stepBody}>
            <TouchableOpacity
              style={s.bigCameraBtn}
              activeOpacity={0.85}
              onPress={recordWithCamera}
            >
              <View style={s.bigCameraIcon}>
                <Ionicons name="videocam" size={36} color="#fff" />
              </View>
              <Text style={s.bigCameraTitle}>Record with Camera</Text>
              <Text style={s.bigCameraSub}>Capture a clip up to {MAX_DURATION} seconds</Text>
            </TouchableOpacity>

            <Text style={s.orDivider}>— or —</Text>

            <TouchableOpacity style={s.galleryBtn} onPress={pickFromGallery} activeOpacity={0.85}>
              <Ionicons name="images-outline" size={18} color="#7C3AED" style={{ marginRight: 8 }} />
              <Text style={s.galleryBtnText}>Upload from Gallery</Text>
            </TouchableOpacity>

            <View style={s.rulesCard}>
              <Text style={s.rulesTitle}>Upload Rules</Text>
              <Text style={s.ruleLine}>• Max duration: 30 seconds</Text>
              <Text style={s.ruleLine}>• Allowed formats: MP4, MOV</Text>
              <Text style={s.ruleLine}>• Portrait orientation preferred</Text>
              <Text style={s.ruleLine}>• Uploads start as "Pending Review"</Text>
            </View>
          </View>
        )}

        {/* ── Step 2: Details ─────────────────────────────── */}
        {step === 2 && video && (
          <View style={s.stepBody}>
            <View style={s.videoCard}>
              <Video
                source={{ uri: video.uri }}
                style={s.videoPreview}
                resizeMode={ResizeMode.COVER}
                useNativeControls
                isLooping
              />
              <View style={s.videoChip}>
                <MaterialCommunityIcons name={video.source === 'camera' ? 'video' : 'video-image'} size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={s.videoChipText}>{video.source === 'camera' ? 'Recorded' : 'From Gallery'}  •  {video.durationSec}s</Text>
              </View>
            </View>

            <Text style={s.label}>Title</Text>
            <TextInput
              style={s.input}
              placeholder="Enter a catchy title"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={(t) => t.length <= 80 && setTitle(t)}
            />
            <Text style={s.helper}>{title.length}/80</Text>

            <Text style={s.label}>Topic</Text>
            <TouchableOpacity style={s.select} onPress={() => setShowTopicPicker((x) => !x)} activeOpacity={0.8}>
              <Text style={{ fontSize: 14, color: topic ? '#111827' : '#9CA3AF' }}>
                {topic || 'Select Topic'}
              </Text>
              <Ionicons name={showTopicPicker ? 'chevron-up' : 'chevron-down'} size={16} color="#9CA3AF" />
            </TouchableOpacity>
            {showTopicPicker && (
              <View style={s.topicList}>
                {TOPICS.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={s.topicListItem}
                    onPress={() => { setTopic(t); setShowTopicPicker(false); }}
                  >
                    <Text style={[s.topicListText, topic === t && { color: '#10B981', fontWeight: '700' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.label}>Description (Optional)</Text>
            <TextInput
              style={[s.input, { height: 90, textAlignVertical: 'top' }]}
              placeholder="Add a short description..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={description}
              onChangeText={(t) => t.length <= 250 && setDescription(t)}
            />
            <Text style={s.helper}>{description.length}/250</Text>

            <TouchableOpacity
              style={[s.primaryBtn, (!title.trim() || !topic) && { opacity: 0.55 }]}
              disabled={!title.trim() || !topic}
              onPress={() => setStep(3)}
              activeOpacity={0.85}
            >
              <Text style={s.primaryBtnText}>Next</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Step 3: Preview / Submit ───────────────────── */}
        {step === 3 && video && (
          <View style={s.stepBody}>
            <View style={s.previewCard}>
              <View style={s.previewThumb}>
                <Video
                  source={{ uri: video.uri }}
                  style={s.previewVideoPlayer}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  shouldPlay={false}
                  useNativeControls
                />
                <View style={s.previewDuration}><Text style={s.previewDurationText}>{`00:${String(video.durationSec).padStart(2, '0')}`}</Text></View>
              </View>
              <View style={{ flex: 1, paddingLeft: 14, justifyContent: 'space-between' }}>
                <View>
                  <Text style={s.previewTitle} numberOfLines={2}>{title || 'Untitled'}</Text>
                  <Text style={s.previewLabel}>Topic</Text>
                  <Text style={s.previewValue}>{topic}</Text>
                </View>
                <View>
                  <Text style={s.previewLabel}>Description</Text>
                  <Text style={s.previewValue} numberOfLines={3}>
                    {description || 'No description provided.'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={s.noticeCard}>
              <Ionicons name="information-circle" size={20} color="#D97706" />
              <Text style={s.noticeText}>
                Your video will go into{' '}
                <Text style={{ fontWeight: '800' }}>Pending Review</Text>. We'll notify you once it's approved or rejected.
              </Text>
            </View>

            <TouchableOpacity
              style={[s.primaryBtn, uploading && { opacity: 0.7 }]}
              disabled={uploading}
              onPress={submit}
              activeOpacity={0.85}
            >
              {uploading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Upload</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },

  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, paddingHorizontal: 24, gap: 8 },
  stepItem: { alignItems: 'center', gap: 6 },
  stepCircle:        { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  stepCircleActive:  { backgroundColor: '#10B981', borderColor: '#10B981' },
  stepCircleCurrent: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  stepCircleText:    { fontSize: 13, fontWeight: '800', color: '#9CA3AF' },
  stepLabel:         { fontSize: 11, color: '#9CA3AF', fontWeight: '600' },
  stepLabelActive:   { color: '#7C3AED', fontWeight: '800' },
  stepLine:          { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginBottom: 22, marginHorizontal: 4 },
  stepLineActive:    { backgroundColor: '#10B981' },

  stepBody: { paddingHorizontal: 18, paddingTop: 6 },

  // Step 1
  bigCameraBtn:   { backgroundColor: '#fff', borderRadius: 18, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  bigCameraIcon:  { width: 88, height: 88, borderRadius: 44, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  bigCameraTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  bigCameraSub:   { fontSize: 12, color: '#6B7280', marginTop: 4 },
  orDivider:         { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginVertical: 18 },
  galleryBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#7C3AED', borderRadius: 12, paddingVertical: 14 },
  galleryBtnText:    { color: '#7C3AED', fontSize: 14, fontWeight: '800' },
  rulesCard:         { marginTop: 22, backgroundColor: '#F5F3FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' },
  rulesTitle:        { fontSize: 13, fontWeight: '800', color: '#4C1D95', marginBottom: 6 },
  ruleLine:          { fontSize: 12, color: '#5B21B6', lineHeight: 18 },

  // Step 2
  videoCard:     { backgroundColor: '#111827', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 18 },
  videoPreview:  { width: '100%', height: 220, borderRadius: 8, backgroundColor: '#000', marginBottom: 12 },
  videoChip:     { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  videoChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  label:        { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 6 },
  helper:       { fontSize: 10, color: '#9CA3AF', textAlign: 'right', marginTop: 4 },
  input:        { backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' },
  select:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 14, paddingVertical: 12 },
  topicList:    { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 6, overflow: 'hidden' },
  topicListItem:{ paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  topicListText:{ fontSize: 13, color: '#374151' },

  primaryBtn:     { marginTop: 22, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Step 3 preview
  previewCard:        { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 12, flexDirection: 'row', borderWidth: 1, borderColor: '#F3F4F6' },
  previewThumb:       { width: 130, height: 180, borderRadius: 10, backgroundColor: '#000', overflow: 'hidden', position: 'relative' },
  previewVideoPlayer: { width: '100%', height: '100%' },
  previewDuration:    { position: 'absolute', right: 6, bottom: 6, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  previewDurationText:{ fontSize: 9, color: '#fff', fontWeight: '700' },
  previewTitle:       { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 8 },
  previewLabel:       { fontSize: 10, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  previewValue:       { fontSize: 12, color: '#374151', fontWeight: '600', marginTop: 2 },

  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, marginTop: 16, borderWidth: 1, borderColor: '#FDE68A' },
  noticeText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },

  // Success
  successWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  confetti:       { position: 'absolute', top: '20%' },
  successCheck:   { width: 90, height: 90, borderRadius: 45, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  successTitle:   { fontSize: 20, fontWeight: '800', color: '#111827' },
  successSub:     { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 8, lineHeight: 19 },
  successBtn:     { marginTop: 22, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 28, alignItems: 'center', alignSelf: 'stretch' },
  successBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
