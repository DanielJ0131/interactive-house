import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
// 1. Import Firebase Auth and Firestore sync
import { onSnapshotsInSync } from 'firebase/firestore'; 
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../utils/firebaseConfig';
import { useGuest } from '../utils/GuestContext';
import { THEME_OPTIONS, useAppTheme } from '../utils/AppThemeContext';

export default function ModalScreen() {
  const { isGuest } = useGuest();
  const { theme, mode, setMode } = useAppTheme();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip Firebase listeners in guest mode
    if (isGuest) {
      setIsChecking(false);
      return;
    }

    // 1. Monitor Firestore Cloud Sync
    const unsubscribeSync = onSnapshotsInSync(db, () => {
      setIsConnected(true);
    });

    // 2. Check for Firebase User Session
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
      setIsChecking(false);
    });

    // Safety timeout: stop spinner if cloud doesn't respond quickly
    const timer = setTimeout(() => {
      setIsChecking(false);
    }, 3000);

    return () => {
      unsubscribeSync();
      unsubscribeAuth();
      clearTimeout(timer);
    };
  }, [isGuest]);

  // System is only "Ready" if cloud is synced AND user is logged in (guests are NOT ready)
  const isSystemReady = !isGuest && isConnected && isLoggedIn;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      
      {/* Back Button */}
      <View className="absolute top-12 left-6 z-10">
        <Pressable 
          onPress={() => router.back()}
          style={{ backgroundColor: theme.colors.chipBackground, borderColor: theme.colors.border }}
          className="border p-3 rounded-full"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color={theme.colors.text} />
        </Pressable>
      </View>
      
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 100 }} bounces={false}>
        <View className="items-center mb-10 mt-4">
          <View style={{ backgroundColor: isSystemReady ? theme.colors.successSoft : theme.colors.dangerSoft }} className="p-6 rounded-full mb-4">
            {isChecking ? (
              <ActivityIndicator size="large" color={theme.colors.accent} />
            ) : (
              <MaterialCommunityIcons 
                name={isSystemReady ? "shield-check" : "shield-alert-outline"} 
                size={56} 
                color={isSystemReady ? theme.colors.success : theme.colors.danger} 
              />
            )}
          </View>
          
          <Text style={{ color: theme.colors.text }} className="text-3xl font-extrabold text-center">System Status</Text>
          <Text style={{ color: theme.colors.mutedText }} className="text-center text-lg mt-2">
            {isChecking 
              ? "Verifying house credentials..." 
              : isGuest
                ? "Running in guest mode. Sign in for full access."
                : isSystemReady 
                  ? "Your smart home is secure." 
                  : !isLoggedIn 
                    ? "Authentication required." 
                    : "Cloud connection unreachable."}
          </Text>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} className="border p-6 rounded-3xl mb-6">
          {/* Cloud Sync Row */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text style={{ color: theme.colors.text }} className="text-lg font-bold">Firestore</Text>
              <Text style={{ color: theme.colors.mutedText }} className="text-sm">Cloud Data Sync</Text>
            </View>
            <View style={{ backgroundColor: isConnected ? theme.colors.successSoft : theme.colors.dangerSoft, borderColor: isConnected ? theme.colors.success : theme.colors.danger }} className="px-4 py-1.5 rounded-full border">
              <Text style={{ color: isConnected ? theme.colors.success : theme.colors.danger }} className="font-bold text-xs uppercase tracking-widest">
                {isConnected ? 'Synced' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: theme.colors.border }} className="h-[1px] mb-6" />

          {/* User Auth Row */}
          <View className="flex-row justify-between items-center">
            <View>
              <Text style={{ color: theme.colors.text }} className="text-lg font-bold">Account</Text>
              <Text style={{ color: theme.colors.mutedText }} className="text-sm">{isGuest ? 'Guest Mode' : isLoggedIn ? auth.currentUser?.email : "User Authentication"}</Text>
            </View>
            <View style={{ backgroundColor: isLoggedIn ? theme.colors.successSoft : theme.colors.dangerSoft, borderColor: isLoggedIn ? theme.colors.success : theme.colors.danger }} className="px-4 py-1.5 rounded-full border">
              <Text style={{ color: isLoggedIn ? theme.colors.success : theme.colors.danger }} className="font-bold text-xs uppercase tracking-widest">
                {isLoggedIn ? 'Auth' : 'Missing'}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} className="border p-6 rounded-3xl mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text style={{ color: theme.colors.text }} className="text-lg font-bold">Appearance</Text>
              <Text style={{ color: theme.colors.mutedText }} className="text-sm">Choose a global palette</Text>
            </View>
            <View style={{ backgroundColor: theme.colors.accentSoft, borderColor: theme.colors.accent }} className="px-3 py-1.5 rounded-full border">
              <Text style={{ color: theme.colors.accentText }} className="text-[10px] font-black uppercase tracking-widest">
                {THEME_OPTIONS.find((option) => option.id === mode)?.name ?? 'Theme'}
              </Text>
            </View>
          </View>

          {THEME_OPTIONS.map((option) => {
            const isSelected = option.id === mode;
            const previewColors = [option.colors.backgroundAlt, option.colors.accent, option.colors.secondaryAccent];

            return (
              <Pressable
                key={option.id}
                onPress={() => setMode(option.id)}
                style={{
                  backgroundColor: isSelected ? theme.colors.selectedSurface : theme.colors.chipBackground,
                  borderColor: isSelected ? theme.colors.selectedBorder : theme.colors.border,
                }}
                className="mb-3 rounded-2xl border p-4"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <View className="flex-row items-center mb-1">
                      <Text style={{ color: theme.colors.text }} className="text-base font-bold">
                        {option.name}
                      </Text>
                      {isSelected && (
                        <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.accent} style={{ marginLeft: 8 }} />
                      )}
                    </View>
                    <Text style={{ color: theme.colors.mutedText }} className="text-sm leading-5">
                      {option.description}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1">
                    {previewColors.map((color) => (
                      <View
                        key={color}
                        style={{ backgroundColor: color, borderColor: theme.colors.borderStrong }}
                        className="h-6 w-6 rounded-full border"
                      />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="pb-8">
        <Text style={{ color: theme.colors.subtleText }} className="text-center text-xs font-bold tracking-tighter uppercase">
          Interactive House Mobile • v1.0.0
        </Text>
      </View>
    </View>
  );
}