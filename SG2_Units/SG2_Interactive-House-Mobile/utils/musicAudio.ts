import type { RefObject } from 'react';
import { Platform } from 'react-native';

interface NativeSoundLike {
  stopAsync: () => Promise<unknown>;
  unloadAsync: () => Promise<unknown>;
  setOnPlaybackStatusUpdate: (callback: (status: { isLoaded: boolean; didJustFinish?: boolean }) => void) => void;
}

interface ExpoAvModuleLike {
  Audio?: {
    setAudioModeAsync: (mode: {
      interruptionModeAndroid?: unknown;
      shouldDuckAndroid?: boolean;
      staysActiveInBackground?: boolean;
    }) => Promise<void>;
    Sound: {
      createAsync: (...args: [
        source: { uri: string },
        initialStatus: { shouldPlay: boolean; volume: number }
      ]) => Promise<{ sound: NativeSoundLike }>;
    };
  };
  InterruptionModeAndroid?: {
    DoNotMix?: unknown;
  };
}

type NativeAudioContext = {
  state: 'running';
  resume: () => Promise<void>;
};

type PlaybackAudioContext = AudioContext | NativeAudioContext;

export interface AudioContextType {
  audioContext?: PlaybackAudioContext;
  reverbConvolver?: ConvolverNode;
  reverbWetGain?: GainNode;
  reverbDryGain?: GainNode;
  nativeAudioConfigured?: boolean;
  nativeToneCache?: Map<string, string>;
  nativeActiveSounds?: Set<NativeSoundLike>;
}

export type InstrumentOption = OscillatorType | 'electric piano';

interface PlayInstrumentNoteParams {
  audioContextRef: RefObject<AudioContextType>;
  audioContext: PlaybackAudioContext;
  instrument: InstrumentOption;
  frequency: number;
  noteLength: number;
  noteStartTime: number;
  oscillatorsRef: RefObject<OscillatorNode[]>;
  gainsRef: RefObject<GainNode[]>;
}

interface StopInstrumentNotesParams {
  audioContextRef: RefObject<AudioContextType>;
  oscillatorsRef: RefObject<OscillatorNode[]>;
  gainsRef: RefObject<GainNode[]>;
}

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';

let expoAvModulePromise: Promise<ExpoAvModuleLike | null> | null = null;

const loadExpoAvModule = async (): Promise<ExpoAvModuleLike | null> => {
  if (!expoAvModulePromise) {
    expoAvModulePromise = import('expo-av')
      .then((module) => module as unknown as ExpoAvModuleLike)
      .catch((error) => {
        console.error('expo-av could not be loaded. Android audio disabled.', error);
        return null;
      });
  }

  return expoAvModulePromise;
};

const isWebAudioContext = (audioContext: PlaybackAudioContext): audioContext is AudioContext =>
  isWeb && typeof (audioContext as AudioContext).createOscillator === 'function';

const base64EncodeBytes = (bytes: Uint8Array): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const byte1 = bytes[i];
    const byte2 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const byte3 = i + 2 < bytes.length ? bytes[i + 2] : 0;

    const chunk = (byte1 << 16) | (byte2 << 8) | byte3;
    output += alphabet[(chunk >> 18) & 63];
    output += alphabet[(chunk >> 12) & 63];
    output += i + 1 < bytes.length ? alphabet[(chunk >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? alphabet[chunk & 63] : '=';
  }

  return output;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getWaveSample = (timeSeconds: number, frequency: number, instrument: InstrumentOption): number => {
  if (instrument === 'electric piano') {
    const fundamental = Math.sin(2 * Math.PI * frequency * timeSeconds);
    const second = Math.sin(2 * Math.PI * frequency * 2 * timeSeconds) * 0.35;
    const third = Math.sin(2 * Math.PI * frequency * 3 * timeSeconds) * 0.12;
    const bodyDecay = Math.exp(-2.6 * timeSeconds);
    return (fundamental + second + third) * bodyDecay;
  }

  if (instrument === 'square') {
    return Math.sin(2 * Math.PI * frequency * timeSeconds) >= 0 ? 1 : -1;
  }

  if (instrument === 'sawtooth') {
    const phase = frequency * timeSeconds;
    return 2 * (phase - Math.floor(phase + 0.5));
  }

  return Math.sin(2 * Math.PI * frequency * timeSeconds);
};

const createWavDataUri = (
  frequency: number,
  noteLengthSeconds: number,
  instrument: InstrumentOption
): string => {
  const sampleRate = 44100;
  const safeLength = Math.max(0.04, noteLengthSeconds);
  const totalSamples = Math.max(1, Math.floor(sampleRate * safeLength));

  const pcmBuffer = new ArrayBuffer(totalSamples * 2);
  const pcmView = new DataView(pcmBuffer);

  const attackSamples = Math.max(1, Math.floor(sampleRate * 0.006));
  const releaseSamples = Math.max(1, Math.floor(sampleRate * 0.04));

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / sampleRate;

    let envelope = 1;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i > totalSamples - releaseSamples) {
      envelope = (totalSamples - i) / releaseSamples;
    }
    envelope = clamp(envelope, 0, 1);

    const raw = getWaveSample(t, frequency, instrument);
    const value = clamp(raw * envelope * 0.45, -1, 1);
    pcmView.setInt16(i * 2, Math.floor(value * 32767), true);
  }

  const wavHeader = new ArrayBuffer(44);
  const headerView = new DataView(wavHeader);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      headerView.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  const pcmByteLength = pcmBuffer.byteLength;
  writeString(0, 'RIFF');
  headerView.setUint32(4, 36 + pcmByteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  headerView.setUint32(16, 16, true);
  headerView.setUint16(20, 1, true);
  headerView.setUint16(22, 1, true);
  headerView.setUint32(24, sampleRate, true);
  headerView.setUint32(28, sampleRate * 2, true);
  headerView.setUint16(32, 2, true);
  headerView.setUint16(34, 16, true);
  writeString(36, 'data');
  headerView.setUint32(40, pcmByteLength, true);

  const wavBytes = new Uint8Array(44 + pcmByteLength);
  wavBytes.set(new Uint8Array(wavHeader), 0);
  wavBytes.set(new Uint8Array(pcmBuffer), 44);

  return `data:audio/wav;base64,${base64EncodeBytes(wavBytes)}`;
};

