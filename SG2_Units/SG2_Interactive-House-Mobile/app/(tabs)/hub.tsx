import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../utils/firebaseConfig';
import { ARDUINO_DOC_ID, getArduinoDevicesDocRef } from '../../utils/firestorePaths';

type DeviceState = 'on' | 'off' | 'open' | 'closed';

type HardwareDevice = {
  pin: string;
  state: DeviceState | string;
  value: string | null;
};

type Telemetry = {
  steam?: number;
  motion?: number;
  gas?: number;
};

type SyncData = {
  lastUpdatedAt?: {
    seconds?: number;
    nanoseconds?: number;
  };
  lastSource?: string;
};

type DevicesDoc = {
  telemetry?: Telemetry;
  sync?: SyncData;
  yellow_led?: {
    value?: number;
  };
  fan_INA?: HardwareDevice;
  fan_INB?: HardwareDevice;
  white_light?: HardwareDevice;
  orange_light?: HardwareDevice;
  door?: HardwareDevice;
  buzzer?: HardwareDevice;
  window?: HardwareDevice;
};

type DeviceKey =
  | 'white_light'
  | 'orange_light'
  | 'fan_INA'
  | 'door'
  | 'window'
  | 'buzzer';

const DEVICE_CONFIG: Array<{
  key: DeviceKey;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  interactive?: boolean;
}> = [
  { key: 'white_light', label: 'White Light', icon: 'lightbulb-outline', interactive: true },
  { key: 'orange_light', label: 'Orange Light', icon: 'lightbulb-on-outline', interactive: true },
  { key: 'fan_INA', label: 'Fan', icon: 'fan', interactive: true },
  { key: 'door', label: 'Door', icon: 'door', interactive: true },
  { key: 'window', label: 'Window', icon: 'window-closed-variant', interactive: true },
  { key: 'buzzer', label: 'Buzzer', icon: 'bullhorn-outline', interactive: true },
];

const TELEMETRY_CONFIG: Array<{
  key: keyof Telemetry;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}> = [
  { key: 'motion', label: 'Motion', icon: 'motion-sensor' },
  { key: 'steam', label: 'Steam', icon: 'weather-fog' },
  { key: 'gas', label: 'Gas', icon: 'molecule' },
];

const AnimatedFanIcon = memo(
  ({
    speed,
    direction,
    color,
  }: {
    speed: number;
    direction: boolean;
    color: string;
  }) => {
    const rotation = useRef(new Animated.Value(0)).current;
    const isMounted = useRef(true);
    const rotationTracker = useRef(0);

    useEffect(() => {
      const listenerId = rotation.addListener(({ value }) => {
        rotationTracker.current = value;
      });

      return () => {
        rotation.removeListener(listenerId);
      };
    }, [rotation]);

    const startAnimation = useCallback(
      (startValue: number) => {
        if (!isMounted.current) return;

        // Smooth stop logic
        if (speed === 0) {
          Animated.timing(rotation, {
            toValue: startValue + 0.25,
            duration: 1200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: Platform.OS !== 'web',
          }).start();
          return;
        }

        const fullDuration = 500;
        const currentPos = startValue % 1;
        const remainingDuration = fullDuration * (1 - currentPos);

        Animated.timing(rotation, {
          toValue: Math.floor(rotationTracker.current) + 1,
          duration: Math.max(0, remainingDuration),
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== 'web',
        }).start(({ finished }) => {
          if (finished && isMounted.current && speed > 0) {
            startAnimation(rotationTracker.current % 1);
          }
        });
      },
      [speed, rotation]
    );

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
  }
);

