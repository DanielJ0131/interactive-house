import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import WelcomeScreen from '../../../app/index';
import { onAuthStateChanged } from 'firebase/auth';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockSetIsGuest = jest.fn();
const mockUnsubscribe = jest.fn();

let mockCurrentUser: any = null;
let mockAuthCallbackUser: any = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

jest.mock('../../../utils/firebaseConfig', () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser;
    },
  },
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signInAnonymously: jest.fn(),
}));

jest.mock('../../../utils/GuestContext', () => ({
  useGuest: () => ({
    setIsGuest: mockSetIsGuest,
  }),
}));

jest.mock('../../../utils/AppThemeContext', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#020617',
        accent: '#38bdf8',
        accentSoft: 'rgba(56, 189, 248, 0.14)',
        accentText: '#bae6fd',
        text: '#f8fafc',
        mutedText: '#94a3b8',
        subtleText: '#64748b',
      },
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentUser = null;
    mockAuthCallbackUser = null;

    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback) => {
      callback(mockAuthCallbackUser);
      return mockUnsubscribe;
    });
  });

  it('redirects immediately when currentUser already exists', () => {
    mockCurrentUser = { uid: 'u1' };

    render(<WelcomeScreen />);

    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/hub');
  });

  it('subscribes to auth changes and cleans up listener on unmount', () => {
    const { unmount } = render(<WelcomeScreen />);

    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('redirects when auth listener receives a user', async () => {
    mockAuthCallbackUser = { uid: 'u1' };

    render(<WelcomeScreen />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/hub');
    });
  });

  it('shows welcome content when there is no logged in user', async () => {
    const { getByText } = render(<WelcomeScreen />);

    await waitFor(() => {
      expect(getByText('Interactive House')).toBeTruthy();
    });

    expect(getByText('Get Started')).toBeTruthy();
    expect(getByText('Explore as Guest ')).toBeTruthy();
  });

  it('navigates to login when Get Started is pressed', async () => {
    const { getByText } = render(<WelcomeScreen />);

    await waitFor(() => {
      expect(getByText('Get Started')).toBeTruthy();
    });

    fireEvent.press(getByText('Get Started'));

    expect(mockPush).toHaveBeenCalledWith('/(auth)/login');
  });

  it('sets guest mode and redirects when Explore as Guest is pressed', async () => {
    const { getByText } = render(<WelcomeScreen />);

    await waitFor(() => {
      expect(getByText('Explore as Guest ')).toBeTruthy();
    });

    fireEvent.press(getByText('Explore as Guest '));

    expect(mockSetIsGuest).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/hub');
  });
});