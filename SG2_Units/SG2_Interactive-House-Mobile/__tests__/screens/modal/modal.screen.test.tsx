import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ModalScreen from '../../../app/modal';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { onSnapshotsInSync } from 'firebase/firestore';
import { useGuest } from '../../../utils/GuestContext';
import { useAppTheme } from '../../../utils/AppThemeContext';

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
  },
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  onSnapshotsInSync: jest.fn(),
}));

jest.mock('../../../utils/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'uid-123',
      email: 'ali@example.com',
    },
  },
}));

jest.mock('../../../utils/GuestContext', () => ({
  useGuest: jest.fn(),
}));

jest.mock('../../../utils/AppThemeContext', () => ({
  THEME_OPTIONS: [
    {
      id: 'default',
      name: 'Default',
      description: 'Default theme',
      colors: {
        backgroundAlt: '#111',
        accent: '#38bdf8',
        secondaryAccent: '#a855f7',
      },
    },
    {
      id: 'ocean',
      name: 'Ocean Blue',
      description: 'Ocean theme',
      colors: {
        backgroundAlt: '#0f172a',
        accent: '#38bdf8',
        secondaryAccent: '#60a5fa',
      },
    },
  ],
  useAppTheme: jest.fn(),
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

describe('Modal Screen', () => {
  const mockSetMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useAppTheme as jest.Mock).mockReturnValue({
      theme,
      mode: 'default',
      setMode: mockSetMode,
    });
  });

  it('shows guest mode and skips firebase listeners', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: true,
    });

    const { getByText } = render(<ModalScreen />);

    await waitFor(() => {
      expect(getByText('Running in guest mode. Sign in for full access.')).toBeTruthy();
    });

    expect(onSnapshotsInSync).not.toHaveBeenCalled();
    expect(onAuthStateChanged).not.toHaveBeenCalled();
  });

  it('shows secure status for a signed in user and allows theme switching', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    (onSnapshotsInSync as jest.Mock).mockImplementation((_db, callback) => {
      callback();
      return jest.fn();
    });

    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback) => {
      callback({ uid: 'uid-123', email: 'ali@example.com' });
      return jest.fn();
    });

    const { getByText } = render(<ModalScreen />);

    await waitFor(() => {
      expect(getByText('Your smart home is secure.')).toBeTruthy();
    });

    expect(getByText('Firestore')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();

    fireEvent.press(getByText('Ocean Blue'));

    expect(mockSetMode).toHaveBeenCalledWith('ocean');
  });
});