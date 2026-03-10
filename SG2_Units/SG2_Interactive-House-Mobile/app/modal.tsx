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

export default function ModalScreen() {
  const { isGuest } = useGuest();
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
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <StatusBar style="light" />
      
      {/* Back Button */}
      <View className="absolute top-12 left-6 z-10">
        <Pressable 
          onPress={() => router.back()}
          className="bg-slate-900/80 border border-slate-800 p-3 rounded-full active:bg-slate-800"
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="white" />
        </Pressable>
      </View>
      
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 100 }} bounces={false}>
        <View className="items-center mb-10 mt-4">
          <View className={`p-6 rounded-full mb-4 ${isSystemReady ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            {isChecking ? (
              <ActivityIndicator size="large" color="#0ea5e9" />
            ) : (
              <MaterialCommunityIcons 
                name={isSystemReady ? "shield-check" : "shield-alert-outline"} 
                size={56} 
                color={isSystemReady ? "#22c55e" : "#ef4444"} 
              />
            )}
          </View>
          
          <Text className="text-white text-3xl font-extrabold text-center">System Status</Text>
          <Text className="text-slate-500 text-center text-lg mt-2">
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

        <View className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl mb-6">
          {/* Cloud Sync Row */}
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-white text-lg font-bold">Firestore</Text>
              <Text className="text-slate-500 text-sm">Cloud Data Sync</Text>
            </View>
            <View className={`px-4 py-1.5 rounded-full border ${isConnected ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <Text className={`font-bold text-xs uppercase tracking-widest ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                {isConnected ? 'Synced' : 'Offline'}
              </Text>
            </View>
          </View>

          <View className="h-[1px] bg-slate-800 mb-6" />

          {/* User Auth Row */}
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-white text-lg font-bold">Account</Text>
              <Text className="text-slate-500 text-sm">{isGuest ? 'Guest Mode' : isLoggedIn ? auth.currentUser?.email : "User Authentication"}</Text>
            </View>
            <View className={`px-4 py-1.5 rounded-full border ${isLoggedIn ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <Text className={`font-bold text-xs uppercase tracking-widest ${isLoggedIn ? 'text-green-500' : 'text-red-500'}`}>
                {isLoggedIn ? 'Auth' : 'Missing'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View className="pb-8">
        <Text className="text-slate-700 text-center text-xs font-bold tracking-tighter uppercase">
          Interactive House Mobile • v1.0.0
        </Text>
      </View>
    </View>
  );
}