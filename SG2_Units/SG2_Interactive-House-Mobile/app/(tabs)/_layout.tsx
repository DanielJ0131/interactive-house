import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, Tabs, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Platform, Pressable, View, Alert } from 'react-native';
import { cssInterop } from 'nativewind';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { onSnapshotsInSync } from 'firebase/firestore';
import { db, auth } from '../../utils/firebaseConfig';
import { useGuest } from '../../utils/GuestContext';

cssInterop(MaterialCommunityIcons, {
  className: 'style',
});

export default function TabLayout() {
  const router = useRouter();
  const { isGuest, setIsGuest } = useGuest();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Skip Firebase listeners in guest mode
    if (isGuest) return;

    // 1. Monitor Firestore Sync status
    const unsubscribeSync = onSnapshotsInSync(db, () => {
      setIsConnected(true);
    });

    // 2. Monitor Auth Status (Real-time listener)
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
        router.replace('/');
      }
    });

    return () => {
      unsubscribeSync();
      unsubscribeAuth();
    };
  }, [isGuest]);

  // 3. Sign Out / Leave Guest Mode
  const handleSignOut = async () => {
    const performSignOut = async () => {
      if (isGuest) {
        setIsGuest(false);
        router.replace('/');
        return;
      }
      try {
        await signOut(auth);
      } catch (e) {
        if (Platform.OS === 'web') {
          window.alert("Failed to sign out safely.");
        } else {
          Alert.alert("Error", "Failed to sign out safely.");
        }
      }
    };

    // WEB: Use standard browser confirmation
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to log out?")) {
        await performSignOut();
      }
      return;
    }

    // MOBILE: Use React Native Alert
    Alert.alert(
      "Sign Out",
      "Are you sure you want to log out of your smart home?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: performSignOut
        }
      ]
    );
  };

  const isSystemReady = isGuest || (isConnected && isLoggedIn);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: '#64748b',
        tabBarShowLabel: true,
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
                    name={isLoggedIn ? 'shield-check' : 'shield-alert-outline'}
                    size={26}
                    color={isLoggedIn ? '#22c55e' : '#ef4444'}
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
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Devices',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="memory" size={26} color={color} />
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="robot-industrial" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="speech"
        options={{
          title: 'Speech',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="waveform" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="device_hub"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="memory" size={26} color={color} />
        }}
      />
      <Tabs.Screen
        name="database"
        options={{
          title: 'Database',
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="database" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}