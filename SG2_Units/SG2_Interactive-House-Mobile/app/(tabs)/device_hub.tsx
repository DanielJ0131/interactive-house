import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { ScrollView, Switch, Text, View, Pressable, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import deviceConfig from '../../data/devices-config.json';

// --- SUB-COMPONENT: ANIMATED FAN ICON ---
const AnimatedFanIcon = memo(({ speed, direction, color }: any) => {
  const rotation = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  
  // Create a ref to track the numeric value safely for TypeScript
  const rotationTracker = useRef(0);

  useEffect(() => {
    // Attach a listener to keep our tracker in sync with the animation
    const listenerId = rotation.addListener(({ value }) => {
      rotationTracker.current = value;
    });

    return () => {
      rotation.removeListener(listenerId);
    };
  }, [rotation]);

  const startAnimation = useCallback((startValue: number) => {
    if (!isMounted.current) return;

    // Smooth stop logic
    if (speed === 0) {
      Animated.timing(rotation, {
        toValue: startValue + 0.25, 
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    // Running logic: Use rotationTracker.current instead of rotation._value
    const fullDuration = 500; 
    const currentPos = startValue % 1;
    const remainingDuration = fullDuration * (1 - currentPos);

    Animated.timing(rotation, {
      // Calculate next integer target
      toValue: Math.floor(rotationTracker.current) + 1, 
      duration: Math.max(0, remainingDuration),
      easing: Easing.linear,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && isMounted.current && speed > 0) {
        startAnimation(rotationTracker.current % 1); 
      }
    });
  }, [speed, rotation]);

  useEffect(() => {
    isMounted.current = true;
    rotation.stopAnimation((value) => {
      startAnimation(value);
    });
    return () => {
      isMounted.current = false;
      rotation.stopAnimation();
    };
  }, [speed, startAnimation, rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: direction ? ['360deg', '0deg'] : ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <MaterialCommunityIcons name="fan" size={26} color={color} />
    </Animated.View>
  );
});

// --- SUB-COMPONENT: FAN CONTROL UNIT ---
const FanControls = memo(({ speed, direction, onSpeedChange, onDirectionToggle }: any) => {
  const speeds = [
    { label: 'Off', value: 0 },
    { label: 'On', value: 100 },
  ];

  return (
    <View className="mt-4 pt-4 border-t border-slate-800/40">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Fan Dynamics</Text>
        <Pressable 
          onPress={onDirectionToggle}
          className={`flex-row items-center px-3 py-1.5 rounded-full border ${
            direction ? 'bg-sky-500/20 border-sky-500' : 'bg-slate-800 border-slate-700'
          }`}
        >
          <MaterialCommunityIcons name="swap-horizontal" size={14} color={direction ? '#38bdf8' : '#94a3b8'} />
          <Text className={`ml-2 text-[10px] font-bold ${direction ? 'text-sky-400' : 'text-slate-400'}`}>
            {direction ? 'REVERSE' : 'NORMAL'}
          </Text>
        </Pressable>
      </View>
      
      <View className="flex-row bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        {speeds.map((s) => (
          <Pressable
            key={s.label}
            onPress={() => onSpeedChange(s.value)}
            style={{
              flex: 1,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: speed === s.value ? '#0ea5e9' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: '900', color: speed === s.value ? '#ffffff' : '#64748b' }}>
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

// --- SUB-COMPONENT: INDIVIDUAL DEVICE CARD ---
const ActuatorCard = memo(({ 
  device, state, sliderValue, direction, onToggle, onSliderChange, onBuzzerPress, onDirectionToggle 
}: any) => {
  const isBuzzer = device.id === 'buzzer';
  const isYellowLed = device.id === 'led_yellow';
  const isFan = device.id === 'fan';
  
  const brightness = sliderValue || 0;
  const isActive = isFan ? brightness > 0 : (isYellowLed ? brightness > 0 : !!state);
  const glyphOpacity = (isYellowLed || isFan) ? Math.max(0.3, brightness / 100) : 1;

  return (
    <View 
      style={{
        borderColor: isActive ? `rgba(14, 165, 233, ${glyphOpacity * 0.4})` : '#1e293b',
        backgroundColor: isActive ? `rgba(14, 165, 233, 0.05)` : 'rgba(15, 23, 42, 0.4)'
      }}
      className="border p-5 rounded-3xl mb-3"
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center">
          <View className={`h-14 w-14 rounded-2xl items-center justify-center mr-4 
            ${isActive ? 'bg-sky-500/10' : 'bg-slate-800/40'}`}>
            {isFan ? (
              <AnimatedFanIcon speed={brightness} direction={direction} color={brightness > 0 ? '#38bdf8' : '#475569'} />
            ) : (
              <MaterialCommunityIcons 
                name={device.icon as any} 
                size={26} 
                color={isActive ? (isYellowLed ? `rgba(234, 179, 8, ${glyphOpacity})` : '#38bdf8') : '#475569'} 
              />
            )}
          </View>
          <View>
            <Text className="text-white text-lg font-bold">{device.name}</Text>
            <Text className="text-slate-500 text-xs font-mono">{device.pin}</Text>
          </View>
        </View>

        {isBuzzer ? (
          <Pressable
            onPressIn={() => onBuzzerPress(device.id, true)}
            onPressOut={() => onBuzzerPress(device.id, false)}
            style={{
              width: 96,
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isActive ? '#0ea5e9' : '#1e293b',
              borderWidth: 1,
              borderColor: isActive ? '#38bdf8' : '#334155'
            }}
          >
            <Text className="font-bold text-[10px] uppercase tracking-widest text-white">{isActive ? 'Buzzing' : 'Activate'}</Text>
          </Pressable>
        ) : (isYellowLed || isFan) ? (
          <View className="bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
            <Text className="text-sky-500 font-mono text-[10px] font-bold">{Math.round(brightness)}%</Text>
          </View>
        ) : (
          <Switch value={isActive} onValueChange={() => onToggle(device.id)} trackColor={{ false: '#1e293b', true: '#0ea5e9' }} thumbColor="white" />
        )}
      </View>

      {isYellowLed && (
        <View className="mt-5 pt-4 border-t border-slate-800/40">
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={100}
            value={brightness}
            onValueChange={(val) => onSliderChange(device.id, val)}
            minimumTrackTintColor="#eab308"
            maximumTrackTintColor="#1e293b"
            thumbTintColor="#ffffff" 
          />
        </View>
      )}

      {isFan && (
        <FanControls speed={brightness} direction={direction} onSpeedChange={(val: number) => onSliderChange(device.id, val)} onDirectionToggle={() => onDirectionToggle(device.id)} />
      )}
    </View>
  );
});

// --- MAIN SCREEN ---
export default function DeviceHubScreen() {
  const allDevices = deviceConfig.devices;
  const [deviceStates, setDeviceStates] = useState<{ [key: string]: boolean }>({});
  const [sliderValues, setSliderValues] = useState<{ [key: string]: number }>({});
  const [fanDirections, setFanDirections] = useState<{ [key: string]: boolean }>({});
  
  const actuators = useMemo(() => 
    allDevices.filter(d => ['led_yellow', 'led_white', 'fan', 'relay', 'buzzer', 'servo_door', 'servo_window'].includes(d.id)), 
    [allDevices]
  );
  
  const sensors = useMemo(() => 
    allDevices.filter(d => ['pir', 'gas', 'photocell', 'soil', 'steam', 'button1', 'button2'].includes(d.id)), 
    [allDevices]
  );

  const toggleDevice = useCallback((id: string) => setDeviceStates(p => ({ ...p, [id]: !p[id] })), []);
  const updateSliderValue = useCallback((id: string, val: number) => setSliderValues(p => ({ ...p, [id]: val })), []);
  const handleBuzzerPress = useCallback((id: string, p: boolean) => setDeviceStates(prev => ({ ...prev, [id]: p })), []);
  const toggleFanDirection = useCallback((id: string) => setFanDirections(p => ({ ...p, [id]: !p[id] })), []);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View className="mb-8 mt-4">
          <Text className="text-white text-4xl font-extrabold tracking-tight">Device Hub</Text>
          <Text className="text-slate-500 text-lg font-medium">Smart Control Interface</Text>
        </View>

        <Text className="text-sky-500 text-xs font-black uppercase tracking-[2px] mb-4 ml-2">Actuators</Text>
        {actuators.map((device) => (
          <ActuatorCard 
            key={device.id}
            device={device}
            state={deviceStates[device.id]}
            sliderValue={sliderValues[device.id]}
            direction={fanDirections[device.id]}
            onToggle={toggleDevice}
            onSliderChange={updateSliderValue}
            onBuzzerPress={handleBuzzerPress}
            onDirectionToggle={toggleFanDirection}
          />
        ))}

        <Text className="text-purple-500 text-xs font-black uppercase tracking-[2px] mt-8 mb-4 ml-2">Sensors</Text>
        <View className="flex-row flex-wrap justify-between">
          {sensors.map((device) => (
            <View key={device.id} style={{ flexBasis: '48%' }} className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl mb-4">
              <View className="h-10 w-10 rounded-xl bg-purple-500/10 items-center justify-center mb-3">
                <MaterialCommunityIcons name={device.icon as any} size={20} color="#a855f7" />
              </View>
              <Text className="text-white font-bold" numberOfLines={1}>{device.name}</Text>
              <Text className="text-slate-500 text-xs font-mono mt-1">{device.pin}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}