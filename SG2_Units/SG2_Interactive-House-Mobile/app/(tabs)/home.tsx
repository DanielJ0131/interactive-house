import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import deviceConfig from '../../data/devices-config.json'; 

export default function DevicesScreen() {
  const router = useRouter();
  const devices = deviceConfig.devices;

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: '#020617' }}
    >
      <ScrollView contentContainerStyle={{ padding: 24 }}>

        {/* Updated Header */}
        <View className="mb-8 mt-4">
          <Text className="text-white text-4xl font-extrabold tracking-tight">
            Devices
          </Text>
          <Text className="text-slate-500 text-lg font-medium">
            Smart House Components
          </Text>
        </View>

        {/* Device Grid */}
        <View className="flex-row flex-wrap justify-between">
          {devices.map((device) => (
            <Pressable
              key={device.id}
              style={{ flexBasis: '48%' }}
              className="bg-slate-900 border border-slate-800 p-5 rounded-3xl mb-4 active:bg-slate-800"
              onPress={(e) => {
                if (typeof window !== 'undefined') {
                  e.currentTarget.blur();
                }
                // Navigates to the specific device control page
                router.push(`/(tabs)/${device.id}`);
              }}
            >
              {/* Icon Container */}
              <View className="bg-sky-500/10 h-12 w-12 rounded-xl items-center justify-center mb-4">
                <MaterialCommunityIcons
                  name={device.icon as any}
                  size={26}
                  color="#0ea5e9"
                />
              </View>

              {/* Device Name */}
              <Text className="text-white text-base font-bold" numberOfLines={1}>
                {device.name}
              </Text>

              {/* Pin Information (Replaces Device Count) */}
              <Text className="text-slate-500 text-sm font-medium">
                Pin: {device.pin}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}