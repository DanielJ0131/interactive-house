import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

type EmergencyState = 'confirm' | 'calling' | 'ended';

export default function EmergencyScreen() {
  const router = useRouter();
  const [state, setState] = useState<EmergencyState>('confirm');
  const [seconds, setSeconds] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setState('confirm');
      setSeconds(0);
    }, [])
  );

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (state === 'calling') {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [state]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const startCall = () => {
    setSeconds(0);
    setState('calling');
  };

  const endCall = () => {
    setState('ended');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal transparent visible={state === 'confirm'} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="phone-alert" size={36} color="#f87171" />
            </View>

            <Text style={styles.modalTitle}>Emergency Assistance</Text>
            <Text style={styles.modalText}>
              Do you want to start an emergency call?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.smallButton, styles.cancelButton]}
                onPress={() => {
                  setState('confirm');
                  setSeconds(0);
                  router.back();
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallButton, styles.callButton]}
                onPress={startCall}
              >
                <Text style={styles.buttonText}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {state === 'calling' && (
        <View style={styles.centerContent}>
          <View style={styles.callingIcon}>
            <MaterialCommunityIcons name="phone-in-talk" size={48} color="#f87171" />
          </View>
          <Text style={styles.callingText}>Calling...</Text>
          <Text style={styles.name}>Emergency Support</Text>
          <Text style={styles.timer}>{formatTime(seconds)}</Text>

          <TouchableOpacity style={styles.endButton} onPress={endCall}>
            <Text style={styles.buttonText}>End Call</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'ended' && (
        <View style={styles.centerContent}>
          <View style={styles.endedIcon}>
            <MaterialCommunityIcons name="phone-hangup" size={48} color="#38bdf8" />
          </View>
          <Text style={styles.endedText}>Call ended</Text>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setState('confirm');
              setSeconds(0);
              router.back();
            }}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  callingIcon: {
    height: 96,
    width: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  endedIcon: {
    height: 96,
    width: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  callingText: {
    color: '#f87171',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  name: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 14,
  },
  timer: {
    color: '#94a3b8',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 28,
  },
  endButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 16,
  },
  backButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 16,
    marginTop: 12,
  },
  endedText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  iconWrap: {
    height: 72,
    width: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    alignSelf: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalText: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  smallButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#334155',
  },
  callButton: {
    backgroundColor: '#dc2626',
  },
});