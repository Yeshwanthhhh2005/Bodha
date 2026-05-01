# Bodha LMS — Expo (Frontend) Dependencies

Install all at once:

```bash
cd frontend
npm install
```

Or install manually:

```bash
npx expo install expo@~54.0.0 expo-status-bar@~3.0.9 react@19.1.0 react-native@0.81.5
npx expo install @react-native-async-storage/async-storage@2.2.0
npx expo install react-native-safe-area-context@~5.6.0 react-native-screens@~4.16.0 react-native-webview@13.15.0
npx expo install @react-navigation/native@^6.1.17 @react-navigation/native-stack@^6.9.26 @react-navigation/bottom-tabs@^6.6.1
npm install socket.io-client@^4.7.5 axios@^1.7.2
npm install --save-dev typescript@~5.8.3 @types/react@~19.0.10 @babel/core@^7.24.0 babel-preset-expo@~54.0.10
```

---

## Runtime Dependencies

| Package | Version | Purpose |
|---|---|---|
| `expo` | ~54.0.0 | Core Expo SDK |
| `expo-status-bar` | ~3.0.9 | Status bar control |
| `react` | 19.1.0 | React core |
| `react-native` | 0.81.5 | React Native core |
| `@react-native-async-storage/async-storage` | 2.2.0 | Token / local storage |
| `react-native-safe-area-context` | ~5.6.0 | Safe area insets |
| `react-native-screens` | ~4.16.0 | Native screen containers |
| `react-native-webview` | 13.15.0 | Secure YouTube video player |
| `@react-navigation/native` | ^6.1.17 | Navigation core |
| `@react-navigation/native-stack` | ^6.9.26 | Stack navigator |
| `@react-navigation/bottom-tabs` | ^6.6.1 | Bottom tab navigator |
| `socket.io-client` | ^4.7.5 | Real-time socket connection |
| `axios` | ^1.7.2 | HTTP client |

## Dev Dependencies

| Package | Version | Purpose |
|---|---|---|
| `typescript` | ~5.8.3 | TypeScript compiler |
| `@types/react` | ~19.0.10 | React type definitions |
| `@babel/core` | ^7.24.0 | Babel core (required by Expo) |
| `babel-preset-expo` | ~54.0.10 | Expo Babel preset (handles TS transpilation) |

---

## Notes

- Use `npx expo install` (not plain `npm install`) for Expo-managed packages — it picks versions compatible with your Expo SDK version.
- Requires **Node.js 18+** and **Expo CLI**: `npm install -g expo-cli`
- To run: `cd frontend && npm start` then scan the QR code with the Expo Go app.
