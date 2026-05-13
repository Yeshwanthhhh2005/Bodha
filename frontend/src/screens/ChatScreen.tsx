// npm install react-native-webview
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

interface Props { navigation: any }

export default function ChatScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <WebView
        source={{ uri: 'http://localhost:5055/embed/e97fb99d-7a25-478b-8df1-23945cc3c587' }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={(e) => {
          if (e.nativeEvent.data === 'botgpt:close') {
            navigation.goBack();
          }
        }}
      />
    </SafeAreaView>
  );
}
