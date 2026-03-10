import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('../utils/firebaseConfig', () => ({
  getGeminiModel: () => ({
    startChat: () => ({
      sendMessage: jest.fn(async () => ({
        response: {
          text: () => 'Mock AI response',
        },
      })),
    }),
  }),
}));

import AiScreen from '../app/(tabs)/ai';

describe('AiScreen (UI)', () => {
  it('renders placeholder texts', () => {
    const { getByPlaceholderText, getByText } = render(<AiScreen />);
    expect(getByPlaceholderText('Command your home...')).toBeTruthy();
    expect(getByText('Send')).toBeTruthy();
  });

  it('sends a message and renders AI reply', async () => {
    const { getByPlaceholderText, getByText } = render(<AiScreen />);

    fireEvent.changeText(getByPlaceholderText('Command your home...'), 'Turn on lights');
    fireEvent.press(getByText('Send'));

    await waitFor(() => {
      expect(getByText('Turn on lights')).toBeTruthy();
      expect(getByText('Mock AI response')).toBeTruthy();
    });
  });
});
