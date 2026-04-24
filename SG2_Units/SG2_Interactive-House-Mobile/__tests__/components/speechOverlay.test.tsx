import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import SpeechOverlay from '../../components/speechOverlay';

const mockRouterPush = jest.fn();

const mockToggleDevice = jest.fn();
const mockToggleDirection = jest.fn();

const mockPlay = jest.fn();
const mockStop = jest.fn();
const mockSetInstrument = jest.fn();
const mockSetSpeed = jest.fn();
const mockPlaySongByName = jest.fn();

const mockEmergencyStartCall = jest.fn();

const mockSpeechStart = jest.fn(() => Promise.resolve());
const mockSpeechStop = jest.fn(() => Promise.resolve());

const mockSpeechCallbacks: Record<string, (event?: any) => void> = {};
let mockSpeechAvailable = true;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

jest.mock('../../utils/hubController', () => ({
  hubController: () => ({
    toggleDevice: mockToggleDevice,
    toggleDirection: mockToggleDirection,
  }),
}));

jest.mock('../../utils/musicController', () => ({
  getMusicController: () => ({
    play: mockPlay,
    stop: mockStop,
    setInstrument: mockSetInstrument,
    setSpeed: mockSetSpeed,
    playSongByName: mockPlaySongByName,
  }),
}));

jest.mock('../../utils/emergencyController', () => ({
  getEmergencyController: () => ({
    startCall: mockEmergencyStartCall,
  }),
}));

jest.mock('../../utils/AppThemeContext', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        dangerSoft: 'rgba(239, 68, 68, 0.14)',
        accentSoft: 'rgba(56, 189, 248, 0.14)',
        danger: '#ef4444',
        accent: '#38bdf8',
        chipBackground: '#0f172a',
        border: '#334155',
        text: '#f8fafc',
        mutedText: '#94a3b8',
      },
    },
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: () => null,
}));

jest.mock(
  'expo-speech-recognition',
  () => ({
    get ExpoSpeechRecognitionModule() {
      return mockSpeechAvailable
        ? {
            start: mockSpeechStart,
            stop: mockSpeechStop,
          }
        : null;
    },
    useSpeechRecognitionEvent: (eventName: string, callback: (event?: any) => void) => {
      mockSpeechCallbacks[eventName] = callback;
    },
  }),
  { virtual: true }
);

describe('SpeechOverlay', () => {
  let alertSpy: jest.SpyInstance;
  let permissionSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockSpeechAvailable = true;
    Object.keys(mockSpeechCallbacks).forEach((key) => delete mockSpeechCallbacks[key]);

    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    permissionSpy = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED as any);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    alertSpy.mockRestore();
    permissionSpy.mockRestore();
  });

  it('shows unavailable alert when speech module is missing', () => {
    mockSpeechAvailable = false;

    const { UNSAFE_getByProps } = render(<SpeechOverlay />);

    fireEvent.press(UNSAFE_getByProps({ accessible: true }));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Unavailable',
      'Speech recognition requires a development build.'
    );
  });

  it('does not start listening when Android mic permission is denied', async () => {
    const originalOS = Platform.OS;

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android',
    });

    permissionSpy.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED as any);

    const { UNSAFE_getByProps } = render(<SpeechOverlay />);

    fireEvent.press(UNSAFE_getByProps({ accessible: true }));

    await waitFor(() => {
      expect(PermissionsAndroid.request).toHaveBeenCalled();
    });

    expect(mockSpeechStart).not.toHaveBeenCalled();

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalOS,
    });
  });

  it('starts listening and then stops listening when pressed again', async () => {
    const { UNSAFE_getByProps, getByText } = render(<SpeechOverlay />);

    fireEvent.press(UNSAFE_getByProps({ accessible: true }));

    await waitFor(() => {
      expect(mockSpeechStart).toHaveBeenCalled();
    });

    expect(getByText('Listening...')).toBeTruthy();

    fireEvent.press(UNSAFE_getByProps({ accessible: true }));

    await waitFor(() => {
      expect(mockSpeechStop).toHaveBeenCalled();
    });
  });

  it('stops listening when end event fires', async () => {
    const { UNSAFE_getByProps, getByText, queryByText } = render(<SpeechOverlay />);

    fireEvent.press(UNSAFE_getByProps({ accessible: true }));

    await waitFor(() => {
      expect(getByText('Listening...')).toBeTruthy();
    });

    act(() => {
      mockSpeechCallbacks.end?.();
    });

    expect(queryByText('Listening...')).toBeNull();
  });

  it('maps hub intents', () => {
    render(<SpeechOverlay />);

    act(() => {
      mockSpeechCallbacks.result?.({
        results: [{ transcript: 'fan on door window buzzer white reverse fan', isFinal: true }],
      });
    });

    expect(mockToggleDevice).toHaveBeenCalled();
    expect(mockToggleDirection).toHaveBeenCalled();
  });

  it('maps music intents', () => {
    render(<SpeechOverlay />);

    act(() => {
      mockSpeechCallbacks.result?.({
        results: [{ transcript: 'mario start stop piano fast', isFinal: true }],
      });
    });

    expect(mockPlay).toHaveBeenCalled();
    expect(mockStop).toHaveBeenCalled();
    expect(mockSetInstrument).toHaveBeenCalled();
    expect(mockSetSpeed).toHaveBeenCalled();
  });

  it('maps navigation intents', () => {
    render(<SpeechOverlay />);

    act(() => {
      mockSpeechCallbacks.result?.({
        results: [{ transcript: 'ai music hub', isFinal: true }],
      });
    });

    expect(mockRouterPush).toHaveBeenCalled();
  });

  it('maps emergency intent', () => {
    render(<SpeechOverlay />);

    act(() => {
      mockSpeechCallbacks.result?.({
        results: [{ transcript: 'help', isFinal: true }],
      });
    });

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockEmergencyStartCall).toHaveBeenCalled();
  });

  it('ignores non-final speech results', () => {
    render(<SpeechOverlay />);

    act(() => {
      mockSpeechCallbacks.result?.({
        results: [{ transcript: 'fan on', isFinal: false }],
      });
    });

    expect(mockToggleDevice).not.toHaveBeenCalled();
  });
});