export default function DatabaseScreen() {
  const [deviceData, setDeviceData] = useState<DevicesDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReversingFan, setIsReversingFan] = useState(false);
  const [yellowLedPercent, setYellowLedPercent] = useState(0);
  const user = auth.currentUser;

  const yellowLedRaw = Number(deviceData?.yellow_led?.value ?? 0);

  useEffect(() => {
    const docRef = getArduinoDevicesDocRef(db);

    const unsubscribeData = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setDeviceData(docSnap.data() as DevicesDoc);
          setError(null);
        } else {
          setError(`No device configuration found for ${ARDUINO_DOC_ID}`);
        }
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError('Failed to fetch device data.');
        setLoading(false);
      }
    );

    return () => unsubscribeData();
  }, []);

  useEffect(() => {
    const clampedRaw = Math.max(0, Math.min(255, Number.isFinite(yellowLedRaw) ? yellowLedRaw : 0));
    setYellowLedPercent(Math.round((clampedRaw / 255) * 100));
  }, [yellowLedRaw]);

  const toggleDevice = useCallback(
    async (deviceName: DeviceKey) => {
      const currentDevice = deviceData?.[deviceName] as HardwareDevice | undefined;
      if (!currentDevice) return;

      const currentState = currentDevice.state;

      try {
        const docRef = getArduinoDevicesDocRef(db);
        if (deviceName === 'fan_INA') {
          // Fan card acts as a simple power toggle:
          // any active fan state -> OFF, otherwise start in forward mode (INA).
          const isFanOn = deviceData?.fan_INA?.state === 'on' || deviceData?.fan_INB?.state === 'on';
          if (!isFanOn) {
            await updateDoc(docRef, {
              'fan_INA.state': 'on',
              'fan_INB.state': 'off',
            });
          } else {
            await updateDoc(docRef, {
              'fan_INA.state': 'off',
              'fan_INB.state': 'off',
            });
          }
        } else {
          const newState =
            currentState === 'on' || currentState === 'open'
              ? deviceName === 'door' || deviceName === 'window'
                ? 'closed'
                : 'off'
              : deviceName === 'door' || deviceName === 'window'
                ? 'open'
                : 'on';

          await updateDoc(docRef, {
            [`${deviceName}.state`]: newState,
          });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        Alert.alert('Toggle Error', message);
      }
    },
    [deviceData]
  );

  const reverseFan = useCallback(async () => {
    if (isReversingFan) return;

    setIsReversingFan(true);
    try {
      const docRef = getArduinoDevicesDocRef(db);
      const isCurrentlyReverse = deviceData?.fan_INB?.state === 'on';

      if (isCurrentlyReverse) {
        await updateDoc(docRef, {
          'fan_INB.state': 'off',
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        await updateDoc(docRef, {
          'fan_INA.state': 'on',
        });
      } else {
        await updateDoc(docRef, {
          'fan_INA.state': 'off',
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        await updateDoc(docRef, {
          'fan_INB.state': 'on',
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Reverse Error', message);
    } finally {
      setIsReversingFan(false);
    }
  }, [deviceData, isReversingFan]);

  const updateYellowLed = useCallback(async (percent: number) => {
    try {
      const docRef = getArduinoDevicesDocRef(db);
      const clampedPercent = Math.max(0, Math.min(100, percent));
      const rawValue = Math.round((clampedPercent / 100) * 255);

      await updateDoc(docRef, {
        'yellow_led.value': rawValue,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Yellow LED Error', message);
    }
  }, []);

  if (loading) {
    return (
      <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: '#020617' }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    );
  }

  const lastUpdatedAt = formatTimestamp(deviceData?.sync?.lastUpdatedAt);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View className="mb-8 mt-4">
          <Text className="text-white text-4xl font-extrabold tracking-tight">
            {user?.displayName ? `${user.displayName}'s Home` : 'Database'}
          </Text>
          <Text className="text-slate-500 text-lg font-medium">Live Hardware Control</Text>
        </View>

        {error && (
          <View className="bg-red-500/10 border border-red-500/30 p-4 rounded-3xl mb-6">
            <Text className="text-red-400 font-medium">{error}</Text>
          </View>
        )}

        <Text className="text-sky-500 text-xs font-black uppercase tracking-[2px] mb-4 ml-2">
          Actuators
        </Text>

        {deviceData &&
          DEVICE_CONFIG.map((device) => {
            const data =
              device.key === 'fan_INA'
                ? {
                    pin: `${deviceData.fan_INA?.pin ?? '-'} / ${deviceData.fan_INB?.pin ?? '-'}`,
                    state:
                      deviceData.fan_INA?.state === 'on'
                        ? 'forward'
                        : deviceData.fan_INB?.state === 'on'
                          ? 'reverse'
                          : 'off',
                    value: null,
                  }
                : deviceData[device.key];
            if (!data) return null;

            return (
              <DeviceCard
                key={device.key}
                icon={device.icon}
                name={device.label}
                data={data}
                disabled={!device.interactive}
                onToggle={() => toggleDevice(device.key)}
                onReverse={device.key === 'fan_INA' ? reverseFan : undefined}
                reversing={device.key === 'fan_INA' ? isReversingFan : false}
                reverseSpin={device.key === 'fan_INA' && data.state === 'reverse'}
              />
            );
          })}

        <YellowLedCard
          percent={yellowLedPercent}
          onChange={setYellowLedPercent}
          onSlidingComplete={updateYellowLed}
        />

        {deviceData?.telemetry && (
          <>
            <Text className="text-purple-500 text-xs font-black uppercase tracking-[2px] mt-8 mb-4 ml-2">
              Sensors
            </Text>

            <View className="flex-row flex-wrap justify-between">
              {TELEMETRY_CONFIG.map((sensor) => (
                <TelemetryCard
                  key={sensor.key}
                  label={sensor.label}
                  icon={sensor.icon}
                  value={deviceData.telemetry?.[sensor.key] ?? 0}
                  activeText="Detected"
                  inactiveText="Clear"
                />
              ))}
            </View>
          </>
        )}

        {deviceData?.sync && (
          <>
            <Text className="text-emerald-500 text-xs font-black uppercase tracking-[2px] mt-8 mb-4 ml-2">
              Sync Status
            </Text>

            <View className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl mb-4">
              <View className="flex-row items-center mb-4">
                <View className="h-12 w-12 rounded-2xl bg-emerald-500/10 items-center justify-center mr-4">
                  <MaterialCommunityIcons name="sync" size={24} color="#10b981" />
                </View>
                <View>
                  <Text className="text-white text-lg font-bold">Arduino Sync</Text>
                  <Text className="text-slate-500 text-xs font-mono">{ARDUINO_DOC_ID}</Text>
                </View>
              </View>

              <InfoRow label="Last Source" value={deviceData.sync.lastSource || 'Unknown'} />
              <InfoRow label="Last Updated" value={lastUpdatedAt} />
            </View>
          </>
        )}

        <Text className="text-slate-400 text-xs font-black uppercase tracking-[2px] mt-8 mb-4 ml-2">
          Database Debug
        </Text>

        <View className="bg-slate-900/40 border border-slate-800/60 p-5 rounded-3xl mb-8">
          <Text
            style={{
              color: '#4ade80',
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              fontSize: 11,
            }}
          >
            {JSON.stringify(deviceData, null, 2)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function YellowLedCard({
  percent,
  onChange,
  onSlidingComplete,
}: {
  percent: number;
  onChange: (value: number) => void;
  onSlidingComplete: (value: number) => void;
}) {
  const levelLabel = `${Math.round(percent)}%`;
  const iconOpacity = 0.2 + (Math.max(0, Math.min(100, percent)) / 100) * 0.8;

  return (
    <View
      style={{
        borderColor: 'rgba(250, 204, 21, 0.35)',
        backgroundColor: 'rgba(250, 204, 21, 0.06)',
      }}
      className="border p-5 rounded-3xl mb-3"
    >
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center flex-1">
          <View
            style={{ opacity: iconOpacity }}
            className="h-14 w-14 rounded-2xl items-center justify-center mr-4 bg-amber-500/15"
          >
            <MaterialCommunityIcons name="lightbulb-on-outline" size={26} color="#facc15" />
          </View>

          <View className="flex-1">
            <Text className="text-white text-lg font-bold">Yellow LED</Text>
            <Text className="text-slate-400 text-xs font-medium mt-1">Brightness</Text>
          </View>
        </View>

        <View className="px-3 py-2 rounded-2xl border bg-amber-500/20 border-amber-500/50">
          <Text className="text-[10px] font-black uppercase tracking-widest text-amber-200">
            {levelLabel}
          </Text>
        </View>
      </View>

      <Slider
        value={percent}
        minimumValue={0}
        maximumValue={100}
        step={1}
        minimumTrackTintColor="#facc15"
        maximumTrackTintColor="#334155"
        thumbTintColor="#facc15"
        onValueChange={onChange}
        onSlidingComplete={onSlidingComplete}
      />
    </View>
  );
}

function formatTimestamp(timestamp?: { seconds?: number; nanoseconds?: number }) {
  if (!timestamp?.seconds) return 'Unavailable';

  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString();
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-3">
      <Text className="text-slate-500 text-xs font-black uppercase tracking-widest">{label}</Text>
      <Text className="text-white text-base font-semibold mt-1">{value}</Text>
    </View>
  );
}

function TelemetryCard({
  label,
  icon,
  value,
  activeText,
  inactiveText,
}: {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  value: number;
  activeText: string;
  inactiveText: string;
}) {
  const isActive = value > 2;

  return (
    <View
      style={{ flexBasis: '48%' }}
      className={`p-5 rounded-3xl mb-4 border ${
        isActive
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-slate-900/40 border-slate-800/60'
      }`}
    >
      <View
        className={`h-10 w-10 rounded-xl items-center justify-center mb-3 ${
          isActive ? 'bg-red-500/10' : 'bg-purple-500/10'
        }`}
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={isActive ? '#f87171' : '#a855f7'}
        />
      </View>

      <Text className="text-white font-bold" numberOfLines={1}>
        {label}
      </Text>
      <Text className="text-slate-500 text-xs font-mono mt-1">Raw: {value}</Text>

      <View
        className={`self-start mt-3 px-3 py-1.5 rounded-full border ${
          isActive
            ? 'bg-red-500/20 border-red-500/40'
            : 'bg-slate-800 border-slate-700'
        }`}
      >
        <Text className={`text-[10px] font-black uppercase tracking-widest ${
          isActive ? 'text-red-300' : 'text-slate-400'
        }`}>
          {isActive ? activeText : inactiveText}
        </Text>
      </View>
    </View>
  );
}

function DeviceCard({
  icon,
  name,
  data,
  onToggle,
  onReverse,
  reversing = false,
  reverseSpin = false,
  disabled = false,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  name: string;
  data: HardwareDevice;
  onToggle: () => void;
  onReverse?: () => void;
  reversing?: boolean;
  reverseSpin?: boolean;
  disabled?: boolean;
}) {
  const isActive =
    data.state === 'on' ||
    data.state === 'open' ||
    data.state === 'forward' ||
    data.state === 'reverse';
  const isFan = name.toLowerCase().includes('fan');
  const isDisabled = disabled || reversing;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onToggle}
      style={{
        borderColor: isActive ? 'rgba(14, 165, 233, 0.35)' : '#1e293b',
        backgroundColor: isActive ? 'rgba(14, 165, 233, 0.05)' : 'rgba(15, 23, 42, 0.4)',
        opacity: isDisabled ? 0.8 : 1,
      }}
      className="border p-5 rounded-3xl mb-3"
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center flex-1">
          <View
            className={`h-14 w-14 rounded-2xl items-center justify-center mr-4 ${
              isActive ? 'bg-sky-500/10' : 'bg-slate-800/40'
            }`}
          >
            {isFan ? (
              <AnimatedFanIcon
                speed={isActive ? 100 : 0}
                direction={reverseSpin}
                color={isActive ? '#38bdf8' : '#475569'}
              />
            ) : (
              <MaterialCommunityIcons
                name={icon}
                size={26}
                color={isActive ? '#38bdf8' : '#475569'}
              />
            )}
          </View>

          <View className="flex-1">
            <Text className="text-white text-lg font-bold">{name}</Text>
            {disabled && (
              <Text className="text-amber-400 text-[10px] font-black uppercase tracking-widest mt-2">
                Read Only
              </Text>
            )}
          </View>
        </View>

        <View
          className={`px-3 py-2 rounded-2xl border ${
            isActive
              ? 'bg-sky-500/20 border-sky-500/50'
              : 'bg-slate-800 border-slate-700'
          }`}
        >
          <Text
            className={`text-[10px] font-black uppercase tracking-widest ${
              isActive ? 'text-sky-300' : 'text-slate-400'
            }`}
          >
            {data.state}
          </Text>
        </View>
      </View>

      {onReverse && (
        <View className="mt-4 pt-4 border-t border-slate-800/70">
          <Pressable
            onPress={reversing ? undefined : onReverse}
            className={`self-start px-4 py-2 rounded-xl border ${
              reversing
                ? 'bg-slate-800 border-slate-700'
                : 'bg-amber-500/10 border-amber-500/40 active:bg-amber-500/20'
            }`}
          >
            <Text
              className={`text-[10px] font-black uppercase tracking-widest ${
                reversing ? 'text-slate-400' : 'text-amber-300'
              }`}
            >
              {reversing ? 'Reversing...' : 'Reverse'}
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}