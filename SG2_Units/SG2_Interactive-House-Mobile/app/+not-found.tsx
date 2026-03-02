import { Link, Stack } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function NotFoundScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#020617]">
      <StatusBar style="light" />
      <Stack.Screen options={{ title: 'Oops!', headerShown: false }} />

      <View className="flex-1 px-8 justify-between py-12">
        <View />

        <View className="items-center">
          <View className="bg-rose-500/10 p-6 rounded-[32px] mb-8">
            <MaterialCommunityIcons name="map-marker-off-outline" size={80} color="#f43f5e" />
          </View>

          <Text className="text-white text-4xl font-black tracking-tight text-center uppercase">
            Device Not Found
          </Text>
          
          <Text className="text-slate-400 text-lg text-center mt-4 leading-6">
            It looks like this part of the{"\n"}house doesn't exist yet.
          </Text>
        </View>

        <View>
          <Link href="/" asChild>
            <Pressable 
              className="bg-sky-500 p-5 rounded-2xl active:bg-sky-600 shadow-lg shadow-sky-500/20"
            >
              <Text className="text-white text-center font-bold text-lg">
                Return to Main Screen
              </Text>
            </Pressable>
          </Link>
        </View>

        <View className="items-center">
          <Text className="text-slate-700 text-[10px] uppercase tracking-[4px] font-black">
            Error 404 • Lost Connection
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}