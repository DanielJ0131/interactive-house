import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, onSnapshot, setDoc, deleteDoc, type DocumentData } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../utils/firebaseConfig';
import { getMusicCollectionRef } from '../../utils/firestorePaths';
import { registerMusicController } from '@/utils/musicController';  
import { useGuest } from '../../utils/GuestContext';
import {
  initializeAudioContext,
  playInstrumentNote,
  stopAllInstrumentNotes,
  type AudioContextType,
  type InstrumentOption,
} from '../../utils/musicAudio';
import { useAppTheme } from '../../utils/AppThemeContext';

interface Melody {
  id: string;
  name: string;
  artist?: string;
  frequencies: number[];
  noteDelays?: number[];
  state: 'on' | 'off';
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const OCTAVE_KEYS = [
  { label: 'C', isBlack: false, whiteIndex: 0 },
  { label: 'C#', isBlack: true, whiteIndex: 0 },
  { label: 'D', isBlack: false, whiteIndex: 1 },
  { label: 'D#', isBlack: true, whiteIndex: 1 },
  { label: 'E', isBlack: false, whiteIndex: 2 },
  { label: 'F', isBlack: false, whiteIndex: 3 },
  { label: 'F#', isBlack: true, whiteIndex: 3 },
  { label: 'G', isBlack: false, whiteIndex: 4 },
  { label: 'G#', isBlack: true, whiteIndex: 4 },
  { label: 'A', isBlack: false, whiteIndex: 5 },
  { label: 'A#', isBlack: true, whiteIndex: 5 },
  { label: 'B', isBlack: false, whiteIndex: 6 },
] as const;

const frequencyToNoteName = (frequency: number) => {
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return 'Rest';
  }

  const midiNumber = Math.round(69 + 12 * Math.log2(frequency / 440));
  const noteIndex = ((midiNumber % 12) + 12) % 12;
  return NOTE_NAMES[noteIndex] ?? 'Rest';
};

function FakePiano({
  frequencies,
  activeNoteIndex,
  isActive,
}: {
  frequencies: number[];
  activeNoteIndex: number;
  isActive: boolean;
}) {
  const visibleNotes = OCTAVE_KEYS;
  const activeFrequency = frequencies[activeNoteIndex] ?? 0;
  const activeNoteName = frequencyToNoteName(activeFrequency);

  const renderNoteLabel = (label: string, isHighlighted: boolean, isBlackKey: boolean) => {
    const sharpIndex = label.indexOf('#');

    if (sharpIndex === -1) {
      return (
        <Text
          numberOfLines={1}
          style={{
            color: isHighlighted ? '#111827' : isBlackKey ? '#ffffff' : '#334155',
            fontSize: 11,
            fontWeight: '600',
          }}
        >
          {label}
        </Text>
      );
    }

    const baseNote = label.slice(0, sharpIndex);

    return (
      <View className="items-center justify-end">
        <Text
          style={{
            color: isHighlighted ? '#111827' : isBlackKey ? '#ffffff' : '#334155',
            fontSize: 10,
            fontWeight: '600',
            lineHeight: 12,
          }}
        >
          {baseNote}
        </Text>
        <Text
          style={{
            color: isHighlighted ? '#111827' : isBlackKey ? '#ffffff' : '#334155',
            fontSize: 9,
            fontWeight: '800',
            lineHeight: 10,
            marginTop: -1,
          }}
        >
          #
        </Text>
      </View>
    );
  };

  return (
    <View className="w-full overflow-hidden rounded-2xl bg-black/5 p-2">
      <View style={{ height: 128 }} className="relative w-full">
        <View className="absolute inset-x-0 bottom-0 flex-row h-24">
          {visibleNotes
            .filter((key) => !key.isBlack)
            .map((key) => {
              const isHighlighted = isActive && activeNoteName === key.label;

              return (
                <View
                  key={key.label}
                  style={{
                    flex: 1,
                  backgroundColor: isHighlighted ? '#facc15' : '#f8fafc',
                  borderColor: isHighlighted ? '#eab308' : '#d4d4d8',
                  shadowColor: '#000000',
                  shadowOpacity: isHighlighted ? 0.22 : 0.07,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 2 },
                    elevation: isHighlighted ? 3 : 1,
                  }}
                  className="items-center justify-end rounded-b-lg border px-1 pb-2"
                >
                  <Text
                    numberOfLines={1}
                    style={{
                        color: isHighlighted ? '#111827' : '#334155',
                      fontSize: 11,
                      fontWeight: '600',
                    }}
                  >
                    {key.label}
                  </Text>
                </View>
              );
            })}
        </View>

        {visibleNotes
          .filter((key) => key.isBlack)
          .map((key) => {
            const isHighlighted = isActive && activeNoteName === key.label;
            const blackKeyStyle = {
              position: 'absolute' as const,
              left: `${((key.whiteIndex + 1) / 7) * 100 - 3.2}%`,
              top: 0,
              width: '6.4%',
              height: isHighlighted ? 69 : 66,
              backgroundColor: isHighlighted ? '#facc15' : '#111827',
              borderColor: isHighlighted ? '#eab308' : '#000000',
              shadowColor: '#000000',
              shadowOpacity: isHighlighted ? 0.26 : 0.14,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 3 },
              elevation: isHighlighted ? 4 : 2,
            } as const;

            return (
              <View
                key={key.label}
                style={blackKeyStyle}
                className="items-center justify-end rounded-b-lg border px-1 pb-2"
              >
                {renderNoteLabel(key.label, isHighlighted, true)}
              </View>
            );
          })}
      </View>
    </View>
  );
}

