import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleNavigation = (path: string, e?: any) => {
    if (Platform.OS === 'web' && e) {
      // @ts-ignore
      e.currentTarget.blur();
    }
    // Explicitly pushing to the full path
    router.push(path as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#020617]">
      <StatusBar style="light" />
      
      <View className="flex-1 px-8 justify-between py-12">
        <View className="items-center mt-10">
          <View className="bg-sky-500/10 p-5 rounded-[32px] mb-6">
             <MaterialCommunityIcons name="home-assistant" size={64} color="#0ea5e9" />
          </View>
          <Text className="text-white text-4xl font-black tracking-tight text-center uppercase">
            Interactive House
          </Text>
          <Text className="text-slate-400 text-lg text-center mt-4 leading-6">
            Smart control for your modern{"\n"}living space.
          </Text>
        </View>

        <View>
          {/* Sign In Button */}
          <Pressable 
            onPress={(e) => handleNavigation('/(auth)/login', e)}
            className="bg-sky-500 p-5 rounded-2xl active:bg-sky-600 shadow-lg shadow-sky-500/20"
          >
            <Text className="text-white text-center font-bold text-lg">Get Started</Text>
          </Pressable>

          {/* Skip Button - points to /home now */}
          <Pressable 
            onPress={(e) => handleNavigation('/(tabs)/home', e)}
            className="mt-6 py-2 active:opacity-60"
          >
            <View className="flex-row justify-center items-center">
              <Text className="text-slate-500 font-semibold text-base">Explore as Guest </Text>
              <MaterialCommunityIcons name="arrow-right" size={18} color="#64748b" />
            </View>
          </Pressable>
        </View>

        <View className="items-center">
          <Text className="text-slate-700 text-[10px] uppercase tracking-[4px] font-black">
            Interactive House Mobile
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}