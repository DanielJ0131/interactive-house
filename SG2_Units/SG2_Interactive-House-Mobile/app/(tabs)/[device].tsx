import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import deviceConfig from '../../data/devices-config.json';

/**
 * DeviceDetailScreen
 * Handles specific UI for different hardware components (Sensors vs Actuators).
 */
export default function DeviceDetailScreen() {
  const { device: deviceId } = useLocalSearchParams();

  // Find the device metadata from your new JSON
  const deviceMeta = useMemo(
    () => deviceConfig.devices.find((d) => d.id === deviceId),
    [deviceId]
  );

  // Local state to simulate hardware interaction
  const [isActive, setIsActive] = useState(false);
  const [sensorValue, setSensorValue] = useState(Math.floor(Math.random() * 100));

  if (!deviceMeta) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <Text className="text-white">Device not found</Text>
      </View>
    );
  }

  // Categorize hardware to determine UI controls
  const isSensor = ['gas', 'photocell', 'soil', 'steam', 'pir'].includes(deviceMeta.id);
  const isToggleable = ['led_yellow', 'led_white', 'fan', 'relay', 'buzzer'].includes(deviceMeta.id);
  const isServo = deviceMeta.id.includes('servo');

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        
        {/* Hardware Header */}
        <View className="items-center mb-10 mt-4">
          <View className={`p-8 rounded-[40px] mb-6 ${isActive ? 'bg-sky-500/20' : 'bg-slate-900'}`}>
            <MaterialCommunityIcons 
              name={deviceMeta.icon as any} 
              size={80} 
              color={isActive ? '#0ea5e9' : '#475569'} 
            />
          </View>
          <Text className="text-white text-4xl font-black text-center">{deviceMeta.name}</Text>
          <View className="bg-slate-800/50 px-4 py-1 rounded-full mt-4">
            <Text className="text-sky-400 font-mono font-bold uppercase tracking-widest text-xs">
              Connection: {deviceMeta.pin}
            </Text>
          </View>
        </View>

        {/* --- DYNAMIC CONTROLS SECTION --- */}

        {/* 1. SENSOR DATA VIEW (Read-only) */}
        {isSensor && (
          <View className="bg-slate-900/50 border border-slate-800 p-8 rounded-[32px] items-center">
            <Text className="text-slate-500 font-bold uppercase tracking-widest text-sm mb-2">
              Current Reading
            </Text>
            <Text className="text-white text-6xl font-black mb-4">
              {deviceMeta.id === 'pir' ? (isActive ? 'ON' : 'OFF') : `${sensorValue}%`}
            </Text>
            <Pressable 
              onPress={() => setSensorValue(Math.floor(Math.random() * 100))}
              className="bg-slate-800 px-6 py-3 rounded-2xl active:opacity-70"
            >
              <Text className="text-slate-300 font-bold">Refresh Data</Text>
            </Pressable>
          </View>
        )}

        {/* 2. TOGGLE CONTROLS (LEDs, Fans, Buzzer) */}
        {isToggleable && (
          <View className="bg-slate-900/50 border border-slate-800 p-6 rounded-[32px] flex-row justify-between items-center">
            <View>
              <Text className="text-white text-xl font-bold">Power State</Text>
              <Text className="text-slate-500">{isActive ? 'Device is running' : 'Device is idle'}</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: '#1e293b', true: '#0ea5e9' }}
              thumbColor="white"
            />
          </View>
        )}

        {/* 3. SERVO CONTROLS (Door / Window) */}
        {isServo && (
          <View className="gap-y-4">
            <Pressable 
              onPress={() => setIsActive(true)}
              className={`p-6 rounded-3xl border-2 flex-row justify-between items-center ${isActive ? 'bg-sky-500 border-sky-400' : 'bg-slate-900 border-slate-800'}`}
            >
              <Text className={`text-xl font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>Open</Text>
              <MaterialCommunityIcons name="arrow-top-right" size={24} color={isActive ? 'white' : '#475569'} />
            </Pressable>
            
            <Pressable 
              onPress={() => setIsActive(false)}
              className={`p-6 rounded-3xl border-2 flex-row justify-between items-center ${!isActive ? 'bg-red-500/20 border-red-500/40' : 'bg-slate-900 border-slate-800'}`}
            >
              <Text className={`text-xl font-bold ${!isActive ? 'text-red-400' : 'text-slate-400'}`}>Closed</Text>
              <MaterialCommunityIcons name="arrow-bottom-left" size={24} color={!isActive ? '#f87171' : '#475569'} />
            </Pressable>
          </View>
        )}

        {/* Technical Specs Footer */}
        <View className="mt-12 p-6 border-t border-slate-900">
          <Text className="text-slate-600 font-bold uppercase text-xs tracking-widest mb-4">
            Hardware Specifications
          </Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-500">Protocol</Text>
            <Text className="text-white font-mono">{deviceMeta.pin.startsWith('A') ? 'Analog' : 'Digital'}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-500">Component ID</Text>
            <Text className="text-white font-mono">{deviceMeta.id.toUpperCase()}</Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}