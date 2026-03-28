import type { RefObject } from 'react';

export interface AudioContextType {
  audioContext?: AudioContext;
  reverbConvolver?: ConvolverNode;
  reverbWetGain?: GainNode;
  reverbDryGain?: GainNode;
}

export type InstrumentOption = OscillatorType | 'electric piano';

interface PlayInstrumentNoteParams {
  audioContextRef: RefObject<AudioContextType>;
  audioContext: AudioContext;
  instrument: InstrumentOption;
  frequency: number;
  noteLength: number;
  noteStartTime: number;
  oscillatorsRef: RefObject<OscillatorNode[]>;
  gainsRef: RefObject<GainNode[]>;
}

export const initializeAudioContext = (audioContextRef: RefObject<AudioContextType>) => {
  if (!audioContextRef.current.audioContext) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current.audioContext = audioContext;
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
