// Floating chat bubble that matches your dashboard customization
// (color, avatar, bot name) and shows on every screen.
//
// Mounted ONCE at the root of the navigator in App.tsx
// so the bubble appears on every screen automatically.

import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, Modal, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SOCKET_URL } from '../utils/constants';

const API_BASE   = SOCKET_URL.replace(':5000', ':5055');
const PROJECT_ID = 'e97fb99d-7a25-478b-8df1-23945cc3c587';

type BotConfig = { theme_color: string; avatar_url: string; bot_name: string };
const DEFAULT_CFG: BotConfig = { theme_color: '#6366f1', avatar_url: '', bot_name: 'Chat' };

export default function ChatBubble() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg]   = useState<BotConfig>(DEFAULT_CFG);

  // Fetch the project's customization so the bubble matches the dashboard.
  useEffect(() => {
    fetch(`${API_BASE}/api/widget/config?project_id=${PROJECT_ID}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setCfg({
          theme_color: d.theme_color || DEFAULT_CFG.theme_color,
          avatar_url:  d.avatar_url  || '',
          bot_name:    d.bot_name    || DEFAULT_CFG.bot_name,
        });
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        accessibilityLabel={`Open ${cfg.bot_name}`}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: cfg.theme_color,
          alignItems: 'center', justifyContent: 'center',
          elevation: 8, zIndex: 9999,
          shadowColor: '#000', shadowOpacity: 0.3,
          shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
        }}
      >
        {cfg.avatar_url ? (
          <Image source={{ uri: cfg.avatar_url }} style={{ width: 36, height: 36, borderRadius: 18 }} />
        ) : (
          <Text style={{ color: '#fff', fontSize: 24 }}>💬</Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <WebView
            source={{ uri: `${API_BASE}/embed/${PROJECT_ID}` }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            startInLoadingState
            renderLoading={() => (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={cfg.theme_color} />
              </View>
            )}
            onMessage={(e) => { if (e.nativeEvent.data === 'botgpt:close') setOpen(false); }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
