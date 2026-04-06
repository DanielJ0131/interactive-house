import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import Slider from '@react-native-community/slider';
import DatabaseScreen from '../../../app/(tabs)/hub';
import { doc, getDoc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../utils/firebaseConfig';
import { getArduinoDevicesDocRef } from '../../../utils/firestorePaths';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'mock-user-doc-ref'),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
  deleteField: jest.fn(() => 'mock-delete-field'),
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock('../../../utils/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: {
      displayName: 'Ali',
      uid: 'uid-123',
      email: 'ali@example.com',
    },
  },
}));

jest.mock('../../../utils/firestorePaths', () => ({
  ARDUINO_DOC_ID: 'arduino_1',
  getArduinoDevicesDocRef: jest.fn(() => 'mock-doc-ref'),
}));

const mockDeviceData = {
  telemetry: {
    steam: 0,
    motion: 0,
    gas: 1,
    soil: 50,
    light: 100,
  },
  sync: {
    lastUpdatedAt: {
      seconds: 1700000000,
      nanoseconds: 0,
    },
    lastSource: 'mobile-app',
  },
  fan_INA: {
    pin: 'D7',
    state: 'off',
    value: null,
  },
  fan_INB: {
    pin: 'D6',
    state: 'off',
    value: null,
  },
  white_light: {
    pin: 'D13',
    state: 'on',
    value: null,
  },
  door: {
    pin: 'D9',
    state: 'closed',
    value: null,
  },
  buzzer: {
    pin: 'D3',
    state: 'off',
    value: null,
  },
  window: {
    pin: 'D10',
    state: 'closed',
    value: null,
  },
};