const getNativeToneUri = (
  cache: Map<string, string>,
  frequency: number,
  noteLengthSeconds: number,
  instrument: InstrumentOption
): string => {
  const key = `${instrument}:${frequency.toFixed(4)}:${Math.round(noteLengthSeconds * 1000)}`;
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const uri = createWavDataUri(frequency, noteLengthSeconds, instrument);
  cache.set(key, uri);
  return uri;
};

const playNativeInstrumentNote = async (
  audioContextRef: RefObject<AudioContextType>,
  instrument: InstrumentOption,
  frequency: number,
  noteLength: number
) => {
  if (!isAndroid) return;
  if (frequency <= 0) return;

  const expoAv = await loadExpoAvModule();
  if (!expoAv?.Audio) {
    return;
  }

  if (!audioContextRef.current.nativeAudioConfigured) {
    audioContextRef.current.nativeAudioConfigured = true;
    try {
      await expoAv.Audio.setAudioModeAsync({
        interruptionModeAndroid: expoAv.InterruptionModeAndroid?.DoNotMix,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.error('Error configuring Android audio mode:', error);
    }
  }

  const toneCache = audioContextRef.current.nativeToneCache ?? new Map<string, string>();
  audioContextRef.current.nativeToneCache = toneCache;

  const activeSounds = audioContextRef.current.nativeActiveSounds ?? new Set<NativeSoundLike>();
  audioContextRef.current.nativeActiveSounds = activeSounds;

  const toneUri = getNativeToneUri(toneCache, frequency, noteLength, instrument);

  try {
    const { sound } = await expoAv.Audio.Sound.createAsync(
      { uri: toneUri },
      { shouldPlay: true, volume: 1 }
    );

    activeSounds.add(sound);

    let cleanedUp = false;
    const cleanup = async () => {
      if (cleanedUp) return;
      cleanedUp = true;
      activeSounds.delete(sound);

      try {
        await sound.unloadAsync();
      } catch {
        // Ignore unload failures after rapid stop/start.
      }
    };

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) {
        void cleanup();
      }
    });

    setTimeout(() => {
      void cleanup();
    }, Math.max(280, noteLength * 1000 + 220));
  } catch (error) {
    console.error('Error playing native note:', error);
  }
};

