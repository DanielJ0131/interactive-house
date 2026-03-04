import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  TouchableOpacity, 
  Alert, 
  Platform 
} from 'react-native';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../utils/firebaseConfig';

export default function DatabaseScreen() {
  const [deviceData, setDeviceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const user = auth.currentUser;

  // Listen to the "devices" collection
  useEffect(() => {
    if (!user || !user.email) {
      setLoading(false);
      setError("Please login to view devices.");
      return;
    }

    const docRef = doc(db, "devices", user.email);

    const unsubscribeData = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setDeviceData(docSnap.data());
        setError(null);
      } else {
        setError(`No device configuration found for ${user.email}`);
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Failed to fetch device data.");
      setLoading(false);
    });

    return () => unsubscribeData();
  }, [user]);

  // 3. Update specific state within the Map without overwriting other fields (pin/value)
  const toggleDevice = async (deviceName: string) => {
    if (!user?.email || !deviceData?.[deviceName]) return;

    const currentDevice = deviceData[deviceName];
    const currentState = currentDevice.state;

    // Determine new state based on current state
    let newState = '';
    if (currentState === 'on' || currentState === 'open') {
      newState = (deviceName === 'door' || deviceName === 'window') ? 'closed' : 'off';
    } else {
      newState = (deviceName === 'door' || deviceName === 'window') ? 'open' : 'on';
    }

    try {
      const docRef = doc(db, "devices", user.email);
      // We use dot notation "deviceName.state" to only update that specific field
      await updateDoc(docRef, {
        [`${deviceName}.state`]: newState
      });
    } catch (err: any) {
      Alert.alert("Toggle Error", err.message);
    }
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
          {user?.displayName ? `${user.displayName}'s Home` : 'My Home'}
        </Text>
        <Text style={{ color: '#64748b', fontSize: 16 }}>Hardware Control Panel</Text>
      </View>

      {error && (
        <View style={{ backgroundColor: '#ef444420', padding: 15, borderRadius: 12, marginBottom: 20 }}>
          <Text style={{ color: '#ef4444' }}>{error}</Text>
        </View>
      )}

      {deviceData && (
        <View style={{ gap: 15 }}>
          <DeviceCard name="White Light" data={deviceData.white_light} onToggle={() => toggleDevice('white_light')} />
          <DeviceCard name="Orange Light" data={deviceData.orange_light} onToggle={() => toggleDevice('orange_light')} />
          <DeviceCard name="Fan INA" data={deviceData.fan_INA} onToggle={() => toggleDevice('fan_INA')} />
          <DeviceCard name="Fan INB" data={deviceData.fan_INB} onToggle={() => toggleDevice('fan_INB')} />
          <DeviceCard name="Door" data={deviceData.door} onToggle={() => toggleDevice('door')} />
          <DeviceCard name="Window" data={deviceData.window} onToggle={() => toggleDevice('window')} />
          <DeviceCard name="Buzzer" data={deviceData.buzzer} onToggle={() => toggleDevice('buzzer')} />
        </View>
      )}

      <View style={{ marginTop: 40, marginBottom: 40 }}>
        <Text style={{ color: '#475569', fontSize: 12, marginBottom: 10, fontWeight: 'bold' }}>HARDWARE DEBUG</Text>
        <View style={{ backgroundColor: '#0f172a', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' }}>
          <Text style={{ color: '#4ade80', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 11 }}>
            {JSON.stringify(deviceData, null, 2)}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

// Reusable DeviceCard Component for the new Map structure
function DeviceCard({ name, data, onToggle }: { name: string, data: any, onToggle: () => void }) {
  if (!data) return null;

  const isActive = data.state === 'on' || data.state === 'open';
  
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={{ 
      backgroundColor: isActive ? '#0ea5e915' : '#1e293b', 
      padding: 20, borderRadius: 16, flexDirection: 'row', 
      justifyContent: 'space-between', alignItems: 'center',
      borderWidth: 1, borderColor: isActive ? '#0ea5e9' : '#334155'
    }}>
      <View>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Pin: {data.pin}</Text>
      </View>
      <View style={{ backgroundColor: isActive ? '#0ea5e9' : '#475569', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' }}>{data.state}</Text>
      </View>
    </TouchableOpacity>
  );
}