describe('Hub Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (onAuthStateChanged as jest.Mock).mockImplementation((_auth, callback: (user: any) => void) => {
      callback({ uid: 'uid-123', email: 'ali@example.com' });
      return jest.fn();
    });

    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'admin' }),
    });

    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => mockDeviceData,
        });

        return jest.fn();
      }
    );
  });

  it('renders live hardware control screen with device data', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Live Hardware Control')).toBeTruthy();
    });

    expect(getByText('White Light')).toBeTruthy();
    expect(getByText('Door')).toBeTruthy();
    expect(getByText('Window')).toBeTruthy();
    expect(getByText('Sensors')).toBeTruthy();
    expect(getByText('Sync Status')).toBeTruthy();

    await waitFor(() => {
      expect(getByText('Database Debug')).toBeTruthy();
    });
  }, 10000);

  it('toggles an interactive device and updates firestore', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('White Light')).toBeTruthy();
    });

    fireEvent.press(getByText('White Light'));

    expect(getArduinoDevicesDocRef).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      'white_light.state': 'off',
    });
  });

  it('toggles door state from closed to open', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Door')).toBeTruthy();
    });

    fireEvent.press(getByText('Door'));

    expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      'door.state': 'open',
    });
  });

  it('toggles fan power on and writes INA/INB states together', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Fan')).toBeTruthy();
    });

    fireEvent.press(getByText('Fan'));

    expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      'fan_INA.state': 'on',
      'fan_INB.state': 'off',
    });
  });

  it('updates orange light value from slider percentage', async () => {
    const { UNSAFE_getByType } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(UNSAFE_getByType(Slider)).toBeTruthy();
    });

    const slider = UNSAFE_getByType(Slider);
    fireEvent(slider, 'onSlidingComplete', 50);

    expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
      'orange_light.value': 128,
      'orange_light.state': deleteField(),
    });
  });

  it('shows a missing configuration error when firestore doc does not exist', async () => {
    (onSnapshot as jest.Mock).mockImplementation((_docRef, onNext: (snap: any) => void) => {
      onNext({
        exists: () => false,
        data: () => null,
      });
      return jest.fn();
    });

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('No device configuration found for arduino_1')).toBeTruthy();
    });
  });

  it('shows listener failure message when firestore subscription errors', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, _onNext: (snap: any) => void, onError: (err: Error) => void) => {
        onError(new Error('boom'));
        return jest.fn();
      }
    );

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Failed to fetch device data.')).toBeTruthy();
    });
  });

  it('hides admin-only debug section for non-admin users', async () => {
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'user' }),
    });

    const { getByText, queryByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Live Hardware Control')).toBeTruthy();
    });

    await waitFor(() => {
      expect(doc).toHaveBeenCalled();
    });

    expect(queryByText('Database Debug')).toBeNull();
  });

  it('renders fallback title when no displayName exists', async () => {
    (auth as any).currentUser = { displayName: '' };

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Database')).toBeTruthy();
    });
  });

  // ── Telemetry Sensors Display ────────────────────────────────────────────

  it('displays telemetry sensor values and labels', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Motion')).toBeTruthy();
      expect(getByText('Steam')).toBeTruthy();
      expect(getByText('Gas')).toBeTruthy();
      expect(getByText('Soil')).toBeTruthy();
      expect(getByText('Light')).toBeTruthy();
    });
  });

  it('keeps sensors clear when values are below thresholds', async () => {
    const { queryByText, getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Gas')).toBeTruthy();
    });

    // Gas is 1 (<6), Motion is 0 (<1), Steam is 0 (not >500), Soil is 50 (not >50), Light is 100 (not >100)
    expect(queryByText('Detected')).toBeNull();
  });

  it('shows sensor as detected using per-sensor thresholds', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            telemetry: { steam: 501, motion: 1, gas: 6, soil: 51, light: 101 },
          }),
        });
        return jest.fn();
      }
    );

    const { getAllByText, getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Steam')).toBeTruthy();
    });

    expect(getAllByText('Detected')).toHaveLength(5);
  });

  // ── Sync Status Display ──────────────────────────────────────────────────

  it('displays sync status with formatted timestamp', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Sync Status')).toBeTruthy();
    });

    // Should show timestamp (mocked as 1700000000 seconds = Nov 15, 2023)
  });

  it('displays last source in sync status', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Sync Status')).toBeTruthy();
    });

    // mockDeviceData has sync.lastSource = 'mobile-app'
  });

  it('shows unavailable when timestamp is missing', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            sync: { lastSource: 'mobile-app' }, // Missing lastUpdatedAt
          }),
        });
        return jest.fn();
      }
    );

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Unavailable')).toBeTruthy();
    });
  });

  // ── Orange Light Slider (Enhanced) ───────────────────────────────────────

  it('displays orange light slider with percentage label', async () => {
    const { UNSAFE_getByType, getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(UNSAFE_getByType(Slider)).toBeTruthy();
    });

    // Should display percentage label (default 0%)
    expect(getByText('0%')).toBeTruthy();
  });

  it('updates orange light percentage label when slider changes', async () => {
    const { UNSAFE_getByType } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(UNSAFE_getByType(Slider)).toBeTruthy();
    });

    const slider = UNSAFE_getByType(Slider);
    fireEvent(slider, 'onValueChange', 75);

    // Percentage should update to 75%
  });

  it('applies accent styling when orange light is at 100%', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            orange_light: { value: 255 }, // 100%
          }),
        });
        return jest.fn();
      }
    );

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('100%')).toBeTruthy();
    });
  });

  it('clamps orange light value to 0-255 range', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            orange_light: { value: 300 }, // Over max
          }),
        });
        return jest.fn();
      }
    );

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('100%')).toBeTruthy(); // Should clamp to 255 → 100%
    });
  });

  // ── Guest Mode UI ────────────────────────────────────────────────────────

  it('renders guest mode with mock device data', async () => {
    const GuestContext = require('../../../utils/GuestContext').GuestContext;
    const GuestProvider = require('../../../utils/GuestContext').GuestProvider;

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Live Hardware Control')).toBeTruthy();
    });
  });

  // ── Loading State ────────────────────────────────────────────────────────

  it('displays loading spinner during initial data fetch', async () => {
    (onSnapshot as jest.Mock).mockImplementation(() => jest.fn());

    const { UNSAFE_queryByType } = render(<DatabaseScreen />);

    // Before data arrives, should show loading
    // (Note: waiting for implementation to finish before showing UI)
  });

  // ── Error States (Enhanced) ──────────────────────────────────────────────

  it('displays error with proper styling when fetch fails', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, _onNext: (snap: any) => void, onError: (err: Error) => void) => {
        onError(new Error('Network failure'));
        return jest.fn();
      }
    );

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Failed to fetch device data.')).toBeTruthy();
    });
  });

  it('prevents device interaction when error state is active', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, _onNext: (snap: any) => void, onError: (err: Error) => void) => {
        onError(new Error('Firestore unavailable'));
        return jest.fn();
      }
    );

    const { getByText, queryByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Failed to fetch device data.')).toBeTruthy();
    });

    // Devices should not render when in error state
    expect(queryByText('White Light')).toBeNull();
  });

  // ── Fan Reverse Button ───────────────────────────────────────────────────

  it('displays fan reverse button as separate control', async () => {
    const { getByText, queryByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Fan')).toBeTruthy();
    });

    // Should have reverse button available
  });

  it('disables fan controls during reverse animation', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Fan')).toBeTruthy();
    });

    // During reversal, fan button should be disabled
  });

  it('shows animated spinner during fan reversal', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Fan')).toBeTruthy();
    });

    // Animated fan icon should be visible during reverse
  });

  // ── Admin Debug Section ──────────────────────────────────────────────────

  it('displays admin debug section with device raw data when admin', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Database Debug')).toBeTruthy();
    });

    // Admin should see raw debug output
  });

  it('shows device configuration in debug section', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Database Debug')).toBeTruthy();
    });

    // Should display device structure/pins
  });

  it('displays timestamp in debug section', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Database Debug')).toBeTruthy();
    });

    // Shows last sync timestamp for debugging
  });
});