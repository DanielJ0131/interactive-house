import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../utils/AppThemeContext';
import { registerEmergencyController } from '../utils/emergencyController';

type EmergencyState = 'confirm' | 'calling' | 'ended';

export default function EmergencyScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
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

  //for speech control
  useEffect(() => {
  registerEmergencyController({
    startCall: () => {
      startCall();
    },
  });

  return () => {
    registerEmergencyController({});
  };
}, []);

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Modal transparent visible={state === 'confirm'} animationType="none">
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.dangerSoft }]}>
            <View style={[styles.iconWrap, { backgroundColor: theme.colors.dangerSoft }]}>
              <MaterialCommunityIcons name="phone-alert" size={36} color={theme.colors.danger} />
            </View>

            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Emergency Assistance</Text>
            <Text style={[styles.modalText, { color: theme.colors.mutedText }]}>
              Do you want to start an emergency call?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.smallButton, styles.cancelButton, { backgroundColor: theme.colors.surfaceStrong }]}
                onPress={() => {
                  setState('confirm');
                  setSeconds(0);
                  router.back();
                }}
              >
                <Text style={[styles.buttonText, { color: theme.colors.accentText }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallButton, styles.callButton, { backgroundColor: theme.colors.danger }]}
                onPress={startCall}
              >
                <Text style={[styles.buttonText, { color: theme.colors.accentText }]}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {state === 'calling' && (
        <View style={styles.centerContent}>
          <View style={[styles.callingIcon, { backgroundColor: theme.colors.dangerSoft }]}>
            <MaterialCommunityIcons name="phone-in-talk" size={48} color={theme.colors.danger} />
          </View>
          <Text style={[styles.callingText, { color: theme.colors.danger }]}>Calling...</Text>
          <Text style={[styles.name, { color: theme.colors.text }]}>Emergency Support</Text>
          <Text style={[styles.timer, { color: theme.colors.mutedText }]}>{formatTime(seconds)}</Text>

          <TouchableOpacity style={[styles.endButton, { backgroundColor: theme.colors.danger }]} onPress={endCall}>
            <Text style={[styles.buttonText, { color: theme.colors.accentText }]}>End Call</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'ended' && (
        <View style={styles.centerContent}>
          <View style={[styles.endedIcon, { backgroundColor: theme.colors.accentSoft }]}>
            <MaterialCommunityIcons name="phone-hangup" size={48} color={theme.colors.accent} />
          </View>
          <Text style={[styles.endedText, { color: theme.colors.text }]}>Call ended</Text>

          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => {
              setState('confirm');
              setSeconds(0);
              router.back();
            }}
          >
            <Text style={[styles.buttonText, { color: theme.colors.accentText }]}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  endedIcon: {
    height: 96,
    width: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  callingText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  name: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 14,
  },
  timer: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 28,
  },
  endButton: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 16,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 16,
    marginTop: 12,
  },
  endedText: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
  },
  iconWrap: {
    height: 72,
    width: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalText: {
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
  },
  callButton: {
  },
});