export const initializeAudioContext = (audioContextRef: RefObject<AudioContextType>) => {
  if (!audioContextRef.current.audioContext) {
    if (isWeb) {
      const WebAudioContext =
        (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;

      if (!WebAudioContext) {
        throw new Error('Web Audio API is unavailable in this environment.');
      }

      const audioContext = new WebAudioContext();
      audioContextRef.current.audioContext = audioContext;
    } else {
      audioContextRef.current.audioContext = {
        state: 'running',
        resume: async () => Promise.resolve(),
      };
    }
  }
  return audioContextRef.current.audioContext;
};

export const initializeReverbFx = (
  audioContextRef: RefObject<AudioContextType>,
  audioContext: AudioContext
) => {
  if (
    audioContextRef.current.reverbConvolver &&
    audioContextRef.current.reverbWetGain &&
    audioContextRef.current.reverbDryGain
  ) {
    return {
      convolver: audioContextRef.current.reverbConvolver,
      wetGain: audioContextRef.current.reverbWetGain,
      dryGain: audioContextRef.current.reverbDryGain,
    };
  }

  const convolver = audioContext.createConvolver();
  const wetGain = audioContext.createGain();
  const dryGain = audioContext.createGain();

  const durationSeconds = 1.8;
  const decay = 2.8;
  const sampleRate = audioContext.sampleRate;
  const impulseLength = Math.floor(sampleRate * durationSeconds);
  const impulseBuffer = audioContext.createBuffer(2, impulseLength, sampleRate);

  for (let channel = 0; channel < impulseBuffer.numberOfChannels; channel += 1) {
    const channelData = impulseBuffer.getChannelData(channel);
    for (let i = 0; i < impulseLength; i += 1) {
      const envelope = Math.pow(1 - i / impulseLength, decay);
      channelData[i] = (Math.random() * 2 - 1) * envelope;
    }
  }

  convolver.buffer = impulseBuffer;
  // Shared hall-style reverb used by all instruments.
  wetGain.gain.value = 0.36;
  dryGain.gain.value = 0.72;

  convolver.connect(wetGain);
  wetGain.connect(audioContext.destination);
  dryGain.connect(audioContext.destination);

  audioContextRef.current.reverbConvolver = convolver;
  audioContextRef.current.reverbWetGain = wetGain;
  audioContextRef.current.reverbDryGain = dryGain;

  return { convolver, wetGain, dryGain };
};

export const playInstrumentNote = ({
  audioContextRef,
  audioContext,
  instrument,
  frequency,
  noteLength,
  noteStartTime,
  oscillatorsRef,
  gainsRef,
}: PlayInstrumentNoteParams) => {
  if (!isWeb || !isWebAudioContext(audioContext)) {
    void playNativeInstrumentNote(audioContextRef, instrument, frequency, noteLength);
    return;
  }

  const { convolver, dryGain } = initializeReverbFx(audioContextRef, audioContext);

  if (instrument === 'electric piano') {
    const masterGain = audioContext.createGain();
    masterGain.connect(dryGain);
    masterGain.connect(convolver);

    // Quick attack plus longer tail gives a more expressive electric piano feel.
    masterGain.gain.setValueAtTime(0.0001, noteStartTime);
    masterGain.gain.exponentialRampToValueAtTime(0.42, noteStartTime + 0.008);
    masterGain.gain.exponentialRampToValueAtTime(
      0.16,
      noteStartTime + Math.min(noteLength * 0.35, 0.11)
    );
    masterGain.gain.exponentialRampToValueAtTime(0.0001, noteStartTime + noteLength);

    const partials: Array<{ ratio: number; amp: number; type: OscillatorType; detune?: number }> = [
      { ratio: 1, amp: 1, type: 'triangle', detune: -2 },
      { ratio: 1, amp: 0.55, type: 'triangle', detune: 3 },
      { ratio: 2, amp: 0.3, type: 'sine' },
      { ratio: 3, amp: 0.12, type: 'sine' },
    ];

    partials.forEach((partial) => {
      const partialOsc = audioContext.createOscillator();
      const partialGain = audioContext.createGain();

      partialOsc.type = partial.type;
      partialOsc.frequency.value = frequency * partial.ratio;
      partialOsc.detune.value = partial.detune ?? 0;
      partialGain.gain.value = partial.amp;

      partialOsc.connect(partialGain);
      partialGain.connect(masterGain);

      partialOsc.start(noteStartTime);
      partialOsc.stop(noteStartTime + noteLength);

      oscillatorsRef.current.push(partialOsc);
      gainsRef.current.push(partialGain);
    });

    gainsRef.current.push(masterGain);
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = instrument;
  oscillator.frequency.value = frequency;
  oscillator.connect(gainNode);
  gainNode.connect(dryGain);
  gainNode.connect(convolver);

  // ADSR envelope
  gainNode.gain.setValueAtTime(0.3, noteStartTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, noteStartTime + noteLength);

  oscillator.start(noteStartTime);
  oscillator.stop(noteStartTime + noteLength);

  oscillatorsRef.current.push(oscillator);
  gainsRef.current.push(gainNode);
};

export const stopAllInstrumentNotes = async ({
  audioContextRef,
  oscillatorsRef,
  gainsRef,
}: StopInstrumentNotesParams) => {
  if (isWeb) {
    oscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // Oscillator may already be stopped.
      }
    });

    oscillatorsRef.current = [];
    gainsRef.current = [];
    return;
  }

  const activeSounds = audioContextRef.current.nativeActiveSounds;
  if (activeSounds && activeSounds.size > 0) {
    const sounds = Array.from(activeSounds);
    activeSounds.clear();

    await Promise.all(
      sounds.map(async (sound) => {
        try {
          await sound.stopAsync();
        } catch {
          // Ignore stop errors for sounds that already ended.
        }

        try {
          await sound.unloadAsync();
        } catch {
          // Ignore unload errors during fast transitions.
        }
      })
    );
  }

  oscillatorsRef.current = [];
  gainsRef.current = [];
};
