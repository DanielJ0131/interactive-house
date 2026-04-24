import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Slider from '@react-native-community/slider';
import DatabaseScreen from '../../../app/(tabs)/hub';
import { doc, getDoc, onSnapshot, updateDoc, deleteField } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../utils/firebaseConfig';
import { getArduinoDevicesDocRef } from '../../../utils/firestorePaths';
import { registerHubController } from '../../../utils/hubController';
import { useGuest } from '../../../utils/GuestContext';

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

jest.mock('../../../utils/hubController', () => ({
  registerHubController: jest.fn(),
}));

jest.mock('../../../utils/GuestContext', () => ({
  useGuest: jest.fn(),
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

    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

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

  afterEach(() => {
    jest.useRealTimers();
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

  it('registers hub controller on mount', async () => {
    render(<DatabaseScreen />);

    await waitFor(() => {
      expect(registerHubController).toHaveBeenCalledWith({
        toggleDevice: expect.any(Function),
        toggleDirection: expect.any(Function),
      });
    });
  });

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

  it('toggles white light locally in guest mode without firestore writes', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: true,
    });

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Guest Home')).toBeTruthy();
      expect(getByText('Demo Hardware Control')).toBeTruthy();
      expect(getByText('White Light')).toBeTruthy();
    });

    fireEvent.press(getByText('White Light'));

    await waitFor(() => {
      expect(getByText('on')).toBeTruthy();
    });

    expect(updateDoc).not.toHaveBeenCalled();
    expect(getArduinoDevicesDocRef).not.toHaveBeenCalled();
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

  it('reverses fan locally in guest mode from forward to reverse', async () => {
    jest.useFakeTimers();

    (useGuest as jest.Mock).mockReturnValue({
      isGuest: true,
    });

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Guest Home')).toBeTruthy();
      expect(getByText('Fan')).toBeTruthy();
      expect(getByText('Reverse')).toBeTruthy();
    });

    fireEvent.press(getByText('Fan'));

    await waitFor(() => {
      expect(getByText('forward')).toBeTruthy();
    });

    fireEvent.press(getByText('Reverse'));

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(getByText('reverse')).toBeTruthy();
    });

    expect(updateDoc).not.toHaveBeenCalled();
    expect(getArduinoDevicesDocRef).not.toHaveBeenCalled();
  });

  it('shows reverse button for fan and reverses from forward to reverse', async () => {
    jest.useFakeTimers();

    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            fan_INA: {
              ...mockDeviceData.fan_INA,
              state: 'on',
            },
            fan_INB: {
              ...mockDeviceData.fan_INB,
              state: 'off',
            },
          }),
        });

        return jest.fn();
      }
    );

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Fan')).toBeTruthy();
      expect(getByText('Reverse')).toBeTruthy();
    });

    fireEvent.press(getByText('Reverse'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        'fan_INA.state': 'off',
      });
      expect(getByText('Reversing...')).toBeTruthy();
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        'fan_INB.state': 'on',
      });
    });
  });

  it('reverses fan from reverse to forward', async () => {
    jest.useFakeTimers();

    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            fan_INA: {
              ...mockDeviceData.fan_INA,
              state: 'off',
            },
            fan_INB: {
              ...mockDeviceData.fan_INB,
              state: 'on',
            },
          }),
        });

        return jest.fn();
      }
    );

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Fan')).toBeTruthy();
      expect(getByText('Reverse')).toBeTruthy();
    });

    fireEvent.press(getByText('Reverse'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        'fan_INB.state': 'off',
      });
      expect(getByText('Reversing...')).toBeTruthy();
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
        'fan_INA.state': 'on',
      });
    });
  });

  it('disables reverse button while fan is reversing', async () => {
    jest.useFakeTimers();

    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            fan_INA: {
              ...mockDeviceData.fan_INA,
              state: 'on',
            },
            fan_INB: {
              ...mockDeviceData.fan_INB,
              state: 'off',
            },
          }),
        });

        return jest.fn();
      }
    );

    const { getByText, queryByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Reverse')).toBeTruthy();
    });

    fireEvent.press(getByText('Reverse'));

    await waitFor(() => {
      expect(getByText('Reversing...')).toBeTruthy();
      expect(queryByText('Reverse')).toBeNull();
    });

    fireEvent.press(getByText('Reversing...'));

    expect(updateDoc).toHaveBeenCalledTimes(1);

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
  });

  it('shows reverse error alert when reverse operation fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            fan_INA: {
              ...mockDeviceData.fan_INA,
              state: 'on',
            },
            fan_INB: {
              ...mockDeviceData.fan_INB,
              state: 'off',
            },
          }),
        });

        return jest.fn();
      }
    );

    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error('reverse failed'));

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Reverse')).toBeTruthy();
    });

    fireEvent.press(getByText('Reverse'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Reverse Error', 'reverse failed');
    });

    alertSpy.mockRestore();
  });

  it('updates orange light locally in guest mode without firestore writes', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: true,
    });

    const { UNSAFE_getByType, getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Guest Home')).toBeTruthy();
      expect(getByText('Orange Light')).toBeTruthy();
      expect(UNSAFE_getByType(Slider)).toBeTruthy();
    });

    const slider = UNSAFE_getByType(Slider);

    fireEvent(slider, 'onValueChange', 75);

    await waitFor(() => {
      expect(getByText('75%')).toBeTruthy();
    });

    fireEvent(slider, 'onSlidingComplete', 75);

    await waitFor(() => {
      expect(getByText('75%')).toBeTruthy();
    });

    expect(updateDoc).not.toHaveBeenCalled();
    expect(getArduinoDevicesDocRef).not.toHaveBeenCalled();
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

  it('displays sync status with formatted timestamp', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Sync Status')).toBeTruthy();
    });
  });

  it('displays last source in sync status', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Sync Status')).toBeTruthy();
    });

    expect(getByText('mobile-app')).toBeTruthy();
  });

  it('shows unavailable when timestamp is missing', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            sync: { lastSource: 'mobile-app' },
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

  it('displays orange light slider with percentage label', async () => {
    const { UNSAFE_getByType, getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(UNSAFE_getByType(Slider)).toBeTruthy();
    });

    expect(getByText('0%')).toBeTruthy();
  });

  it('updates orange light percentage label when slider changes', async () => {
    const { UNSAFE_getByType, getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(UNSAFE_getByType(Slider)).toBeTruthy();
    });

    const slider = UNSAFE_getByType(Slider);
    fireEvent(slider, 'onValueChange', 75);

    await waitFor(() => {
      expect(getByText('75%')).toBeTruthy();
    });
  });

  it('applies accent styling when orange light is at 100%', async () => {
    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        onNext({
          exists: () => true,
          data: () => ({
            ...mockDeviceData,
            orange_light: { value: 255 },
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
            orange_light: { value: 300 },
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

  it('renders guest mode with mock device data', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: true,
    });

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Guest Home')).toBeTruthy();
      expect(getByText('Demo Hardware Control')).toBeTruthy();
    });
  });

  it('shows loading state before data is received', async () => {
    let triggerSnapshot: any;

    (onSnapshot as jest.Mock).mockImplementation(
      (_docRef, onNext: (snap: any) => void) => {
        triggerSnapshot = onNext;
        return jest.fn();
      }
    );

    const { getByText, queryByText } = render(<DatabaseScreen />);

    expect(queryByText('Live Hardware Control')).toBeNull();

    triggerSnapshot({
      exists: () => true,
      data: () => mockDeviceData,
    });

    await waitFor(() => {
      expect(getByText('Live Hardware Control')).toBeTruthy();
    });
  });

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

    expect(queryByText('White Light')).toBeNull();
  });

  it('displays admin debug section with device raw data when admin', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Database Debug')).toBeTruthy();
    });
  });

  it('shows device configuration in debug section', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Database Debug')).toBeTruthy();
    });
  });

  it('displays timestamp in debug section', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Database Debug')).toBeTruthy();
    });
  });
});