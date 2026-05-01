import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { playerAPI } from '../services/api';
import { SESSION_STATES, API_BASE_URL } from '../utils/constants';
import type { Session } from '../types';

interface VideoSectionProps {
  session: Session | null | undefined;
}

const LOCKDOWN_JS = `
(function(){
  document.addEventListener('contextmenu', function(e){ e.preventDefault(); e.stopPropagation(); return false; }, true);
  document.documentElement.style.webkitUserSelect = 'none';
  document.documentElement.style.userSelect = 'none';
  document.addEventListener('click', function(e){
    var t = e.target;
    while(t){ if(t.tagName === 'A'){ e.preventDefault(); e.stopPropagation(); return false; } t = t.parentElement; }
  }, true);
  document.addEventListener('keydown', function(e){
    if((e.ctrlKey||e.metaKey) && ['s','u','j','a','c','p'].indexOf(e.key.toLowerCase()) !== -1){
      e.preventDefault(); e.stopPropagation();
    }
  }, true);
  window.open = function(){ return null; };
  var _orig = window.addEventListener.bind(window);
  window.addEventListener = function(type, handler, opts){
    if(type === 'message') return;
    _orig(type, handler, opts);
  };
  true;
})();
`;

const formatCountdown = (ms: number): string => {
  if (ms <= 0) return 'Starting soon...';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const VideoSection: React.FC<VideoSectionProps> = ({ session }) => {
  const [playerToken, setPlayerToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<string>('');
  const webviewRef = useRef<WebView>(null);
  const sessionId = session?._id;
  const state = session?.state;

  useEffect(() => {
    if (state !== SESSION_STATES.UPCOMING || !session?.scheduledAt) return;
    const tick = (): void => {
      const diff = new Date(session.scheduledAt).getTime() - Date.now();
      setCountdown(formatCountdown(diff));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state, session?.scheduledAt]);

  const fetchToken = useCallback(async (): Promise<void> => {
    if (!sessionId || state === SESSION_STATES.UPCOMING) return;
    setTokenLoading(true);
    setTokenError(null);
    try {
      const res = await playerAPI.getToken(sessionId);
      setPlayerToken(res.data.token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Stream not available';
      setTokenError(message);
    } finally {
      setTokenLoading(false);
    }
  }, [sessionId, state]);

  useEffect(() => { fetchToken(); }, [fetchToken]);

  useEffect(() => {
    if (state === SESSION_STATES.LIVE || state === SESSION_STATES.COMPLETED) fetchToken();
  }, [state]);

  const playerUrl = playerToken
    ? `${API_BASE_URL.replace('/api', '')}/api/player/embed/${playerToken}`
    : null;

  const onShouldStartLoadWithRequest = (request: { url?: string }): boolean => {
    const url = request.url || '';
    if (url === 'about:blank') return true;
    if (url.includes('/api/player/embed/')) return true;
    return false;
  };

  const onWebViewError = (): void => {
    setPlayerToken(null);
    setTokenError('Player failed to load. Tap to retry.');
  };

  const sharedWebViewProps = {
    onShouldStartLoadWithRequest,
    injectedJavaScript: LOCKDOWN_JS,
    injectedJavaScriptBeforeContentLoaded: LOCKDOWN_JS,
    allowsLinkPreview: false,
    allowsBackForwardNavigationGestures: false,
    allowFileAccess: false,
    allowUniversalAccessFromFileURLs: false,
    allowsInlineMediaPlayback: true,
    mediaPlaybackRequiresUserAction: false,
    setSupportMultipleWindows: false,
    javaScriptCanOpenWindowsAutomatically: false,
    geolocationEnabled: false,
    onError: onWebViewError,
    onHttpError: onWebViewError,
    contextMenuEnabled: false,
    androidLayerType: 'hardware' as const,
  };

  if (isFullscreen && playerUrl) {
    return (
      <Modal
        visible
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => setIsFullscreen(false)}
      >
        <StatusBar hidden />
        <View style={styles.fullscreenContainer}>
          <WebView
            ref={webviewRef}
            source={{ uri: playerUrl }}
            {...sharedWebViewProps}
            style={styles.fullscreenWebview}
          />
          <TouchableOpacity style={styles.exitFullscreenBtn} onPress={() => setIsFullscreen(false)}>
            <Text style={styles.exitFullscreenIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  if (isMinimized) {
    return (
      <TouchableOpacity style={styles.minimizedBar} onPress={() => setIsMinimized(false)}>
        <View style={styles.minimizedLeft}>
          {state === SESSION_STATES.LIVE && <View style={styles.liveDotSmall} />}
          <Text style={styles.minimizedTitle} numberOfLines={1}>{session?.title}</Text>
        </View>
        <Text style={styles.expandText}>Tap to expand</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videoWrapper}>

        {state === SESSION_STATES.UPCOMING && (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>🕐</Text>
            <Text style={styles.placeholderTitle}>Session Not Started</Text>
            <Text style={styles.placeholderSub}>
              Starts at{' '}
              {session?.scheduledAt
                ? new Date(session.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'}
            </Text>
            {!!countdown && (
              <View style={styles.countdownPill}>
                <Text style={styles.countdownText}>⏱ {countdown}</Text>
              </View>
            )}
          </View>
        )}

        {tokenLoading && (
          <View style={styles.placeholder}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={styles.placeholderSub}>Connecting to stream...</Text>
          </View>
        )}

        {tokenError && !tokenLoading && (
          <TouchableOpacity style={styles.placeholder} onPress={fetchToken}>
            <Text style={styles.placeholderEmoji}>⚠️</Text>
            <Text style={styles.placeholderTitle}>{tokenError}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {playerUrl && !tokenLoading && !tokenError && (
          <WebView
            ref={webviewRef}
            source={{ uri: playerUrl }}
            {...sharedWebViewProps}
            style={styles.webview}
          />
        )}

        {(state === SESSION_STATES.LIVE || state === SESSION_STATES.DOUBT_SESSION) && (
          <View style={styles.topOverlay} pointerEvents="none">
            {state === SESSION_STATES.LIVE && (
              <>
                <View style={styles.liveBadge}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                <View style={styles.watcherBadge}>
                  <Text style={styles.watcherText}>👤 {session?.watcherCount ?? 0}</Text>
                </View>
              </>
            )}
            {state === SESSION_STATES.DOUBT_SESSION && (
              <View style={styles.doubtBadge}>
                <Text style={styles.doubtBadgeText}>DOUBT SESSION</Text>
              </View>
            )}
          </View>
        )}

        {playerUrl && !tokenLoading && !tokenError && (
          <View style={styles.bottomOverlay} pointerEvents="box-none">
            <View style={styles.bottomLeft}>
              {state === SESSION_STATES.LIVE && (
                <View style={styles.liveIndicator}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveIndicatorText}>LIVE</Text>
                </View>
              )}
              {state === SESSION_STATES.COMPLETED && (
                <Text style={styles.recordingLabel}>▶ Recording</Text>
              )}
            </View>
            <View style={styles.bottomRight}>
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => setIsFullscreen(true)}>
                <Text style={styles.ctrlIcon}>⛶</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ctrlBtn} onPress={() => setIsMinimized(true)}>
                <Text style={styles.ctrlIcon}>⬇</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0f0f1a', borderRadius: 16, overflow: 'hidden',
    marginHorizontal: 16, marginTop: 8, elevation: 6, shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8,
  },
  videoWrapper:        { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#0f0f1a', position: 'relative' },
  webview:             { flex: 1, backgroundColor: '#000' },
  fullscreenContainer: { flex: 1, backgroundColor: '#000' },
  fullscreenWebview:   { flex: 1 },
  exitFullscreenBtn:   { position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  exitFullscreenIcon:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  placeholder:         { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1a2e', gap: 8 },
  placeholderEmoji:    { fontSize: 32 },
  placeholderTitle:    { color: '#E2E8F0', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  placeholderSub:      { color: '#94A3B8', fontSize: 12, textAlign: 'center' },
  countdownPill:       { marginTop: 4, backgroundColor: 'rgba(124,58,237,0.3)', borderWidth: 1, borderColor: '#7C3AED', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
  countdownText:       { color: '#C4B5FD', fontSize: 13, fontWeight: '700' },
  retryText:           { color: '#7C3AED', fontSize: 12, fontWeight: '600', marginTop: 4 },
  topOverlay:          { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveBadge:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, gap: 5 },
  livePulseDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
  liveBadgeText:       { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  watcherBadge:        { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  watcherText:         { color: '#fff', fontSize: 12, fontWeight: '600' },
  doubtBadge:          { backgroundColor: '#7C3AED', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  doubtBadgeText:      { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  bottomOverlay:       { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(0,0,0,0.45)' },
  bottomLeft:          { flexDirection: 'row', alignItems: 'center' },
  bottomRight:         { flexDirection: 'row', gap: 10 },
  ctrlBtn:             { padding: 4 },
  ctrlIcon:            { fontSize: 15, color: '#fff' },
  liveIndicator:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot:             { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  liveDotSmall:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 6 },
  liveIndicatorText:   { color: '#fff', fontSize: 12, fontWeight: '600' },
  recordingLabel:      { color: '#94A3B8', fontSize: 12, fontWeight: '500' },
  minimizedBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', marginHorizontal: 16, marginTop: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  minimizedLeft:       { flexDirection: 'row', alignItems: 'center', flex: 1 },
  minimizedTitle:      { color: '#E2E8F0', fontSize: 13, fontWeight: '600', flex: 1 },
  expandText:          { color: '#818CF8', fontSize: 12, marginLeft: 8 },
});

export default VideoSection;
