import React from 'react';
import { Pressable, View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../utils/AppThemeContext';

type Props = {
  onPress: () => void;
};

export default function EmergencyHeaderButton({ onPress }: Props) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
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
          backgroundColor: theme.colors.dangerSoft,
          borderWidth: 1.5,
          borderColor: theme.colors.danger,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <MaterialCommunityIcons name="phone-alert" size={18} color={theme.colors.danger} />
        <Text style={{ color: theme.colors.accentText, fontSize: 12, fontWeight: '800' }}>
          EMERGENCY
        </Text>
      </Pressable>
    </View>
  );
}