export default function MusicScreen() {
  const { theme } = useAppTheme();
  const speedOptions = [0.5, 1, 1.5, 2];
  const instrumentOptions: InstrumentOption[] = ['square', 'sawtooth', 'electric piano'];
  const { isGuest } = useGuest();
  const [melodies, setMelodies] = useState<Melody[]>([]);
  const [selectedMelody, setSelectedMelody] = useState<Melody | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingMelodyId, setPlayingMelodyId] = useState<string | null>(null);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [instrument, setInstrument] = useState<InstrumentOption>('square');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(() => Boolean(auth.currentUser));
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(auth.currentUser));
  const [isAdmin, setIsAdmin] = useState(false);
  const [newMelodyName, setNewMelodyName] = useState('');
  const [newMelodyArtist, setNewMelodyArtist] = useState('');
  const [newMelodyFrequencies, setNewMelodyFrequencies] = useState('');
  const [newMelodyDelays, setNewMelodyDelays] = useState('');
  const [isSavingMelody, setIsSavingMelody] = useState(false);
  const [editMelodyFrequencies, setEditMelodyFrequencies] = useState('');
  const [editMelodyDelays, setEditMelodyDelays] = useState('');
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [isUpdatingMelody, setIsUpdatingMelody] = useState(false);
  const [deletingMelodyId, setDeletingMelodyId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContextType>({});
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainsRef = useRef<GainNode[]>([]);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackStateRef = useRef<{ melody: Melody | null; index: number; isActive: boolean }>({
    melody: null,
    index: 0,
    isActive: false,
  });
  const playbackSpeedRef = useRef(playbackSpeed);
  const instrumentRef = useRef<InstrumentOption>(instrument);
  const activeUserEmail = auth.currentUser?.email ?? 'none';
  const activeProjectId = db.app.options.projectId ?? 'unknown';

  const hydrateMelodiesFromSnapshot = (nextMelodies: Melody[]) => {
    setMelodies(nextMelodies);

    const currentlyPlayingMelody = nextMelodies.find((melody) => melody.state === 'on');

    if (currentlyPlayingMelody) {
      setSelectedMelody(currentlyPlayingMelody);
      return;
    }

    setSelectedMelody((prev) => {
      if (!prev) {
        return nextMelodies[0] ?? null;
      }

      return nextMelodies.find((melody) => melody.id === prev.id) ?? nextMelodies[0] ?? prev;
    });
  };

  const setOnlyOneMelodyOn = async (melodyId: string, nextState: 'on' | 'off') => {
    setMelodies((prev) =>
      prev.map((melody) => ({
        ...melody,
        state: melody.id === melodyId ? nextState : 'off',
      }))
    );

    setSelectedMelody((prev) => {
      if (!prev) {
        return prev;
      }

      if (prev.id === melodyId) {
        return {
          ...prev,
          state: nextState,
        };
      }

      const activeMelody = melodies.find((melody) => melody.id === melodyId);

      return activeMelody
        ? {
            ...activeMelody,
            state: nextState,
          }
        : prev;
    });

    if (isGuest || !isAuthenticated || !isAdmin) {
      return;
    }

    try {
      const offWrites = melodies.map((melody) =>
        setDoc(
          doc(getMusicCollectionRef(db), melody.id),
          {
            state: 'off',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        )
      );

      await Promise.all(offWrites);

      if (nextState === 'on') {
        await setDoc(
          doc(getMusicCollectionRef(db), melodyId),
          {
            state: 'on',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.error(`Error updating melody states for ${melodyId}:`, error);
    }
  };

  const syncMelodyState = async (melodyId: string, nextState: 'on' | 'off') => {
    setMelodies((prev) =>
      prev.map((melody) => ({
        ...melody,
        state: melody.id === melodyId ? nextState : melody.state,
      }))
    );

    setSelectedMelody((prev) => {
      if (!prev) return prev;

      if (prev.id === melodyId) {
        return {
          ...prev,
          state: nextState,
        };
      }

      return prev;
    });

    if (isGuest || !isAuthenticated || !isAdmin) {
      return;
    }

    try {
      await setDoc(
        doc(getMusicCollectionRef(db), melodyId),
        {
          state: nextState,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error(`Error updating melody state for ${melodyId}:`, error);
    }
  };

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    instrumentRef.current = instrument;
  }, [instrument]);

  // Wait for Firebase auth restoration so queries don't run too early.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(Boolean(user));
      setIsAuthReady(true);

      if (!user) {
        setIsAdmin(false);
        return;
      }

      const userDocRefs = [
        user.email ? doc(db, 'users', user.email) : null,
        doc(db, 'users', user.uid),
      ].filter(Boolean) as ReturnType<typeof doc>[];

      (async () => {
        try {
          for (const userDocRef of userDocRefs) {
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
              const role = String(snap.data()?.role || '').toLowerCase();
              setIsAdmin(role === 'admin');
              return;
            }
          }
          setIsAdmin(false);
        } catch (error) {
          console.error('Error resolving user role:', error);
          setIsAdmin(false);
        }
      })();
    });

    return unsubscribe;
  }, []);

  // Keep melodies in sync with Firestore so remote state changes are reflected immediately.
  useEffect(() => {
    if (isGuest) {
      setMelodies([]);
      setSelectedMelody(null);
      setCurrentNoteIndex(-1);
      setLoadError('Guest mode cannot access cloud melodies. Sign in to view songs.');
      setIsLoading(false);
      return;
    }

    if (!isAuthReady) {
      setIsLoading(true);
      return;
    }

    if (!isAuthenticated) {
      setMelodies([]);
      setSelectedMelody(null);
      setCurrentNoteIndex(-1);
      setLoadError('Please sign in to load cloud melodies.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const unsubscribe = onSnapshot(
      getMusicCollectionRef(db),
      (querySnapshot) => {
        const nextMelodies: Melody[] = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as DocumentData;
          const frequencies = data.frequencies || [];
          const noteDelays = data.noteDelays || [];

          nextMelodies.push({
            id: docSnap.id,
            name: docSnap.id,
            artist: data.artist || 'Unknown',
            frequencies: Object.values(frequencies).map((f) => Number(f)),
            noteDelays: Object.values(noteDelays).map((d) => Number(d)),
            state: data.state === 'on' ? 'on' : 'off',
          });
        });

        hydrateMelodiesFromSnapshot(nextMelodies);
        setIsLoading(false);
      },
      (error) => {
        const errorCode = error?.code ? ` (${error.code})` : '';
        if (error?.code === 'permission-denied') {
          setLoadError(`Access denied to melodies${errorCode}. Please sign in with an authorized account.`);
        } else {
          setLoadError(`Unable to load melodies right now${errorCode}. Please try again.`);
        }
        setIsLoading(false);
        console.error('Error syncing melodies:', error);
      }
    );

    return unsubscribe;
  }, [isGuest, isAuthReady, isAuthenticated]);

  const parseFrequencies = (value: string): number[] => {
    const tokens = value
      .split(/[,\s]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    const sequence: number[] = [];

    tokens.forEach((token) => {
      // p, pause, rest, p2, pause3 ... are treated as rests (0 Hz)
      const pauseMatch = token.match(/^(p|pause|rest)(\d+)?$/i);
      if (pauseMatch) {
        const count = pauseMatch[2] ? Number(pauseMatch[2]) : 1;
        const pauseCount = Number.isFinite(count) && count > 0 ? count : 1;
        for (let i = 0; i < pauseCount; i += 1) {
          sequence.push(0);
        }
        return;
      }

      const valueNum = Number(token);
      if (Number.isFinite(valueNum) && valueNum >= 0) {
        sequence.push(valueNum);
      }
    });

    return sequence;
  };

  const parseNoteDelays = (value: string): number[] =>
    value
      .split(/[\s,]+/)
      .map((token) => Number(token.trim()))
      .filter((delay) => Number.isFinite(delay) && delay >= 0);

  const formatMelodySequence = (sequence: number[]) =>
    sequence.map((freq) => (freq <= 0 ? '0' : String(freq))).join(', ');

  const formatAlignedFrequencyDelayStrings = (frequencies: number[], delays: number[]) => {
    const length = Math.max(frequencies.length, delays.length);
    const frequencyTokens: string[] = [];
    const delayTokens: string[] = [];

    for (let i = 0; i < length; i += 1) {
      const frequencyToken = i < frequencies.length
        ? frequencies[i] <= 0
          ? '0'
          : String(frequencies[i])
        : '';
      const delayToken = i < delays.length ? String(delays[i]) : '';
      const tokenWidth = Math.max(frequencyToken.length, delayToken.length, 1);

      frequencyTokens.push(frequencyToken.padStart(tokenWidth, ' '));
      delayTokens.push(delayToken.padStart(tokenWidth, ' '));
    }

    return {
      frequenciesText: frequencyTokens.join(', '),
      delaysText: delayTokens.join(', '),
    };
  };

  const monospaceFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  useEffect(() => {
    if (!selectedMelody) {
      setEditMelodyFrequencies('');
      setEditMelodyDelays('');
      setIsEditPanelOpen(false);
      return;
    }

    const aligned = formatAlignedFrequencyDelayStrings(
      selectedMelody.frequencies,
      selectedMelody.noteDelays || []
    );
    setEditMelodyFrequencies(aligned.frequenciesText);
    setEditMelodyDelays(aligned.delaysText);
  }, [selectedMelody]);

  const isSelectedMelodyPlaying = playingMelodyId === selectedMelody?.id && isPlaying;

  useEffect(() => {
    const activeMelody = melodies.find((melody) => melody.state === 'on');

    if (activeMelody && activeMelody.id !== selectedMelody?.id) {
      setSelectedMelody(activeMelody);
    }
  }, [melodies, selectedMelody?.id]);

  const handleAddMelody = async () => {
    if (isSavingMelody) return;

    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Please sign in before adding a melody.');
      return;
    }

    if (!isAdmin) {
      Alert.alert('Admin required', 'Only admin users can add melodies.');
      return;
    }

    const melodyName = newMelodyName.trim();
    const artistName = newMelodyArtist.trim() || 'Unknown';
    const frequencies = parseFrequencies(newMelodyFrequencies);
    const noteDelays = parseNoteDelays(newMelodyDelays);

    if (!melodyName) {
      Alert.alert('Missing name', 'Enter a melody name.');
      return;
    }

    if (frequencies.length === 0 || frequencies.every((freq) => freq <= 0)) {
      Alert.alert('Invalid frequencies', 'Enter notes and optional pauses as 0, for example 262, 294, 0, 330.');
      return;
    }

    if (noteDelays.length === 0) {
      Alert.alert('Missing note delays', 'Enter an Arduino delay value for each note, for example 500, 500, 250, 750.');
      return;
    }

    if (noteDelays.length !== frequencies.length) {
      Alert.alert('Sequence mismatch', 'Delay count must match frequency count so each note has one Arduino delay value.');
      return;
    }

    if (melodyName.includes('/')) {
      Alert.alert('Invalid name', 'Melody name cannot include /.');
      return;
    }

    try {
      setIsSavingMelody(true);
      const melodyDocRef = doc(getMusicCollectionRef(db), melodyName);
      await setDoc(melodyDocRef, {
        name: melodyName,
        artist: artistName,
        frequencies,
        noteDelays,
        updatedAt: new Date().toISOString(),
      });

      const createdMelody: Melody = {
        id: melodyName,
        name: melodyName,
        artist: artistName,
        frequencies,
        noteDelays,
        state: 'off',
      };

      setMelodies((prev) => {
        const withoutDuplicate = prev.filter((m) => m.id !== createdMelody.id);
        return [createdMelody, ...withoutDuplicate];
      });
      setSelectedMelody(createdMelody);
      setCurrentNoteIndex(-1);
      setNewMelodyName('');
      setNewMelodyArtist('');
      setNewMelodyFrequencies('');
      setNewMelodyDelays('');
      Alert.alert('Saved', `Melody "${melodyName}" was saved.`);
    } catch (error: any) {
      const message = error?.code ? `Unable to save melody (${error.code}).` : 'Unable to save melody.';
      console.error('Error adding melody:', error);
      Alert.alert('Save failed', message);
    } finally {
      setIsSavingMelody(false);
    }
  };

  const performDeleteMelody = async (melody: Melody) => {
    try {
      setDeletingMelodyId(melody.id);
      await deleteDoc(doc(getMusicCollectionRef(db), melody.id));

      const wasSelected = selectedMelody?.id === melody.id;
      const wasPlayingSelected = isPlaying && wasSelected;

      setMelodies((prev) => {
        const remainingMelodies = prev.filter((m) => m.id !== melody.id);

        if (wasSelected) {
          setSelectedMelody(remainingMelodies.length > 0 ? remainingMelodies[0] : null);
        }

        return remainingMelodies;
      });

      if (wasPlayingSelected) {
        stopMelody();
      }

      if (selectedMelody?.id === melody.id) {
        setCurrentNoteIndex(-1);
      }

      Alert.alert('Deleted', `Melody "${melody.name}" was deleted.`);
    } catch (error: any) {
      const message = error?.code
        ? `Unable to delete melody (${error.code}).`
        : 'Unable to delete melody.';
      console.error('Error deleting melody:', error);
      Alert.alert('Delete failed', message);
    } finally {
      setDeletingMelodyId(null);
    }
  };

  const handleUpdateMelody = async () => {
    if (isUpdatingMelody || !selectedMelody) return;

    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Please sign in before editing a melody.');
      return;
    }

    if (!isAdmin) {
      Alert.alert('Admin required', 'Only admin users can edit melodies.');
      return;
    }

    const frequencies = parseFrequencies(editMelodyFrequencies);
    const noteDelays = parseNoteDelays(editMelodyDelays);

    if (frequencies.length === 0 || frequencies.every((freq) => freq <= 0)) {
      Alert.alert('Invalid frequencies', 'Enter notes and optional pauses as 0, for example 262, 294, 0, 330.');
      return;
    }

    if (noteDelays.length === 0) {
      Alert.alert('Missing note delays', 'Enter an Arduino delay value for each note, for example 500, 500, 250, 750.');
      return;
    }

    if (noteDelays.length !== frequencies.length) {
      Alert.alert('Sequence mismatch', 'Delay count must match frequency count so each note has one Arduino delay value.');
      return;
    }

    try {
      setIsUpdatingMelody(true);
      const melodyDocRef = doc(getMusicCollectionRef(db), selectedMelody.id);
      await setDoc(
        melodyDocRef,
        {
          frequencies,
          noteDelays,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setMelodies((prev) =>
        prev.map((melody) =>
          melody.id === selectedMelody.id
            ? {
                ...melody,
                frequencies,
                noteDelays,
              }
            : melody
        )
      );

      setSelectedMelody((prev) =>
        prev
          ? {
              ...prev,
              frequencies,
              noteDelays,
            }
          : prev
      );

      Alert.alert('Updated', `Melody "${selectedMelody.name}" was updated.`);
    } catch (error: any) {
      const message = error?.code ? `Unable to update melody (${error.code}).` : 'Unable to update melody.';
      console.error('Error updating melody:', error);
      Alert.alert('Update failed', message);
    } finally {
      setIsUpdatingMelody(false);
    }
  };

  const handleDeleteMelody = (melody: Melody) => {
    if (deletingMelodyId) return;

    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Please sign in before deleting a melody.');
      return;
    }

    if (!isAdmin) {
      Alert.alert('Admin required', 'Only admin users can delete melodies.');
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Delete "${melody.name}"? This will permanently remove it from cloud storage.`
      );
      if (!confirmed) return;
      void performDeleteMelody(melody);
      return;
    }

    Alert.alert('Delete melody?', `This will permanently delete "${melody.name}" from cloud storage.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void performDeleteMelody(melody);
        },
      },
    ]);
  };

  // Stop all playing oscillators
  const stopMelody = () => {
    const activeMelodyId = playbackStateRef.current.melody?.id;

    playbackStateRef.current.isActive = false;
    playbackStateRef.current.index = 0;
    playbackStateRef.current.melody = null;

    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }

    void stopAllInstrumentNotes({
      audioContextRef,
      oscillatorsRef,
      gainsRef,
    });
    setIsPlaying(false);
    setCurrentNoteIndex(-1);

    if (activeMelodyId) {
      void setOnlyOneMelodyOn(activeMelodyId, 'off');
    }
  };

  useEffect(() => {
    return () => {
      stopMelody();
    };
  }, []);

  // Play melody with frequencies
  const playMelody = async (melody: Melody) => {
    try {
      // Stop any currently playing melody
      if (isPlaying) {
        stopMelody();
      }

      const audioContext = initializeAudioContext(audioContextRef);
      if (!audioContext) {
        throw new Error('Audio context could not be initialized.');
      }

      // Resume audio context if suspended (required for web browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      setIsPlaying(true);
      setCurrentNoteIndex(0);
      playbackStateRef.current = {
        melody,
        index: 0,
        isActive: true,
      };
      setPlayingMelodyId(melody.id);
      void setOnlyOneMelodyOn(melody.id, 'on');

      const playNextNote = async () => {
        const playbackState = playbackStateRef.current;
        if (!playbackState.isActive || !playbackState.melody) {
          return;
        }

        const currentMelody = playbackState.melody;
        const noteIndex = playbackState.index;

        if (noteIndex >= currentMelody.frequencies.length) {
          playbackStateRef.current.isActive = false;
          playbackStateRef.current.melody = null;
          setIsPlaying(false);
          setCurrentNoteIndex(-1);
          playbackTimeoutRef.current = null;
          void setOnlyOneMelodyOn(currentMelody.id, 'off');
          return;
        }

        const speedNow = playbackSpeedRef.current;
        const baseNoteLength = 0.5 / speedNow; // Higher speed means shorter notes
        const hasPerNoteDelays =
          Array.isArray(currentMelody.noteDelays) &&
          currentMelody.noteDelays.length === currentMelody.frequencies.length;
        const frequency = currentMelody.frequencies[noteIndex];
        const noteDelayMs = hasPerNoteDelays ? Number(currentMelody.noteDelays?.[noteIndex]) : NaN;
        const noteLength =
          Number.isFinite(noteDelayMs) && noteDelayMs >= 0
            ? (noteDelayMs as number) / 1000 / speedNow
            : baseNoteLength;

        if (frequency > 0) {
          const noteStartTime = 'currentTime' in audioContext ? audioContext.currentTime : 0;
          const activeInstrument = instrumentRef.current;

          playInstrumentNote({
            audioContextRef,
            audioContext,
            instrument: activeInstrument,
            frequency,
            noteLength,
            noteStartTime,
            oscillatorsRef,
            gainsRef,
          });
        }

        setCurrentNoteIndex(noteIndex);

        playbackStateRef.current.index = noteIndex + 1;
        playbackTimeoutRef.current = setTimeout(() => {
          void playNextNote();
        }, noteLength * 1000);
      };

      void playNextNote();
    } catch (error) {
      console.error('Error playing melody:', error);
      setIsPlaying(false);
      setPlayingMelodyId(null);
      setCurrentNoteIndex(-1);
    }
  };
