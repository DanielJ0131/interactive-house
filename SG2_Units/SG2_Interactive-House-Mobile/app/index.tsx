import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Platform, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAppTheme } from '../utils/AppThemeContext';

// 1. Import Firebase auth
import { auth } from '../utils/firebaseConfig'; 
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { useGuest } from '../utils/GuestContext';

const AUTH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), ms)
    ),
  ]);
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { setIsGuest } = useGuest();
  const { theme } = useAppTheme();
  
  // 2. Add a loading state for the guest login
  const [isLoadingGuest, setIsLoadingGuest] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(() => Boolean(auth.currentUser));

  useEffect(() => {
    if (auth.currentUser) {
      router.replace('/(tabs)/hub');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)/hub');
        return;
      }
      setIsAuthChecking(false);
    });

    return unsubscribe;
  }, [router]);

  const handleNavigation = (path: string, e?: any) => {
    if (Platform.OS === 'web' && e) {
      // @ts-ignore
      e.currentTarget.blur();
    }
    router.push(path as any);
  };

  // 3. Guest login — no Firebase, just local state
  const handleGuestLogin = () => {
    setIsGuest(true);
    router.replace('/(tabs)/hub');
  };

  if (isAuthChecking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} className="items-center justify-center">
        <StatusBar style="light" backgroundColor={theme.colors.background} />
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      
      <View className="flex-1 px-8 justify-between py-12">
        <View className="items-center mt-10">
          <View style={{ backgroundColor: theme.colors.accentSoft }} className="p-5 rounded-[32px] mb-6">
             <MaterialCommunityIcons name="home-assistant" size={64} color={theme.colors.accent} />
          </View>
          <Text style={{ color: theme.colors.text }} className="text-4xl font-black tracking-tight text-center uppercase">
            Interactive House
          </Text>
          <Text style={{ color: theme.colors.mutedText }} className="text-lg text-center mt-4 leading-6">
            Smart control for your modern{"\n"}living space.
          </Text>
        </View>

        <View>
          {/* Sign In Button */}
          <Pressable 
            onPress={(e) => handleNavigation('/(auth)/login', e)}
            disabled={isLoadingGuest}
            style={{ backgroundColor: theme.colors.accent }}
            className="p-5 rounded-2xl"
          >
            <Text style={{ color: theme.colors.accentText }} className="text-center font-bold text-lg">Get Started</Text>
          </Pressable>

          {/* 4. Update Skip Button to trigger the Firebase Auth */}
          <Pressable 
            onPress={handleGuestLogin}
            disabled={isLoadingGuest}
            className="mt-6 py-2 active:opacity-60"
          >
            <View className="flex-row justify-center items-center">
              {isLoadingGuest ? (
                <ActivityIndicator color={theme.colors.mutedText} />
              ) : (
                <>
                  <Text style={{ color: theme.colors.subtleText }} className="font-semibold text-base">Explore as Guest </Text>
                  <MaterialCommunityIcons name="arrow-right" size={18} color={theme.colors.subtleText} />
                </>
              )}
            </View>
          </Pressable>
        </View>

        <View className="items-center">
          <Text style={{ color: theme.colors.subtleText }} className="text-[10px] uppercase tracking-[4px] font-black">
            Interactive House Mobile
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}