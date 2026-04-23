import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import AiScreen from '../../../app/(tabs)/ai';
import { updateDoc } from 'firebase/firestore';
import { getGeminiModel } from '../../../utils/firebaseConfig';
import { getArduinoDevicesDocRef } from '../../../utils/firestorePaths';
import { useGuest } from '../../../utils/GuestContext';
import { useAppTheme } from '../../../utils/AppThemeContext';

jest.mock('firebase/firestore', () => ({
  updateDoc: jest.fn(),
}));

jest.mock('../../../utils/firebaseConfig', () => ({
  db: {},
  getGeminiModel: jest.fn(),
}));

jest.mock('../../../utils/firestorePaths', () => ({
  getArduinoDevicesDocRef: jest.fn(() => 'mock-arduino-doc-ref'),
}));

jest.mock('../../../utils/GuestContext', () => ({
  useGuest: jest.fn(),
}));

jest.mock('../../../utils/AppThemeContext', () => ({
  useAppTheme: jest.fn(),
}));

jest.mock(
  'react-native-markdown-display',
  () => 'Markdown',
  { virtual: true }
);

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

describe('AI Screen', () => {
  const mockSendMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useAppTheme as jest.Mock).mockReturnValue({
      theme,
      mode: 'default',
      setMode: jest.fn(),
    });

    (getGeminiModel as jest.Mock).mockReturnValue({
      startChat: jest.fn(() => ({
        sendMessage: mockSendMessage,
      })),
    });
  });

  it('shows the guest mode warning when device controls are unavailable', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: true,
    });

    const { getByText } = render(<AiScreen />);

    await waitFor(() => {
      expect(
        getByText('Guest mode cannot control devices. Sign in to use AI controls.')
      ).toBeTruthy();
    });
  });

  it('sends a device control command and writes the firestore update', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    mockSendMessage.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            type: 'device_control',
            device: 'fan_INA',
            state: 'on',
            reply: 'Turning on the fan.',
          }),
      },
    });

    const { getByPlaceholderText, getByText } = render(<AiScreen />);

    fireEvent.changeText(getByPlaceholderText('Command your home...'), 'Turn on the fan');
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(getArduinoDevicesDocRef).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith('mock-arduino-doc-ref', {
        'fan_INA.state': 'on',
      });
    });
  });

  it('does not send a message when input is empty', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    const { getByText } = render(<AiScreen />);

    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(mockSendMessage).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  it('handles chat command responses without writing to firestore', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    mockSendMessage.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            type: 'chat',
            reply: 'I can help control the door, window, lights, fan, and buzzer.',
          }),
      },
    });

    const { getByPlaceholderText, getByText, UNSAFE_getAllByType } = render(<AiScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Command your home...'),
      'What can you control?'
    );
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('What can you control?');
    });

    const markdownNodes = UNSAFE_getAllByType('Markdown');
    expect(markdownNodes[0].props.children).toBe(
      'I can help control the door, window, lights, fan, and buzzer.'
    );

    expect(updateDoc).not.toHaveBeenCalled();
    expect(getArduinoDevicesDocRef).not.toHaveBeenCalled();
  });

  it('shows malformed JSON fallback message when AI response cannot be parsed', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    mockSendMessage.mockResolvedValueOnce({
      response: {
        text: () => '{"type":"device_control","device":"fan_INA","state":"on"',
      },
    });

    const { getByPlaceholderText, getByText, UNSAFE_getAllByType } = render(<AiScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Command your home...'),
      'Turn on the fan'
    );
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Turn on the fan');
    });

    const markdownNodes = UNSAFE_getAllByType('Markdown');
    expect(markdownNodes[0].props.children).toBe(
      'I understood your message, but I could not format a valid command.'
    );

    expect(updateDoc).not.toHaveBeenCalled();
    expect(getArduinoDevicesDocRef).not.toHaveBeenCalled();
  });

  it('extracts embedded JSON from surrounding text and executes the device command', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    mockSendMessage.mockResolvedValueOnce({
      response: {
        text: () =>
          'Sure, I can do that. {"type":"device_control","device":"door","state":"open","reply":"Opening the door."} Done.',
      },
    });

    const { getByPlaceholderText, getByText } = render(<AiScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Command your home...'),
      'Open the door'
    );
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(getArduinoDevicesDocRef).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalledWith('mock-arduino-doc-ref', {
        'door.state': 'open',
      });
    });
  });

  it('rejects invalid device or state commands and shows fallback message', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    mockSendMessage.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            type: 'device_control',
            device: 'toaster',
            state: 'on',
            reply: 'Turning on the toaster.',
          }),
      },
    });

    const { getByPlaceholderText, getByText, UNSAFE_getAllByType } = render(<AiScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Command your home...'),
      'Turn on the toaster'
    );
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Turn on the toaster');
    });

    const markdownNodes = UNSAFE_getAllByType('Markdown');
    expect(markdownNodes[0].props.children).toBe(
      'I understood your message, but I could not format a valid command.'
    );

    expect(updateDoc).not.toHaveBeenCalled();
    expect(getArduinoDevicesDocRef).not.toHaveBeenCalled();
  });

  it('shows invalid command format message when AI says it has no access or cannot control', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    mockSendMessage.mockResolvedValueOnce({
      response: {
        text: () => "I don't have access to control that device directly.",
      },
    });

    const { getByPlaceholderText, getByText, UNSAFE_getAllByType } = render(<AiScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Command your home...'),
      'Open the door'
    );
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith('Open the door');
    });

    const markdownNodes = UNSAFE_getAllByType('Markdown');
    expect(markdownNodes[0].props.children).toBe(
      'I understood the request, but the command format was invalid. Please try again.'
    );

    expect(updateDoc).not.toHaveBeenCalled();
    expect(getArduinoDevicesDocRef).not.toHaveBeenCalled();
  });

  it('shows generic failure message when firestore updateDoc throws', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    (updateDoc as jest.Mock).mockRejectedValueOnce(new Error('Firestore failed'));

    mockSendMessage.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            type: 'device_control',
            device: 'door',
            state: 'open',
            reply: 'Opening the door.',
          }),
      },
    });

    const { getByPlaceholderText, getByText, UNSAFE_getAllByType } = render(<AiScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Command your home...'),
      'Open the door'
    );
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith('mock-arduino-doc-ref', {
        'door.state': 'open',
      });
    });

    const markdownNodes = UNSAFE_getAllByType('Markdown');
    expect(markdownNodes[0].props.children).toBe(
      "I couldn't complete that action. Please try again."
    );
  });

  it('prevents duplicate sends while loading is already in progress', async () => {
    (useGuest as jest.Mock).mockReturnValue({
      isGuest: false,
    });

    let resolveMessage: ((value: any) => void) | undefined;

    mockSendMessage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveMessage = resolve;
        })
    );

    const { getByPlaceholderText, getByText, queryByText, UNSAFE_getAllByType } = render(<AiScreen />);

    fireEvent.changeText(
      getByPlaceholderText('Command your home...'),
      'Open the door'
    );
    fireEvent.press(getByText('Send'));
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledTimes(1);
      expect(queryByText('House is thinking...')).toBeTruthy();
    });

    resolveMessage?.({
      response: {
        text: () =>
          JSON.stringify({
            type: 'chat',
            reply: 'Done.',
          }),
      },
    });

    await waitFor(() => {
      const markdownNodes = UNSAFE_getAllByType('Markdown');
      expect(markdownNodes[0].props.children).toBe('Done.');
    });

    expect(mockSendMessage).toHaveBeenCalledTimes(1);
  });
});