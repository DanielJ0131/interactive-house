import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar, LogBox, Platform, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GuestProvider } from '../utils/GuestContext';
import "../global.css";

// 1. SILENCE KNOWN NOISY WARNINGS
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    'props.pointerEvents is deprecated',
    'Blocked aria-hidden on an element',
    'shadow* style props are deprecated',
  ]);
}

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
]);

// Prevent the splash screen from auto-hiding until fonts are ready
SplashScreen.preventAutoHideAsync();

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

// 2. THEME DEFINITION
const SmartHouseTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#020617', // Slate 950
    card: '#020617',
    border: '#1e293b',
    primary: '#0ea5e9',    // Sky 500
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (loaded && Platform.OS === 'web') {
      document.body.style.fontFamily = 'MaterialCommunityIcons';
      document.body.style.fontFamily = '';
    }
  }, [loaded]);

  // Handle font loading errors
  useEffect(() => {
    if (error) {
      console.error("Font loading error:", error);
    }
  }, [error]);

  // Hide splash screen once fonts are loaded
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Return null (keep splash screen visible) while fonts load
  if (!loaded) return null;

  return (
    <SafeAreaProvider style={{ backgroundColor: '#020617' }}>
      <GuestProvider>
        {/* 3. FONT PRE-WARMING 
          This hidden view "uses" the font immediately. 
          This prevents the browser's "preload was not used within a few seconds" warning.
        */}
        <View style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }}>
          <MaterialCommunityIcons name="microphone" />
        </View>

        <StatusBar
          barStyle="light-content"
          backgroundColor="#020617"
          translucent={false}
        />

        <RootLayoutNav />
      </GuestProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  return (
    <ThemeProvider value={SmartHouseTheme}>
      <Stack
        screenOptions={{
          // Fixes the "white flash" during navigation
          contentStyle: { backgroundColor: '#020617' },

          // Smoother transitions for both platforms
          animation: 'fade',

          // Performance optimization
          freezeOnBlur: true,

          headerShown: false,
        }}
      >
        {/* Define your main entry points */}
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />

        <Stack.Screen
          name="modal"
          options={{
            presentation: 'transparentModal',
            animation: 'fade',
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}