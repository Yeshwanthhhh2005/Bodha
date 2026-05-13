import React, { useState, useEffect } from 'react';
import { NavigationContainer, createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { setAuthFailureHandler } from './src/services/api';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView,
  StatusBar, Alert, Platform,
} from 'react-native';
import { API_BASE_URL } from './src/utils/constants';
import LiveSessionScreen from './src/screens/LiveSessionScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ClassScheduleScreen from './src/screens/ClassScheduleScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ChallengesScreen from './src/screens/ChallengesScreen';
import HomeScreen from './src/screens/HomeScreen';
import AIHelpScreen from './src/screens/AIHelpScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import PuzzleScreen from './src/screens/PuzzleScreen';
import ShortsScreen from './src/screens/ShortsScreen';
import ShortsFeedScreen from './src/screens/ShortsFeedScreen';
import ShortsPlayerScreen from './src/screens/ShortsPlayerScreen';
import UploadShortScreen from './src/screens/UploadShortScreen';
import TopCreatorsScreen from './src/screens/TopCreatorsScreen';
import MindTwisterScreen from './src/screens/MindTwisterScreen';
import ChatBubble from './src/components/ChatBubble';
import { NotificationProvider, useNotification } from './src/context/NotificationContext';
import { connectSocket } from './src/services/socket';
import type { RootStackParamList, LiveSessionsStackParamList } from './src/types';

const navigationRef = createNavigationContainerRef<RootStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const LiveStack = createNativeStackNavigator<LiveSessionsStackParamList>();
const LeaderStack = createNativeStackNavigator();
const ShortsStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const LeaderboardStack: React.FC = () => (
  <LeaderStack.Navigator screenOptions={{ headerShown: false }}>
    <LeaderStack.Screen name="Leaderboard" component={LeaderboardScreen as React.ComponentType<object>} />
    <LeaderStack.Screen name="Challenges" component={ChallengesScreen as React.ComponentType<object>} />
  </LeaderStack.Navigator>
);

// ─── 30 Sec Shorts Stack (NPT-020) ────────────────────────────────────────────
const ShortsNavigator: React.FC = () => (
  <ShortsStack.Navigator screenOptions={{ headerShown: false }}>
    <ShortsStack.Screen name="ShortsHome"    component={ShortsScreen as React.ComponentType<object>} />
    <ShortsStack.Screen name="ShortsFeed"    component={ShortsFeedScreen as React.ComponentType<object>} />
    <ShortsStack.Screen name="ShortsPlayer"  component={ShortsPlayerScreen as React.ComponentType<object>} />
    <ShortsStack.Screen name="UploadShort"   component={UploadShortScreen as React.ComponentType<object>} />
    <ShortsStack.Screen name="TopCreators"   component={TopCreatorsScreen as React.ComponentType<object>} />
  </ShortsStack.Navigator>
);

// ─── Tab Icons ────────────────────────────────────────────────────────────────
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  iconActive: IoniconName;
  iconInactive: IoniconName;
  label: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ iconActive, iconInactive, label, focused }) => (
  <View style={tabS.item}>
    <View style={[tabS.iconWrap, focused && tabS.iconWrapActive]}>
      <Ionicons
        name={focused ? iconActive : iconInactive}
        size={20}
        color={focused ? '#fff' : '#9CA3AF'}
      />
    </View>
    <Text style={[tabS.label, focused && tabS.labelActive]}>{label}</Text>
  </View>
);

const tabS = StyleSheet.create({
  item:          { alignItems: 'center', justifyContent: 'center', paddingTop: 6 },
  iconWrap:      { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive:{ backgroundColor: '#7C3AED' },
  label:         { fontSize: 10, color: '#9CA3AF', marginTop: 2, fontWeight: '500' },
  labelActive:   { color: '#7C3AED', fontWeight: '700' },
});

// ─── Placeholder Screens ──────────────────────────────────────────────────────
interface PlaceholderScreenProps {
  title: string;
  iconName: IoniconName;
}

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({ title, iconName }) => (
  <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
    <Ionicons name={iconName} size={56} color="#D1D5DB" style={{ marginBottom: 12 }} />
    <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{title}</Text>
    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6 }}>Coming soon</Text>
  </SafeAreaView>
);

// ─── Live Sessions Stack ──────────────────────────────────────────────────────
const LiveSessionsStack: React.FC = () => (
  <LiveStack.Navigator screenOptions={{ headerShown: false }}>
    <LiveStack.Screen name="LiveSessionList">
      {(props) => <LiveSessionScreen navigation={props.navigation} />}
    </LiveStack.Screen>
    <LiveStack.Screen name="LiveSession" component={LiveSessionScreen as React.ComponentType<object>} />
    <LiveStack.Screen name="Notifications" component={NotificationsScreen as React.ComponentType<object>} />
  </LiveStack.Navigator>
);

