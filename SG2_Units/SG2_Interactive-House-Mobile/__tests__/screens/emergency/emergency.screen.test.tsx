import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';
import EmergencyScreen from '../../../app/emergency';
import { registerEmergencyController } from '../../../utils/emergencyController';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
  }),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../utils/AppThemeContext', () => ({
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#020617',
        overlay: 'rgba(2, 6, 23, 0.76)',
        surface: '#111827',
        dangerSoft: 'rgba(239, 68, 68, 0.14)',
        danger: '#ef4444',
        text: '#f8fafc',
        mutedText: '#94a3b8',
        surfaceStrong: '#334155',
        accentText: '#bae6fd',
        accentSoft: 'rgba(56, 189, 248, 0.14)',
        accent: '#38bdf8',
      },
    },
  }),
}));

jest.mock('../../../utils/emergencyController', () => ({
  registerEmergencyController: jest.fn(),
}));

describe('EmergencyScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows confirm state first', () => {
    const { getByText } = render(<EmergencyScreen />);

    expect(getByText('Emergency Assistance')).toBeTruthy();
    expect(getByText('Do you want to start an emergency call?')).toBeTruthy();
    expect(getByText('Call Now')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('goes from confirm to calling when Call Now is pressed', () => {
    const { getByText } = render(<EmergencyScreen />);

    fireEvent.press(getByText('Call Now'));

    expect(getByText('Calling...')).toBeTruthy();
    expect(getByText('Emergency Support')).toBeTruthy();
    expect(getByText('00:00')).toBeTruthy();
    expect(getByText('End Call')).toBeTruthy();
  });

  it('goes from calling to ended when End Call is pressed', () => {
    const { getByText } = render(<EmergencyScreen />);

    fireEvent.press(getByText('Call Now'));
    fireEvent.press(getByText('End Call'));

    expect(getByText('Call ended')).toBeTruthy();
    expect(getByText('Back')).toBeTruthy();
  });

  it('increments timer while calling', () => {
    const { getByText } = render(<EmergencyScreen />);

    fireEvent.press(getByText('Call Now'));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(getByText('00:03')).toBeTruthy();
  });

  it('returns back when Cancel is pressed', () => {
    const { getByText } = render(<EmergencyScreen />);

    fireEvent.press(getByText('Cancel'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('returns back when Back is pressed after ended state', () => {
    const { getByText } = render(<EmergencyScreen />);

    fireEvent.press(getByText('Call Now'));
    fireEvent.press(getByText('End Call'));
    fireEvent.press(getByText('Back'));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('registers controller on mount', () => {
    render(<EmergencyScreen />);

    expect(registerEmergencyController).toHaveBeenCalledWith({
      startCall: expect.any(Function),
    });
  });

  it('unregisters controller on unmount', () => {
    const { unmount } = render(<EmergencyScreen />);

    unmount();

    expect(registerEmergencyController).toHaveBeenLastCalledWith({});
  });
});