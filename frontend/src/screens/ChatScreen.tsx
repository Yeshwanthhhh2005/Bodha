// Floating chat bubble — import <ChatBubble /> and drop it inside any screen's
// root View. The FAB floats at bottom-right; tapping opens a slide-up sheet.

import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, SafeAreaView, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { SOCKET_URL } from '../utils/constants';

const CHATBOT_URL = `${SOCKET_URL.replace(':5000', ':5055')}/embed/e97fb99d-7a25-478b-8df1-23945cc3c587`;

export default function ChatBubble() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* floating chat bubble */}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.85}
        style={{
          position: 'absolute', bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: 28,
          backgroundColor: '#6366f1',
          alignItems: 'center', justifyContent: 'center',
          elevation: 8,
          shadowColor: '#000', shadowOpacity: 0.25,
          shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
        }}
      >
        <Text style={{ color: '#fff', fontSize: 24 }}>💬</Text>
      </TouchableOpacity>

      {/* slide-up chat sheet */}
      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <WebView
            source={{ uri: CHATBOT_URL }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            onMessage={(e) => {
              if (e.nativeEvent.data === 'botgpt:close') setOpen(false);
            }}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