// ─── Tab Navigator ────────────────────────────────────────────────────────────
const TabNavigator: React.FC = () => (
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
      component={HomeScreen as React.ComponentType<object>}
      options={{
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <TabIcon iconActive="home" iconInactive="home-outline" label="Home" focused={focused} />
        ),
      }}
    />

    <Tab.Screen
      name="AIHelp"
      component={AIHelpScreen as React.ComponentType<object>}
      options={{
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <TabIcon iconActive="sparkles" iconInactive="sparkles-outline" label="AI Help" focused={focused} />
        ),
      }}
    />

    <Tab.Screen
      name="Courses"
      component={CoursesScreen as React.ComponentType<object>}
      options={{
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <TabIcon iconActive="library" iconInactive="library-outline" label="Courses" focused={focused} />
        ),
      }}
    />

    <Tab.Screen
      name="Puzzle"
      component={PuzzleScreen as React.ComponentType<object>}
      options={{
        tabBarIcon: ({ focused }: { focused: boolean }) => (
          <TabIcon iconActive="extension-puzzle" iconInactive="extension-puzzle-outline" label="Puzzle" focused={focused} />
        ),
      }}
    />
  </Tab.Navigator>
);

// ─── Login Screen ─────────────────────────────────────────────────────────────
interface LoginScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const submit = async (): Promise<void> => {
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
      const body =
        mode === 'register'
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={ls.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#4C1D95" />
      <View style={ls.box}>
        <View style={ls.logoRow}>
          <View style={ls.logoIcon}><Ionicons name="videocam" size={28} color="#7C3AED" /></View>
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

        <TouchableOpacity
          onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={ls.switchRow}
        >
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
  safe:       { flex: 1, backgroundColor: '#4C1D95', justifyContent: 'center' },
  box:        { marginHorizontal: 28, backgroundColor: '#fff', borderRadius: 20, padding: 28, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12 },
  logoRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  logoIcon:   { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  logoTitle:  { fontSize: 24, fontWeight: '800', color: '#4C1D95' },
  sub:        { color: '#6B7280', fontSize: 14, marginBottom: 20 },
  errorBox:   { backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', padding: 10, marginBottom: 14 },
  errorText:  { color: '#DC2626', fontSize: 13, fontWeight: '500' },
  input:      { backgroundColor: '#F9FAFB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14 },
  btn:        { backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchRow:  { alignItems: 'center', marginTop: 18 },
  switchText: { color: '#6B7280', fontSize: 13 },
  switchLink: { color: '#7C3AED', fontWeight: '700' },
});

// ─── App Inner ────────────────────────────────────────────────────────────────
interface AppInnerProps {
  initialRoute: 'Login' | 'Main';
}

const AppInner: React.FC<AppInnerProps> = ({ initialRoute }) => {
  const { setUnreadCount } = useNotification();

  useEffect(() => {
    if (initialRoute !== 'Main') return;
    let mounted = true;
    const setup = async (): Promise<void> => {
      const socket = await connectSocket();
      socket.on('notification:new', (notif: { title?: string; message?: string }) => {
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

  useEffect(() => {
    setAuthFailureHandler(() => {
      if (navigationRef.isReady()) {
        navigationRef.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
        );
      }
    });
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <View style={{ flex: 1 }}>
        <RootStack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Login" component={LoginScreen} />
          <RootStack.Screen name="Main" component={TabNavigator} />

          {/* Feature screens accessible from Home cards (overlay above tabs) */}
          <RootStack.Screen
            name="ShortsRoot"
            component={ShortsNavigator as React.ComponentType<object>}
            options={{ animation: 'slide_from_bottom' }}
          />
          <RootStack.Screen
            name="LiveSessionsRoot"
            component={LiveSessionsStack as React.ComponentType<object>}
            options={{ animation: 'slide_from_right' }}
          />
          <RootStack.Screen
            name="ClassScheduleRoot"
            component={ClassScheduleScreen as React.ComponentType<object>}
            options={{ animation: 'slide_from_right' }}
          />
          <RootStack.Screen
            name="AchievementsRoot"
            component={LeaderboardStack as React.ComponentType<object>}
            options={{ animation: 'slide_from_right' }}
          />
          <RootStack.Screen
            name="MindTwisterRoot"
            component={MindTwisterScreen as React.ComponentType<object>}
            options={{ animation: 'slide_from_right' }}
          />
        </RootStack.Navigator>

        {/* Floating chat bubble — visible on every screen */}
        <ChatBubble />
      </View>
    </NavigationContainer>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App(): React.ReactElement | null {
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Main' | null>(null);

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
