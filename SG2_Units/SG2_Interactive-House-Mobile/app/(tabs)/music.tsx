import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, TextInput, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, getDocs, setDoc, deleteDoc, type DocumentData } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../utils/firebaseConfig';
import { getMusicCollectionRef } from '../../utils/firestorePaths';
import { useGuest } from '../../utils/GuestContext';
import {
  initializeAudioContext,
  playInstrumentNote,
  type AudioContextType,
  type InstrumentOption,
} from '../../utils/musicAudio';

interface Melody {
  id: string;
  name: string;
  artist?: string;
  frequencies: number[];
  noteDelays?: number[];
}

export default function MusicScreen() {
  const speedOptions = [0.5, 1, 1.5, 2];
  const instrumentOptions: InstrumentOption[] = ['square', 'sawtooth', 'electric piano'];
  const { isGuest } = useGuest();
  const [melodies, setMelodies] = useState<Melody[]>([]);
  const [selectedMelody, setSelectedMelody] = useState<Melody | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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

  // Fetch melodies from Firestore
  useEffect(() => {
    if (isGuest) {
      setMelodies([]);
      setSelectedMelody(null);
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
      setLoadError('Please sign in to load cloud melodies.');
      setIsLoading(false);
      return;
    }

    const fetchMelodies = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const querySnapshot = await getDocs(getMusicCollectionRef(db));
        const loadedMelodies: Melody[] = [];

        querySnapshot.forEach((doc) => {
          const data = doc.data() as DocumentData;
          const frequencies = data.frequencies || [];
          const noteDelays = data.noteDelays || [];
          
          loadedMelodies.push({
            id: doc.id,
            name: doc.id,
            artist: data.artist || 'Unknown',
            frequencies: Object.values(frequencies).map(f => Number(f)),
            noteDelays: Object.values(noteDelays).map((d) => Number(d)),
          });
        });

        setMelodies(loadedMelodies);
        if (loadedMelodies.length > 0) {
          setSelectedMelody(loadedMelodies[0]);
        }
      } catch (error: any) {
        const errorCode = error?.code ? ` (${error.code})` : '';
        if (error?.code === 'permission-denied') {
          setLoadError(`Access denied to melodies${errorCode}. Please sign in with an authorized account.`);
        } else {
          setLoadError(`Unable to load melodies right now${errorCode}. Please try again.`);
        }
        console.error('Error fetching melodies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMelodies();
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

  const selectedAlignedSequences = selectedMelody
    ? formatAlignedFrequencyDelayStrings(selectedMelody.frequencies, selectedMelody.noteDelays || [])
    : null;

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
      };

      setMelodies((prev) => {
        const withoutDuplicate = prev.filter((m) => m.id !== createdMelody.id);
        return [createdMelody, ...withoutDuplicate];
      });
      setSelectedMelody(createdMelody);
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
    playbackStateRef.current.isActive = false;
    playbackStateRef.current.index = 0;
    playbackStateRef.current.melody = null;

    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }

    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator already stopped
      }
    });
    oscillatorsRef.current = [];
    gainsRef.current = [];
    setIsPlaying(false);
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

      // Resume audio context if suspended (required for web browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      setIsPlaying(true);
      playbackStateRef.current = {
        melody,
        index: 0,
        isActive: true,
      };

      const playNextNote = async () => {
        const playbackState = playbackStateRef.current;
        if (!playbackState.isActive || !playbackState.melody) {
          return;
        }

        const currentMelody = playbackState.melody;
        const noteIndex = playbackState.index;

        if (noteIndex >= currentMelody.frequencies.length) {
          playbackStateRef.current.isActive = false;
          setIsPlaying(false);
          playbackTimeoutRef.current = null;
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
          const noteStartTime = audioContext.currentTime;
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

        playbackStateRef.current.index = noteIndex + 1;
        playbackTimeoutRef.current = setTimeout(() => {
          void playNextNote();
        }, noteLength * 1000);
      };

      void playNextNote();
    } catch (error) {
      console.error('Error playing melody:', error);
      setIsPlaying(false);
    }
  };

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
      className={`relative w-44 p-4 rounded-2xl mr-3 border ${
        selectedMelody?.id === item.id
          ? 'bg-sky-500 border-sky-300'
          : 'bg-slate-800 border-slate-700'
      }`}
    >
      <Text className="text-white font-semibold" numberOfLines={1}>{item.name}</Text>
      <Text className="text-slate-200 text-sm" numberOfLines={1}>{item.artist}</Text>
      <Text className="text-slate-300 text-xs mt-1">
        {item.frequencies.length} notes
      </Text>
      {selectedMelody?.id === item.id && (
        <View className="mt-3 bg-white/20 rounded-lg px-2 py-1 self-start">
          <Text className="text-white text-[10px] font-semibold">SELECTED</Text>
        </View>
      )}

      {isAdmin && (
        <Pressable
          onPress={(event) => {
            event.stopPropagation();
            handleDeleteMelody(item);
          }}
          disabled={Boolean(deletingMelodyId)}
          className={`absolute top-2 right-2 z-10 h-6 w-6 rounded-full items-center justify-center ${
            deletingMelodyId === item.id ? 'bg-slate-700' : 'bg-red-500'
          }`}
        >
          {deletingMelodyId === item.id ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <MaterialCommunityIcons name="close" size={14} color="#ffffff" />
          )}
        </Pressable>
      )}
    </Pressable>
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950 px-6 py-8 items-center justify-center">
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text className="text-slate-400 mt-4">Loading melodies...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 bg-slate-950 px-6 py-8 items-center justify-center">
        <MaterialCommunityIcons name="music-note-off" size={48} color="#94a3b8" />
        <Text className="text-slate-300 mt-4 text-center">{loadError}</Text>
        <Text className="text-slate-500 mt-3 text-xs text-center">
          Auth ready: {isAuthReady ? 'yes' : 'no'} | Authenticated: {isAuthenticated ? 'yes' : 'no'}
        </Text>
        <Text className="text-slate-500 mt-1 text-xs text-center">
          User: {activeUserEmail}
        </Text>
        <Text className="text-slate-500 mt-1 text-xs text-center">
          Project: {activeProjectId}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 32,
          paddingBottom: 48,
        }}
      >
      <Text className="text-white text-3xl font-bold mb-2">Music Player</Text>
      <Text className="text-slate-400 mb-6">
        {melodies.length > 0
          ? 'Select and play melodies'
          : 'No melodies available'}
      </Text>

      <View className="bg-slate-900 rounded-2xl p-4 border border-slate-800 mb-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-white text-base font-semibold">Add Melody</Text>
        </View>
        <TextInput
          value={newMelodyName}
          onChangeText={setNewMelodyName}
          editable={isAdmin && !isSavingMelody}
          placeholder="Melody name"
          placeholderTextColor="#64748b"
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white mb-2"
        />
        <TextInput
          value={newMelodyArtist}
          onChangeText={setNewMelodyArtist}
          editable={isAdmin && !isSavingMelody}
          placeholder="Artist (optional)"
          placeholderTextColor="#64748b"
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white mb-2"
        />
        <TextInput
          value={newMelodyFrequencies}
          onChangeText={setNewMelodyFrequencies}
          editable={isAdmin && !isSavingMelody}
          placeholder="Frequencies (0 for silent), e.g. 262, 294, 0, 330"
          placeholderTextColor="#64748b"
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white mb-3"
        />
        <TextInput
          value={newMelodyDelays}
          onChangeText={setNewMelodyDelays}
          editable={isAdmin && !isSavingMelody}
          placeholder="Arduino delays (ms), e.g. 500, 500, 250, 750"
          placeholderTextColor="#64748b"
          className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-white mb-3"
        />
        <Pressable
          onPress={handleAddMelody}
          disabled={!isAdmin || isSavingMelody}
          className={`rounded-xl py-3 items-center ${!isAdmin || isSavingMelody ? 'bg-slate-700' : 'bg-emerald-500'}`}
        >
          {isSavingMelody ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className={`font-semibold ${!isAdmin ? 'text-slate-400' : 'text-white'}`}>
              Save Melody
            </Text>
          )}
        </Pressable>
      </View>

      {melodies.length > 0 && (
        <>
          {/* Melody quick-swap picker */}
          <View className="mb-5">
            <Text className="text-white text-lg font-semibold mb-3">Tap to Swap Melody</Text>
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
            <View className="bg-slate-900 rounded-3xl p-6 border border-slate-800 mb-5">
              <Text className="text-white text-xl font-semibold mb-2">
                Current Melody
              </Text>
              <Text className="text-sky-400 font-bold text-lg mb-1">
                {selectedMelody.name}
              </Text>
              <Text className="text-slate-400 mb-4">
                {selectedMelody.artist}
              </Text>
              <Text className="text-slate-500 text-sm">
                Frequencies (Hz):
              </Text>
              <Text className="text-slate-500 text-sm" style={{ fontFamily: monospaceFont }}>
                {selectedAlignedSequences?.frequenciesText}
              </Text>
              {isAdmin && selectedMelody.noteDelays && selectedMelody.noteDelays.length > 0 && (
                <>
                  <Text className="text-slate-500 text-sm mt-2">Delays (ms):</Text>
                  <Text className="text-slate-500 text-sm" style={{ fontFamily: monospaceFont }}>
                    {selectedAlignedSequences?.delaysText}
                  </Text>
                </>
              )}

              {isAdmin && (
                <View className="mt-5">
                  <Pressable
                    onPress={() => setIsEditPanelOpen((prev) => !prev)}
                    className="bg-slate-950 border border-slate-700 rounded-2xl px-4 py-3 flex-row items-center justify-between"
                  >
                    <Text className="text-white text-sm font-semibold">
                      Edit Frequencies / Delays
                    </Text>
                    <MaterialCommunityIcons
                      name={isEditPanelOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#cbd5e1"
                    />
                  </Pressable>

                  {isEditPanelOpen && (
                    <View className="mt-2 bg-slate-950 border border-slate-700 rounded-2xl p-4">
                      <TextInput
                        value={editMelodyFrequencies}
                        onChangeText={setEditMelodyFrequencies}
                        editable={!isUpdatingMelody}
                        placeholder="Frequencies (0 for silent), e.g. 262, 294, 0, 330"
                        placeholderTextColor="#64748b"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-white mb-2"
                        style={{ fontFamily: monospaceFont }}
                      />
                      <TextInput
                        value={editMelodyDelays}
                        onChangeText={setEditMelodyDelays}
                        editable={!isUpdatingMelody}
                        placeholder="Arduino delays (ms), e.g. 500, 500, 250, 750"
                        placeholderTextColor="#64748b"
                        className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-white mb-3"
                        style={{ fontFamily: monospaceFont }}
                      />
                      <Pressable
                        onPress={handleUpdateMelody}
                        disabled={isUpdatingMelody}
                        className={`rounded-xl py-3 items-center ${isUpdatingMelody ? 'bg-slate-700' : 'bg-sky-500'}`}
                      >
                        {isUpdatingMelody ? (
                          <ActivityIndicator color="#ffffff" />
                        ) : (
                          <Text className="text-white font-semibold">Update Melody</Text>
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
            <Text className="text-slate-300 text-sm font-semibold mb-2">Instrument</Text>
            <View className="flex-row gap-2 flex-wrap">
              {instrumentOptions.map((option) => {
                const isSelected = instrument === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setInstrument(option)}
                    className={`px-3 py-2 rounded-xl border ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-300'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Text className={`${isSelected ? 'text-white' : 'text-slate-300'} font-semibold text-xs`}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-slate-300 text-sm font-semibold mb-2">Playback Speed</Text>
            <View className="flex-row gap-2">
              {speedOptions.map((speed) => {
                const isSelected = playbackSpeed === speed;
                return (
                  <Pressable
                    key={speed}
                    onPress={() => setPlaybackSpeed(speed)}
                    className={`px-3 py-2 rounded-xl border ${
                      isSelected
                        ? 'bg-sky-500 border-sky-300'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <Text className={`${isSelected ? 'text-white' : 'text-slate-300'} font-semibold text-xs`}>
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
              className={`${
                isPlaying || !selectedMelody
                  ? 'bg-slate-700'
                  : 'bg-sky-500'
              } rounded-2xl px-5 py-4 flex-1 items-center`}
            >
              <MaterialCommunityIcons
                name="play"
                size={24}
                color={isPlaying || !selectedMelody ? '#64748b' : 'white'}
              />
              <Text
                className={`font-semibold mt-1 ${
                  isPlaying || !selectedMelody
                    ? 'text-slate-500'
                    : 'text-white'
                }`}
              >
                Play
              </Text>
            </Pressable>

            <Pressable
              onPress={stopMelody}
              disabled={!isPlaying}
              className={`${
                !isPlaying ? 'bg-slate-700' : 'bg-red-500'
              } rounded-2xl px-5 py-4 flex-1 items-center`}
            >
              <MaterialCommunityIcons
                name="stop"
                size={24}
                color={!isPlaying ? '#64748b' : 'white'}
              />
              <Text
                className={`font-semibold mt-1 ${
                  !isPlaying ? 'text-slate-500' : 'text-white'
                }`}
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