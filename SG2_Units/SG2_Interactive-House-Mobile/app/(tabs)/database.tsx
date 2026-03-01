import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert, 
  Platform,
  TextInput // Added for text editing
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import * as SecureStore from 'expo-secure-store';
import { db, API_BASE_URL } from '../../utils/firebaseConfig';

export default function DatabaseScreen() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [newDisplayText, setNewDisplayText] = useState(''); // State for the input field

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const token = Platform.OS === 'web' 
          ? localStorage.getItem('userToken') 
          : await SecureStore.getItemAsync('userToken');

        if (!token) {
          setError("No active session. Please login.");
          setLoading(false);
          return;
        }

        const payload = JSON.parse(atob(token.split('.')[1]));
        const username = payload.username;
        setCurrentUsername(username);

        const docRef = doc(db, "users", username);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            setData(userData);
            setNewDisplayText(userData.ledTextDisplay || ''); // Sync input with DB
          } else {
            setError(`House for ${username} not found.`);
          }
          setLoading(false);
        }, (err) => {
          setError(err.message);
          setLoading(false);
        });

        return unsubscribe;
      } catch (err: any) {
        setError("Failed to authenticate session.");
        setLoading(false);
      }
    };

    const unsubPromise = initializeSession();
    return () => {
      unsubPromise.then(unsub => unsub && unsub());
    };
  }, []);

  const updateDevice = async (deviceName: string, value: string) => {
    try {
      const token = Platform.OS === 'web' 
        ? localStorage.getItem('userToken') 
        : await SecureStore.getItemAsync('userToken');

      const response = await fetch(`${API_BASE_URL}/users/device`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ deviceName, value })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update device");
      }
    } catch (err: any) {
      Alert.alert("Update Error", err.message);
    }
  };

  const toggleDevice = async (deviceName: string, currentValue: string) => {
    const newValue = (currentValue === 'on' || currentValue === 'open') 
      ? (deviceName === 'door' || deviceName === 'window' ? 'closed' : 'off') 
      : (deviceName === 'door' || deviceName === 'window' ? 'open' : 'on');
    await updateDevice(deviceName, newValue);
  };

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#0ea5e9" />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#020617', padding: 20 }}>
      <View style={{ marginTop: 40, marginBottom: 30 }}>
        <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold' }}>
          {currentUsername ? `${currentUsername}'s House` : 'House Hub'}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 16 }}>Live Status & Control</Text>
      </View>

      {error && (
        <View style={{ backgroundColor: '#ef444420', padding: 15, borderRadius: 12, marginBottom: 20 }}>
          <Text style={{ color: '#ef4444' }}>{error}</Text>
        </View>
      )}

      {data && (
        <View style={{ gap: 15 }}>
          <DeviceCard name="Light" value={data.light} onToggle={() => toggleDevice('light', data.light)} />
          <DeviceCard name="Fan" value={data.fan} onToggle={() => toggleDevice('fan', data.fan)} />
          <DeviceCard name="Door" value={data.door} onToggle={() => toggleDevice('door', data.door)} />
          <DeviceCard name="Speaker" value={data.speaker} onToggle={() => toggleDevice('speaker', data.speaker)} />
          <DeviceCard name="Window" value={data.window} onToggle={() => toggleDevice('window', data.window)} />
          
          {/* UPDATED: LED Display with Edit Text functionality */}
          <View style={{ backgroundColor: '#1e293b', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' }}>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 8, fontWeight: 'bold', letterSpacing: 1 }}>LED DISPLAY</Text>
            
            <TextInput
              style={{ 
                backgroundColor: '#0f172a', 
                color: '#0ea5e9', 
                fontSize: 18, 
                fontWeight: '600', 
                padding: 12, 
                borderRadius: 8,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: '#1e293b'
              }}
              value={newDisplayText}
              onChangeText={setNewDisplayText}
              placeholder="Enter message..."
              placeholderTextColor="#475569"
            />
            
            <TouchableOpacity 
              onPress={() => updateDevice('ledTextDisplay', newDisplayText)}
              style={{ 
                backgroundColor: '#0ea5e9', 
                padding: 12, 
                borderRadius: 8, 
                alignItems: 'center' 
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Update Display</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ marginTop: 40, marginBottom: 40 }}>
        <Text style={{ color: '#475569', fontSize: 12, marginBottom: 10, fontWeight: 'bold' }}>SYSTEM RAW DATA</Text>
        <View style={{ backgroundColor: '#0f172a', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' }}>
          <Text style={{ color: '#4ade80', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 }}>
            {JSON.stringify(data, null, 2)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function DeviceCard({ name, value, onToggle }: { name: string, value: string, onToggle: () => void }) {
  const isActive = value === 'on' || value === 'open';
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={{ 
      backgroundColor: isActive ? '#0ea5e915' : '#1e293b', 
      padding: 20, borderRadius: 16, flexDirection: 'row', 
      justifyContent: 'space-between', alignItems: 'center',
      borderWidth: 1, borderColor: isActive ? '#0ea5e9' : '#334155'
    }}>
      <View>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Tap to toggle</Text>
      </View>
      <View style={{ backgroundColor: isActive ? '#0ea5e9' : '#475569', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>{value}</Text>
      </View>
    </TouchableOpacity>
  );
}