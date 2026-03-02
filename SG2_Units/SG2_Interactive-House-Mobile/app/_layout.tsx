import { MaterialCommunityIcons } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, StatusBar, LogBox, Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import "../global.css";

// 1. SILENCE LIBRARY WARNINGS
if (Platform.OS === 'web') {
  LogBox.ignoreLogs([
    'props.pointerEvents is deprecated',
    'Blocked aria-hidden on an element',
  ]);
}

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

SplashScreen.preventAutoHideAsync();

// 2. THEME OPTIMIZATION
const SmartHouseTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#020617', // Slate 950
    card: '#020617',       
    border: '#1e293b',     
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    ...MaterialCommunityIcons.font, 
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider style={{ backgroundColor: '#020617' }}>
      {/* 3. STATUS BAR STABILITY: translucent={false} prevents layout jumping */}
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#020617" 
        translucent={false} 
      />
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();

  return (
    <ThemeProvider value={SmartHouseTheme}> 
      <Stack
        screenOptions={{
          // This is the most important property for dark-mode blinking
          contentStyle: { backgroundColor: '#020617' }, 
          
          // Use 'fade' for Android to avoid the slide-gap flash
          animation: Platform.OS === 'android' ? 'fade' : 'fade', 
          
          // Prevents the screen from freezing/blinking during background shifts
          freezeOnBlur: true, 

          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'transparentModal', 
            animation: 'fade',
            headerShown: false,
            // In native-stack, transparentModal automatically keeps the previous screen visible
          }} 
        />
      </Stack>
    </ThemeProvider>
  );
}