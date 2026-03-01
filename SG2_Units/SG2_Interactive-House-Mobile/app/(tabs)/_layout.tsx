import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Tabs, useRouter, usePathname } from 'expo-router';
import React, { useState, useEffect } from 'react'; 
import { Platform, Pressable, View, Alert } from 'react-native';
import { cssInterop } from 'nativewind';
import * as SecureStore from 'expo-secure-store';
import { onSnapshotsInSync } from 'firebase/firestore'; 
import { db } from '../../utils/firebaseConfig'; 

cssInterop(MaterialCommunityIcons, {
  className: 'style',
});

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 1. Monitor Firestore Sync status
    const unsubscribe = onSnapshotsInSync(db, () => {
      setIsConnected(true);
    });

    // 2. Monitor Auth Status whenever the route changes
    const checkAuth = async () => {
      const token = Platform.OS === 'web' 
        ? localStorage.getItem('userToken') 
        : await SecureStore.getItemAsync('userToken');
      
      setIsLoggedIn(!!token);
    };

    checkAuth();
    return () => unsubscribe();
  }, [pathname]); // Re-check auth whenever user navigates

  const handleSignOut = async () => {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem('userToken');
      } else {
        await SecureStore.deleteItemAsync('userToken');
      }
      setIsLoggedIn(false);
      router.replace('/');
    } catch (e) {
      Alert.alert("Error", "Failed to sign out.");
    }
  };

  // Logic: Shield is only green if CONNECTED and LOGGED IN
  const isSystemReady = isConnected && isLoggedIn;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',

        headerStyle: {
          backgroundColor: '#020617',
          borderBottomWidth: 1,
          borderBottomColor: '#1e293b',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerRight: () => (
          <View className="flex-row items-center mr-4">
            <Pressable 
              onPress={handleSignOut} 
              hitSlop={20} 
              className="mr-5 active:opacity-60"
            >
              <MaterialCommunityIcons 
                name="logout" 
                size={22} 
                color="#ef4444" 
              />
            </Pressable>

            <Link href="/modal" asChild>
              <Pressable hitSlop={20}>
                {({ pressed }) => (
                  <MaterialCommunityIcons
                    name={isSystemReady ? 'shield-check' : 'shield-alert-outline'}
                    size={26}
                    color={isSystemReady ? '#22c55e' : '#ef4444'}
                    className={pressed ? 'opacity-60' : 'opacity-100'}
                  />
                )}
              </Pressable>
            </Link>
          </View>
        ),

        tabBarStyle: {
          backgroundColor: '#020617',
          borderTopColor: '#1e293b',
          height: Platform.OS === 'ios' ? 88 : 75,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: Platform.OS === 'android' ? 5 : 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'developer-board' : 'developer-board'}
              size={26}
              color={color}
            />
          )
        }}
      />

      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'robot-industrial' : 'robot-industrial-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="speech"
        options={{
          title: 'Speech',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'waveform' : 'waveform'}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="device_hub"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'memory' : 'memory'}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="database"
        options={{
          title: 'Database',
          tabBarIcon: ({ color, focused }) => (
            <MaterialCommunityIcons
              name={focused ? 'database' : 'database-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="[device]"
        options={{
          href: null,
          headerTitle: 'Component Specs',
          tabBarStyle: { display: 'none' },
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={25}
              className="ml-4"
            >
              <MaterialCommunityIcons name="chevron-left" size={34} color="#0ea5e9" />
            </Pressable>
          ),
        }}
      />
    </Tabs>
  );
}