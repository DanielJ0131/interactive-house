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
import { useAppTheme } from '../../utils/AppThemeContext';

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
  const { theme } = useAppTheme();
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
      <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const lastUpdatedAt = formatTimestamp(deviceData?.sync?.lastUpdatedAt);

  return (
    <SafeAreaView edges={[]} style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 24 }} showsVerticalScrollIndicator={false}>
        <View className="mb-8 mt-4">
          <Text style={{ color: theme.colors.text }} className="text-4xl font-extrabold tracking-tight">
            {user?.displayName ? `${user.displayName}'s Home` : 'Database'}
          </Text>
          <Text style={{ color: theme.colors.mutedText }} className="text-lg font-medium">Live Hardware Control</Text>
        </View>

        {error && (
          <View style={{ backgroundColor: theme.colors.dangerSoft, borderColor: theme.colors.danger }} className="border p-4 rounded-3xl mb-6">
            <Text style={{ color: theme.colors.danger }} className="font-medium">{error}</Text>
          </View>
        )}

        <Text style={{ color: theme.colors.accent }} className="text-xs font-black uppercase tracking-[2px] mb-4 ml-2">
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
            <Text style={{ color: theme.colors.secondaryAccent }} className="text-xs font-black uppercase tracking-[2px] mt-8 mb-4 ml-2">
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
            <Text style={{ color: theme.colors.success }} className="text-xs font-black uppercase tracking-[2px] mt-8 mb-4 ml-2">
              Sync Status
            </Text>

            <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} className="border p-5 rounded-3xl mb-4">
              <View className="flex-row items-center mb-4">
                <View style={{ backgroundColor: theme.colors.successSoft }} className="h-12 w-12 rounded-2xl items-center justify-center mr-4">
                  <MaterialCommunityIcons name="sync" size={24} color={theme.colors.success} />
                </View>
                <View>
                  <Text style={{ color: theme.colors.text }} className="text-lg font-bold">Arduino Sync</Text>
                  <Text style={{ color: theme.colors.mutedText }} className="text-xs font-mono">{ARDUINO_DOC_ID}</Text>
                </View>
              </View>

              <InfoRow label="Last Source" value={deviceData.sync.lastSource || 'Unknown'} />
              <InfoRow label="Last Updated" value={lastUpdatedAt} />
            </View>
          </>
        )}

        <Text style={{ color: theme.colors.subtleText }} className="text-xs font-black uppercase tracking-[2px] mt-8 mb-4 ml-2">
          Database Debug
        </Text>

        <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} className="border p-5 rounded-3xl mb-8">
          <Text
            style={{
              color: theme.colors.success,
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
  const { theme } = useAppTheme();
  const levelLabel = `${Math.round(percent)}%`;
  const iconOpacity = 0.2 + (Math.max(0, Math.min(100, percent)) / 100) * 0.8;

  return (
    <View
      style={{
        borderColor: theme.colors.warning,
        backgroundColor: theme.colors.accentSoft,
      }}
      className="border p-5 rounded-3xl mb-3"
    >
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center flex-1">
          <View style={{ opacity: iconOpacity, backgroundColor: theme.colors.warningSoft }} className="h-14 w-14 rounded-2xl items-center justify-center mr-4">
            <MaterialCommunityIcons name="lightbulb-on-outline" size={26} color={theme.colors.warning} />
          </View>

          <View className="flex-1">
            <Text style={{ color: theme.colors.text }} className="text-lg font-bold">Yellow LED</Text>
            <Text style={{ color: theme.colors.mutedText }} className="text-xs font-medium mt-1">Brightness</Text>
          </View>
        </View>

        <View style={{ backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning }} className="px-3 py-2 rounded-2xl border">
          <Text style={{ color: theme.colors.warning }} className="text-[10px] font-black uppercase tracking-widest">
            {levelLabel}
          </Text>
        </View>
      </View>

      <Slider
        value={percent}
        minimumValue={0}
        maximumValue={100}
        step={1}
        minimumTrackTintColor={theme.colors.warning}
        maximumTrackTintColor={theme.colors.borderStrong}
        thumbTintColor={theme.colors.warning}
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
  const { theme } = useAppTheme();
  return (
    <View className="mb-3">
      <Text style={{ color: theme.colors.subtleText }} className="text-xs font-black uppercase tracking-widest">{label}</Text>
      <Text style={{ color: theme.colors.text }} className="text-base font-semibold mt-1">{value}</Text>
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
  const { theme } = useAppTheme();
  const isActive = value > 2;

  return (
    <View
      style={{
        flexBasis: '48%',
        backgroundColor: isActive ? theme.colors.dangerSoft : theme.colors.surface,
        borderColor: isActive ? theme.colors.danger : theme.colors.border,
      }}
      className="p-5 rounded-3xl mb-4 border"
    >
      <View
        style={{ backgroundColor: isActive ? theme.colors.dangerSoft : theme.colors.secondaryAccentSoft }}
        className="h-10 w-10 rounded-xl items-center justify-center mb-3"
      >
        <MaterialCommunityIcons
          name={icon}
          size={20}
          color={isActive ? theme.colors.danger : theme.colors.secondaryAccent}
        />
      </View>

      <Text style={{ color: theme.colors.text }} className="font-bold" numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.mutedText }} className="text-xs font-mono mt-1">Raw: {value}</Text>

      <View
        style={{
          backgroundColor: isActive ? theme.colors.dangerSoft : theme.colors.chipBackground,
          borderColor: isActive ? theme.colors.danger : theme.colors.border,
        }}
        className="self-start mt-3 px-3 py-1.5 rounded-full border"
      >
        <Text style={{ color: isActive ? theme.colors.danger : theme.colors.mutedText }} className="text-[10px] font-black uppercase tracking-widest">
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
  const { theme } = useAppTheme();
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
        borderColor: isActive ? theme.colors.accent : theme.colors.border,
        backgroundColor: isActive ? theme.colors.accentSoft : theme.colors.surface,
        opacity: isDisabled ? 0.8 : 1,
      }}
      className="border p-5 rounded-3xl mb-3"
    >
      <View className="flex-row justify-between items-center">
        <View className="flex-row items-center flex-1">
          <View
            style={{ backgroundColor: isActive ? theme.colors.accentSoft : theme.colors.secondaryAccentSoft }}
            className="h-14 w-14 rounded-2xl items-center justify-center mr-4"
          >
            {isFan ? (
              <AnimatedFanIcon
                speed={isActive ? 100 : 0}
                direction={reverseSpin}
                color={isActive ? theme.colors.accent : theme.colors.subtleText}
              />
            ) : (
              <MaterialCommunityIcons
                name={icon}
                size={26}
                color={isActive ? theme.colors.accent : theme.colors.subtleText}
              />
            )}
          </View>

          <View className="flex-1">
            <Text style={{ color: theme.colors.text }} className="text-lg font-bold">{name}</Text>
            {disabled && (
              <Text style={{ color: theme.colors.warning }} className="text-[10px] font-black uppercase tracking-widest mt-2">
                Read Only
              </Text>
            )}
          </View>
        </View>

        <View
          style={{
            backgroundColor: isActive ? theme.colors.accentSoft : theme.colors.chipBackground,
            borderColor: isActive ? theme.colors.accent : theme.colors.border,
          }}
          className="px-3 py-2 rounded-2xl border"
        >
          <Text style={{ color: isActive ? theme.colors.accentText : theme.colors.mutedText }} className="text-[10px] font-black uppercase tracking-widest">
            {data.state}
          </Text>
        </View>
      </View>

      {onReverse && (
        <View style={{ borderTopColor: theme.colors.border }} className="mt-4 pt-4 border-t">
          <Pressable
            onPress={reversing ? undefined : onReverse}
            style={{
              backgroundColor: reversing ? theme.colors.chipBackground : theme.colors.warningSoft,
              borderColor: reversing ? theme.colors.border : theme.colors.warning,
            }}
            className="self-start px-4 py-2 rounded-xl border"
          >
            <Text style={{ color: reversing ? theme.colors.mutedText : theme.colors.warning }} className="text-[10px] font-black uppercase tracking-widest">
              {reversing ? 'Reversing...' : 'Reverse'}
            </Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}