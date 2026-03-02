import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, ScrollView, KeyboardAvoidingView, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_BASE_URL, REGISTRATION_API_KEY } from '../../utils/firebaseConfig';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignup = async (e: any) => {
    if (Platform.OS === 'web') e.currentTarget.blur();

    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': REGISTRATION_API_KEY || '',
        },
        body: JSON.stringify({
          username: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.status === 201) {
        Alert.alert('Success', 'Account created! Please log in.');
        router.replace('/login');
      } else {
        Alert.alert('Registration Failed', data.message || 'Check your API Key or if user exists.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Network Error', 'Could not connect to the smart home server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#020617' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 justify-center p-8">
            
            {/* UPDATED: Back Button with Absolute Positioning to match Login */}
            <View className="absolute top-4 left-4 z-10">
              <Pressable 
                onPress={() => router.replace('/')} 
                className="flex-row items-center p-2 active:opacity-60"
              >
                <MaterialCommunityIcons name="chevron-left" size={28} color="#0ea5e9" />
                <Text className="text-sky-500 font-bold text-lg">Back</Text>
              </Pressable>
            </View>

            {/* Added top margin to the header to prevent overlap with the back button */}
            <View className="mt-8">
              <Text className="text-white text-4xl font-bold mb-2">Create Account</Text>
              <Text className="text-slate-500 mb-8">Start your smart home journey today.</Text>
            </View>

            <View className="space-y-4">
              <Text className="text-slate-400 mb-2 ml-1 font-medium">Full Name</Text>
              <TextInput
                placeholder="Name Example"
                placeholderTextColor="#475569"
                value={name}
                onChangeText={setName}
                className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl mb-4"
              />

              <Text className="text-slate-400 mb-2 ml-1 font-medium">Username (Email)</Text>
              <TextInput
                placeholder="name@example.com"
                placeholderTextColor="#475569"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl mb-4"
              />

              <Text className="text-slate-400 mb-2 ml-1 font-medium">Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl mb-4"
                secureTextEntry
              />

              <Text className="text-slate-400 mb-2 ml-1 font-medium">Confirm Password</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#475569"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl mb-4"
                secureTextEntry
              />

              <Pressable
                onPress={handleSignup}
                disabled={isSubmitting}
                className={`p-5 rounded-2xl shadow-lg ${isSubmitting ? 'bg-slate-700' : 'bg-sky-500 active:bg-sky-600 shadow-sky-500/20'}`}
              >
                <Text className="text-white text-center font-bold text-lg">
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </Text>
              </Pressable>
            </View>

            <View className="flex-row justify-center mt-10">
              <Text className="text-slate-500">Already have an account? </Text>
              <Link href="/login" asChild>
                <Pressable>
                  <Text className="text-sky-400 font-bold">Sign In</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}