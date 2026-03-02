import React from 'react';
import { render } from '@testing-library/react-native';
import SpeechScreen from '../app/(tabs)/speech';

test('SpeechScreen shows placeholder text', () => {
  const { getByText } = render(<SpeechScreen />);
  getByText('Speech Recognition + Voice Commands');
  getByText('WORK IN PROGRESS');
});