// fpr speech
useEffect(() => {
  registerMusicController({
    play: () => {
      if (selectedMelody) {
        playMelody(selectedMelody);
      }
    },

    stop: () => {
      stopMelody();
    },

    setInstrument: (inst) => {
      setInstrument(inst);
    },

    setSpeed: (speed) => {
      setPlaybackSpeed(speed);
    },

    playSongByName: (text: string) => {
      const normalize = (s: string) =>
        s.toLowerCase().replace(/[^a-z0-9\s]/g, "");

      const input = normalize(text);

      const found = melodies.find((m) => {
        const name = normalize(m.name);
        return input.includes(name) || name.includes(input);
      });

      if (found) {
        console.log(" SELECTED:", found.name);
        stopMelody();
        setSelectedMelody(found);
      
      }
    },
  });

  return () => {
    registerMusicController({});
  };
}, [selectedMelody, melodies]);

  const handleSelectMelody = async (melody: Melody) => {
    setSelectedMelody(melody);

    // If a song is currently playing, switch immediately to the tapped melody.
    if (isPlaying) {
      stopMelody();
      await playMelody(melody);
    }
  };

  const renderMelodyItem = (item: Melody) => (
    <Pressable
      key={item.id}
      onPress={() => {
        void handleSelectMelody(item);
      }}
      style={{
        backgroundColor:
          selectedMelody?.id === item.id ? theme.colors.selectedSurface : theme.colors.surface,
        borderColor:
          selectedMelody?.id === item.id ? theme.colors.selectedBorder : theme.colors.border,
      }}
      className="relative w-44 p-4 rounded-2xl mr-3 border"
    >
      <Text style={{ color: theme.colors.text }} className="font-semibold" numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={{ color: theme.colors.mutedText }} className="text-sm" numberOfLines={1}>
        {item.artist}
      </Text>
      <Text style={{ color: theme.colors.subtleText }} className="text-xs mt-1">
        {item.frequencies.length} notes
      </Text>
      {selectedMelody?.id === item.id && (
        <View style={{ backgroundColor: theme.colors.accentSoft }} className="mt-3 rounded-lg px-2 py-1 self-start">
          <Text style={{ color: theme.colors.accentText }} className="text-[10px] font-semibold">
            SELECTED
          </Text>
        </View>
      )}

      {isAdmin && (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            handleDeleteMelody(item);
          }}
          disabled={Boolean(deletingMelodyId)}
          style={{
            backgroundColor:
              deletingMelodyId === item.id ? theme.colors.surfaceStrong : theme.colors.danger,
          }}
          className="absolute top-2 right-2 z-10 h-6 w-6 rounded-full items-center justify-center"
        >
          {deletingMelodyId === item.id ? (
            <ActivityIndicator size="small" color={theme.colors.text} />
          ) : (
            <MaterialCommunityIcons name="close" size={14} color={theme.colors.text} />
          )}
        </Pressable>
      )}
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={{ backgroundColor: theme.colors.background }} className="flex-1 px-6 py-8 items-center justify-center">
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={{ color: theme.colors.mutedText }} className="mt-4">Loading melodies...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={{ backgroundColor: theme.colors.background }} className="flex-1 px-6 py-8 items-center justify-center">
        <MaterialCommunityIcons name="music-note-off" size={48} color={theme.colors.mutedText} />
        <Text style={{ color: theme.colors.text }} className="mt-4 text-center">{loadError}</Text>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: theme.colors.background }} className="flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 48,
        }}
      >
      <Text style={{ color: theme.colors.text }} className="text-3xl font-bold mb-2">Music Player</Text>
      <Text style={{ color: theme.colors.mutedText }} className="mb-6">
        {melodies.length > 0
          ? 'Select and play melodies'
          : 'No melodies available'}
      </Text>

      {isAdmin && (
        <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} className="rounded-2xl p-4 border mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text style={{ color: theme.colors.text }} className="text-base font-semibold">Add Melody</Text>
          </View>
          <TextInput
            value={newMelodyName}
            onChangeText={setNewMelodyName}
            editable={!isSavingMelody}
            placeholder="Melody name"
            placeholderTextColor={theme.colors.subtleText}
            style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
            className="border rounded-xl px-3 py-3 mb-2"
          />
          <TextInput
            value={newMelodyArtist}
            onChangeText={setNewMelodyArtist}
            editable={!isSavingMelody}
            placeholder="Artist (optional)"
            placeholderTextColor={theme.colors.subtleText}
            style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
            className="border rounded-xl px-3 py-3 mb-2"
          />
          <TextInput
            value={newMelodyFrequencies}
            onChangeText={setNewMelodyFrequencies}
            editable={!isSavingMelody}
            placeholder="Frequencies (0 for silent), e.g. 262, 294, 0, 330"
            placeholderTextColor={theme.colors.subtleText}
            style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
            className="border rounded-xl px-3 py-3 mb-3"
          />
          <TextInput
            value={newMelodyDelays}
            onChangeText={setNewMelodyDelays}
            editable={!isSavingMelody}
            placeholder="Arduino delays (ms), e.g. 500, 500, 250, 750"
            placeholderTextColor={theme.colors.subtleText}
            style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border, color: theme.colors.text }}
            className="border rounded-xl px-3 py-3 mb-3"
          />
          <Pressable
            onPress={handleAddMelody}
            disabled={isSavingMelody}
            style={{ backgroundColor: isSavingMelody ? theme.colors.surfaceStrong : theme.colors.accent }}
            className="rounded-xl py-3 items-center"
          >
            {isSavingMelody ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <Text style={{ color: theme.colors.text }} className="font-semibold">Save Melody</Text>
            )}
          </Pressable>
        </View>
      )}

      {melodies.length > 0 && (
        <>
          {/* Melody quick-swap picker */}
          <View className="mb-5">
            <Text style={{ color: theme.colors.text }} className="text-lg font-semibold mb-3">Tap to Swap Melody</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 8 }}
            >
              {melodies.map((melody) => renderMelodyItem(melody))}
            </ScrollView>
          </View>

          {/* Current Melody Display */}
          {selectedMelody && (
            <View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} className="rounded-3xl p-6 border mb-5">
              <View className="flex-row items-center justify-between mb-2">
                <Text style={{ color: theme.colors.text }} className="text-xl font-semibold">
                  Current Melody
                </Text>
                <View
                  style={{
                    backgroundColor:
                      isSelectedMelodyPlaying ? theme.colors.accentSoft : theme.colors.surfaceStrong,
                  }}
                  className="rounded-full px-3 py-1"
                >
                  <Text
                    style={{
                      color: isSelectedMelodyPlaying ? theme.colors.accentText : theme.colors.mutedText,
                    }}
                    className="text-[10px] font-semibold tracking-wider"
                  >
                    {isSelectedMelodyPlaying ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>
              <View style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }} className="mb-4 rounded-2xl border px-4 py-4">
                <View className="flex-row items-center justify-between mb-3">
                  <Text style={{ color: theme.colors.text }} className="text-xs font-semibold tracking-wider">
                    MINI PIANO
                  </Text>
                  <Text style={{ color: isSelectedMelodyPlaying ? theme.colors.accentText : theme.colors.mutedText }} className="text-[10px] font-semibold">
                    {isSelectedMelodyPlaying ? 'PLAYING NOW' : 'IDLE'}
                  </Text>
                </View>
                <FakePiano
                  frequencies={selectedMelody.frequencies}
                  activeNoteIndex={currentNoteIndex}
                  isActive={isSelectedMelodyPlaying}
                />
              </View>
              <Text style={{ color: theme.colors.accent }} className="font-bold text-lg mb-1">
                {selectedMelody.name}
              </Text>
              <Text style={{ color: theme.colors.mutedText }} className="mb-4">
                {selectedMelody.artist}
              </Text>

              {isAdmin && (
                <View className="mt-5">
                  <Pressable
                    onPress={() => setIsEditPanelOpen((prev) => !prev)}
                    style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }}
                    className="border rounded-2xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text style={{ color: theme.colors.text }} className="text-sm font-semibold">
                      Edit Frequencies / Delays
                    </Text>
                    <MaterialCommunityIcons
                      name={isEditPanelOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.colors.mutedText}
                    />
                  </Pressable>

                  {isEditPanelOpen && (
                    <View style={{ backgroundColor: theme.colors.inputBackground, borderColor: theme.colors.border }} className="mt-2 border rounded-2xl p-4">
                      <TextInput
                        value={editMelodyFrequencies}
                        onChangeText={setEditMelodyFrequencies}
                        editable={!isUpdatingMelody}
                        placeholder="Frequencies (0 for silent), e.g. 262, 294, 0, 330"
                        placeholderTextColor={theme.colors.subtleText}
                        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, fontFamily: monospaceFont }}
                        className="border rounded-xl px-3 py-3 mb-2"
                      />
                      <TextInput
                        value={editMelodyDelays}
                        onChangeText={setEditMelodyDelays}
                        editable={!isUpdatingMelody}
                        placeholder="Arduino delays (ms), e.g. 500, 500, 250, 750"
                        placeholderTextColor={theme.colors.subtleText}
                        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text, fontFamily: monospaceFont }}
                        className="border rounded-xl px-3 py-3 mb-3"
                      />
                      <Pressable
                        onPress={handleUpdateMelody}
                        disabled={isUpdatingMelody}
                        style={{ backgroundColor: isUpdatingMelody ? theme.colors.surfaceStrong : theme.colors.accent }}
                        className="rounded-xl py-3 items-center"
                      >
                        {isUpdatingMelody ? (
                          <ActivityIndicator color={theme.colors.text} />
                        ) : (
                          <Text style={{ color: theme.colors.text }} className="font-semibold">Update Melody</Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Play/Pause Controls */}
          <View className="mb-4">
            <Text style={{ color: theme.colors.text }} className="text-sm font-semibold mb-2">Instrument</Text>
            <View className="flex-row gap-2 flex-wrap">
              {instrumentOptions.map((option) => {
                const isSelected = instrument === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setInstrument(option)}
                    style={{ backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface, borderColor: isSelected ? theme.colors.accent : theme.colors.border }}
                    className="px-3 py-2 rounded-xl border"
                  >
                    <Text style={{ color: isSelected ? theme.colors.text : theme.colors.mutedText }} className="font-semibold text-xs">
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mb-4">
            <Text style={{ color: theme.colors.text }} className="text-sm font-semibold mb-2">Playback Speed</Text>
            <View className="flex-row gap-2">
              {speedOptions.map((speed) => {
                const isSelected = playbackSpeed === speed;
                return (
                  <Pressable
                    key={speed}
                    onPress={() => setPlaybackSpeed(speed)}
                    style={{ backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface, borderColor: isSelected ? theme.colors.accent : theme.colors.border }}
                    className="px-3 py-2 rounded-xl border"
                  >
                    <Text style={{ color: isSelected ? '#ffffff' : theme.colors.mutedText }} className="font-semibold text-xs">
                      {speed}x
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="flex-row justify-between gap-3">
            <Pressable
              onPress={() => selectedMelody && playMelody(selectedMelody)}
              disabled={isPlaying || !selectedMelody}
              style={{ backgroundColor: isPlaying || !selectedMelody ? theme.colors.surfaceStrong : theme.colors.accent }}
              className="rounded-2xl px-5 py-4 flex-1 items-center"
            >
              <MaterialCommunityIcons
                name="play"
                size={24}
                color={isPlaying || !selectedMelody ? theme.colors.subtleText : '#ffffff'}
              />
              <Text
                style={{ color: isPlaying || !selectedMelody ? theme.colors.subtleText : '#ffffff' }}
                className="font-semibold mt-1"
              >
                Play
              </Text>
            </Pressable>

            <Pressable
              onPress={stopMelody}
              disabled={!isPlaying}
              style={{ backgroundColor: !isPlaying ? theme.colors.surfaceStrong : theme.colors.danger }}
              className="rounded-2xl px-5 py-4 flex-1 items-center"
            >
              <MaterialCommunityIcons
                name="stop"
                size={24}
                color={!isPlaying ? theme.colors.subtleText : '#ffffff'}
              />
              <Text
                style={{ color: !isPlaying ? theme.colors.subtleText : '#ffffff' }}
                className="font-semibold mt-1"
              >
                Stop
              </Text>
            </Pressable>
          </View>
        </>
      )}
      </ScrollView>
    </View>
  );
}