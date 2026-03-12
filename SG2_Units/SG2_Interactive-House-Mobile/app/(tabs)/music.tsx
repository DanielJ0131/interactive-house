import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function MusicScreen() {
  return (
    <View className="flex-1 bg-slate-950 px-6 py-8">
      <Text className="text-white text-3xl font-bold mb-2">Music Player</Text>
      <Text className="text-slate-400 mb-8">
        Play melodies and control sound output
      </Text>

      <View className="bg-slate-900 rounded-3xl p-6 border border-slate-800">
        <Text className="text-white text-xl font-semibold mb-2">
          Current Melody
        </Text>
        <Text className="text-slate-400 mb-6">No melody selected</Text>

        <View className="flex-row justify-between">
          <Pressable className="bg-sky-500 rounded-2xl px-5 py-4 flex-1 mr-2 items-center">
            <MaterialCommunityIcons name="play" size={24} color="white" />
            <Text className="text-white font-semibold mt-1">Play</Text>
          </Pressable>

          <Pressable className="bg-slate-800 rounded-2xl px-5 py-4 flex-1 ml-2 items-center">
            <MaterialCommunityIcons name="pause" size={24} color="white" />
            <Text className="text-white font-semibold mt-1">Pause</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}