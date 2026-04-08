import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import MusicScreen from '../../../app/(tabs)/music';
import { doc, deleteDoc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useGuest } from '../../../utils/GuestContext';
import { useAppTheme } from '../../../utils/AppThemeContext';
import { getMusicCollectionRef } from '../../../utils/firestorePaths';
import { registerMusicController } from '@/utils/musicController';
import { initializeAudioContext, playInstrumentNote, stopAllInstrumentNotes } from '../../../utils/musicAudio';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'mock-doc-ref'),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
}));

jest.mock('../../../utils/firebaseConfig', () => ({
  db: {
    app: {
      options: {
        projectId: 'test-project',
      },
    },
  },
  auth: {
    currentUser: {
      uid: 'uid-123',
      email: 'ali@example.com',
    },
  },
}));

jest.mock('../../../utils/firestorePaths', () => ({
  getMusicCollectionRef: jest.fn(() => 'mock-music-collection-ref'),
}));

jest.mock('@/utils/musicController', () => ({
  registerMusicController: jest.fn(),
  getMusicController: jest.fn(),
}));

jest.mock('../../../utils/GuestContext', () => ({
  useGuest: jest.fn(),
}));

jest.mock('../../../utils/AppThemeContext', () => ({
  useAppTheme: jest.fn(),
}));

jest.mock('../../../utils/musicAudio', () => ({
  initializeAudioContext: jest.fn(() => ({
    state: 'running',
    currentTime: 0,
    resume: jest.fn(),
  })),
  playInstrumentNote: jest.fn(),
  stopAllInstrumentNotes: jest.fn(),
}));

const theme = {
  colors: {
    background: '#020617',
    backgroundAlt: '#0f172a',
    surface: '#111827',
    surfaceElevated: '#1f2937',
    surfaceStrong: '#334155',
    border: '#334155',
    borderStrong: '#475569',
    text: '#f8fafc',
    mutedText: '#94a3b8',
    subtleText: '#64748b',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.14)',
    accentText: '#bae6fd',
    secondaryAccent: '#a855f7',
    secondaryAccentSoft: 'rgba(168, 85, 247, 0.14)',
    success: '#22c55e',
    successSoft: 'rgba(34, 197, 94, 0.14)',
    warning: '#facc15',
    warningSoft: 'rgba(250, 204, 21, 0.14)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.14)',
    info: '#0ea5e9',
    inputBackground: '#0f172a',
    selectedSurface: 'rgba(56, 189, 248, 0.18)',
    selectedBorder: 'rgba(125, 211, 252, 0.75)',
    chipBackground: 'rgba(15, 23, 42, 0.92)',
    chipBorder: '#1e293b',
    overlay: 'rgba(2, 6, 23, 0.76)',
  },
};

const sampleMelodies = [
  {
    id: 'alpha',
    data: () => ({
      artist: 'Composer One',
      frequencies: { 0: 262, 1: 294, 2: 0, 3: 330 },
      noteDelays: { 0: 500, 1: 500, 2: 250, 3: 750 },
      state: 'on',
    }),
  },
  {
    id: 'beta',
    data: () => ({
      artist: 'Composer Two',
      frequencies: { 0: 392, 1: 440 },
      noteDelays: { 0: 400, 1: 400 },
      state: 'off',
    }),
  },
];

const makeSnapshot = (docs: Array<{ id: string; data: () => Record<string, unknown> }>) => ({
  forEach: (callback: (docSnap: { id: string; data: () => Record<string, unknown> }) => void) => {
    docs.forEach((docSnap) => callback(docSnap));
  },
});

describe('Music Screen', () => {
  const mockSetMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    (useAppTheme as jest.Mock).mockReturnValue({
      theme,
      mode: 'default',
      setMode: mockSetMode,
    });

    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback) => {
      callback({ uid: 'uid-123', email: 'ali@example.com' });
      return jest.fn();
    });

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'admin' }),
    });

    (onSnapshot as jest.Mock).mockImplementation((_ref, onNext) => {
      onNext(makeSnapshot(sampleMelodies));
      return jest.fn();
    });

    (registerMusicController as jest.Mock).mockImplementation(() => undefined);
    (initializeAudioContext as jest.Mock).mockReturnValue({
      state: 'running',
      currentTime: 0,
      resume: jest.fn(),
    });
    (playInstrumentNote as jest.Mock).mockImplementation(() => undefined);
    (stopAllInstrumentNotes as jest.Mock).mockResolvedValue(undefined);
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the guest access warning without subscribing to firestore', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: true,
    });

    const { getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(
        getByText('Guest mode cannot access cloud melodies. Sign in to view songs.')
      ).toBeTruthy();
    });

    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('renders loaded melodies and saves a new melody for admin users', async () => {
    const { getAllByText, getByPlaceholderText, getByText } = render(<MusicScreen />);

    await waitFor(() => {
      expect(getByText('Music Player')).toBeTruthy();
      expect(getByText('Current Melody')).toBeTruthy();
      expect(getByText('Tap to Swap Melody')).toBeTruthy();
      expect(getByText('Add Melody')).toBeTruthy();
    });

    expect(getByText('Current Melody')).toBeTruthy();
    expect(getAllByText('alpha').length).toBeGreaterThan(0);
    expect(getAllByText('Composer One').length).toBeGreaterThan(0);
    expect(getByText('Play')).toBeTruthy();
    expect(getByText('Stop')).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText('Melody name'), 'Morning Tune');
    fireEvent.changeText(getByPlaceholderText('Artist (optional)'), 'DJ SG2');
    fireEvent.changeText(
      getByPlaceholderText('Frequencies (0 for silent), e.g. 262, 294, 0, 330'),
      '262, 294, 0, 330'
    );
    fireEvent.changeText(
      getByPlaceholderText('Arduino delays (ms), e.g. 500, 500, 250, 750'),
      '500, 500, 250, 750'
    );

    fireEvent.press(getByText('Save Melody'));

    await waitFor(() => {
      expect(getMusicCollectionRef).toHaveBeenCalled();
      expect(doc).toHaveBeenCalledWith('mock-music-collection-ref', 'Morning Tune');
      expect(setDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          name: 'Morning Tune',
          artist: 'DJ SG2',
          frequencies: [262, 294, 0, 330],
          noteDelays: [500, 500, 250, 750],
          updatedAt: expect.any(String),
        })
      );
    });
  });
});