import { Link, Stack } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAppTheme } from '../utils/AppThemeContext';

export default function NotFoundScreen() {
  const { theme } = useAppTheme();

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.background }} className="flex-1">
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />

      <View className="flex-1 px-8 justify-between py-12">
        <View />

        <View className="items-center">
          <View style={{ backgroundColor: theme.colors.dangerSoft }} className="p-6 rounded-[32px] mb-8">
            <MaterialCommunityIcons name="map-marker-off-outline" size={80} color={theme.colors.danger} />
          </View>

          <Text style={{ color: theme.colors.text }} className="text-4xl font-black tracking-tight text-center uppercase">
            Device Not Found
          </Text>

          <Text style={{ color: theme.colors.mutedText }} className="text-lg text-center mt-4 leading-6">
            It looks like this part of the{"\n"}house doesn't exist yet.
          </Text>
        </View>

        <View>
          {/* Back Button */}
          <Pressable
            onPress={() => router.replace('/')}
            style={{ backgroundColor: theme.colors.accent }}
            className="p-5 rounded-2xl active:opacity-80"
          >
            <Text style={{ color: theme.colors.accentText }} className="text-center font-bold text-lg">Go Home</Text>
          </Pressable>
        </View>

        <View className="items-center">
          <Text style={{ color: theme.colors.subtleText }} className="text-[10px] uppercase tracking-[4px] font-black">
            Error 404 • Lost Connection
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}