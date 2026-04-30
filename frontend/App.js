import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
  StatusBar, Alert, Platform,
} from 'react-native';
import { API_BASE_URL } from './src/utils/constants';
import LiveSessionScreen from './src/screens/LiveSessionScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import { NotificationProvider, useNotification } from './src/context/NotificationContext';
import { connectSocket } from './src/services/socket';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Tab Icons ────────────────────────────────────────────────────────────────
const TabIcon = ({ icon, label, focused }) => (
  <View style={tabS.item}>
    <View style={[tabS.iconWrap, focused && tabS.iconWrapActive]}>
      <Text style={[tabS.icon, focused && tabS.iconActive]}>{icon}</Text>
    </View>
    <Text style={[tabS.label, focused && tabS.labelActive]}>{label}</Text>
  </View>
);

const tabS = StyleSheet.create({
  item: { alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  iconWrap: {
    width: 44, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: '#7C3AED' },
  icon: { fontSize: 20 },
  iconActive: {},
  label: { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  labelActive: { color: '#7C3AED', fontWeight: '700' },
});

// ─── Placeholder Screens ──────────────────────────────────────────────────────
const PlaceholderScreen = ({ title, icon }) => (
  <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
    <Text style={{ fontSize: 48, marginBottom: 12 }}>{icon}</Text>
    <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{title}</Text>
    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>Coming soon</Text>
  </SafeAreaView>
);

// ─── Live Sessions Stack ──────────────────────────────────────────────────────
const LiveSessionsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="LiveSessionList">
      {(props) => <LiveSessionScreen {...props} route={{ ...props.route, params: {} }} />}
    </Stack.Screen>
    <Stack.Screen name="LiveSession" component={LiveSessionScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

// ─── Tab Navigator ────────────────────────────────────────────────────────────
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        height: Platform.OS === 'ios' ? 80 : 62,
        paddingBottom: Platform.OS === 'ios' ? 20 : 4,
        paddingTop: 4,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
    }}
  >
    <Tab.Screen
      name="Home"
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Home" focused={focused} /> }}
    >
      {() => <PlaceholderScreen title="Home" icon="🏠" />}
    </Tab.Screen>

    <Tab.Screen
      name="MyLearning"
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📖" label="My Learning" focused={focused} /> }}
    >
      {() => <PlaceholderScreen title="My Learning" icon="📖" />}
    </Tab.Screen>

    <Tab.Screen
      name="LiveSessions"
      component={LiveSessionsStack}
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📹" label="Live Sessions" focused={focused} /> }}
    />

    <Tab.Screen
      name="Achievements"
      options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏆" label="Achievements" focused={focused} /> }}
    >
      {() => <PlaceholderScreen title="Achievements" icon="🏆" />}
    </Tab.Screen>
  </Tab.Navigator>
);

// ─── Login Screen ─────────────────────────────────────────────────────────────
const LoginScreen = ({ navigation }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const url = `${API_BASE_URL}/auth/${mode}`;
      const body = mode === 'register'
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Request failed');
      await AsyncStorage.setItem('token', json.data.token);
      navigation.replace('Main');
    } catch (err) {
      setError(err?.message || 'Something went wrong. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={ls.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />
      <View style={ls.box}>
        <View style={ls.logoRow}>
          <View style={ls.logoIcon}><Text style={{ fontSize: 28 }}>📹</Text></View>
          <Text style={ls.logoTitle}>Bodha LMS</Text>
        </View>
        <Text style={ls.sub}>{mode === 'login' ? 'Sign in to continue' : 'Create your account'}</Text>

        {!!error && <View style={ls.errorBox}><Text style={ls.errorText}>{error}</Text></View>}

        {mode === 'register' && (
          <TextInput style={ls.input} placeholder="Full Name" placeholderTextColor="#9CA3AF"
            value={name} onChangeText={setName} autoCapitalize="words" />
        )}
        <TextInput style={ls.input} placeholder="Email" placeholderTextColor="#9CA3AF"
          value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={ls.input} placeholder="Password" placeholderTextColor="#9CA3AF"
          value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={ls.btn} onPress={submit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={ls.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} style={ls.switchRow}>
          <Text style={ls.switchText}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Text style={ls.switchLink}>{mode === 'login' ? 'Register' : 'Sign In'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const ls = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#4C1D95', justifyContent: 'center' },
  box: {
    marginHorizontal: 28, backgroundColor: '#fff',
    borderRadius: 20, padding: 28, elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  logoIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center',
  },
  logoTitle: { fontSize: 24, fontWeight: '800', color: '#4C1D95' },
  sub: { color: '#6B7280', fontSize: 14, marginBottom: 20 },
  errorBox: {
    backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1,
    borderColor: '#FECACA', padding: 10, marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '500' },
  input: {
    backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 15, color: '#111827',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14,
  },
  btn: { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow: { alignItems: 'center', marginTop: 18 },
  switchText: { color: '#6B7280', fontSize: 13 },
  switchLink: { color: '#7C3AED', fontWeight: '700' },
});

// ─── App Inner — runs inside NotificationProvider so it can use context ───────
const AppInner = ({ initialRoute }) => {
  const { setUnreadCount } = useNotification();

  useEffect(() => {
    if (initialRoute !== 'Main') return;
    let mounted = true;
    const setup = async () => {
      const socket = await connectSocket();
      socket.on('notification:new', (notif) => {
        if (!mounted) return;
        setUnreadCount((c) => c + 1);
        Alert.alert(
          notif.title || 'New Notification',
          notif.message || '',
          [{ text: 'OK' }],
          { cancelable: true }
        );
      });
    };
    setup();
    return () => { mounted = false; };
  }, [initialRoute, setUnreadCount]);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main" component={TabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('token').then(async (t) => {
      // Clear leftover dev mock token — it's not a real JWT
      if (!t || t === 'mock-token-for-preview' || !t.startsWith('eyJ')) {
        await AsyncStorage.removeItem('token');
        setInitialRoute('Login');
      } else {
        setInitialRoute('Main');
      }
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#4C1D95' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NotificationProvider>
      <AppInner initialRoute={initialRoute} />
    </NotificationProvider>
  );
}
