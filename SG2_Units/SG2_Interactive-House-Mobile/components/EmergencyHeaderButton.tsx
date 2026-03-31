import React, { useEffect, useRef } from 'react';
import { Pressable, Animated, Easing, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  onPress: () => void;
};

export default function EmergencyHeaderButton({ onPress }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );

    pulseLoop.start();
    glowLoop.start();

    return () => {
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);

  return (
    <Animated.View
      style={{
        transform: [{ scale: pulseAnim }],
        shadowColor: '#ef4444',
        shadowOpacity: glowAnim,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
        elevation: 12,
        marginRight: 18,
      }}
    >
      <Pressable
        onPress={onPress}
        hitSlop={20}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 18,
          backgroundColor: 'rgba(239, 68, 68, 0.22)',
          borderWidth: 1.5,
          borderColor: 'rgba(248, 113, 113, 0.7)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <MaterialCommunityIcons name="phone-alert" size={18} color="#f87171" />
        <Text style={{ color: '#fecaca', fontSize: 12, fontWeight: '800' }}>
          EMERGENCY
        </Text>
      </Pressable>
    </Animated.View>
  );
}