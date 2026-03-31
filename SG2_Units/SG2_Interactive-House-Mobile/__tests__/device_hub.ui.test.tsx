import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import DatabaseScreen from '../app/(tabs)/hub';
import { onSnapshot, updateDoc } from 'firebase/firestore';
import { auth } from '../utils/firebaseConfig';
import { getArduinoDevicesDocRef } from '../utils/firestorePaths';

jest.mock('firebase/firestore', () => ({
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('../utils/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: {
      displayName: 'Ali',
    },
  },
}));

jest.mock('../utils/firestorePaths', () => ({
  ARDUINO_DOC_ID: 'arduino_1',
  getArduinoDevicesDocRef: jest.fn(() => 'mock-doc-ref'),
}));

const mockDeviceData = {
  telemetry: {
    steam: 0,
    motion: 0,
    gas: 1,
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
  orange_light: {
    pin: 'D5',
    state: 'off',
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

describe('device_hub UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
    expect(getByText('Orange Light')).toBeTruthy();
    expect(getByText('Door')).toBeTruthy();
    expect(getByText('Window')).toBeTruthy();
    expect(getByText('Sensors')).toBeTruthy();
    expect(getByText('Sync Status')).toBeTruthy();
    expect(getByText('Database Debug')).toBeTruthy();
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

  it('shows read only text for Fan INB', async () => {
    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Fan INB')).toBeTruthy();
    });

    expect(getByText('Read Only')).toBeTruthy();
  });

  it('renders fallback title when no displayName exists', async () => {
    (auth as any).currentUser = { displayName: '' };

    const { getByText } = render(<DatabaseScreen />);

    await waitFor(() => {
      expect(getByText('Database')).toBeTruthy();
    });
  });
});