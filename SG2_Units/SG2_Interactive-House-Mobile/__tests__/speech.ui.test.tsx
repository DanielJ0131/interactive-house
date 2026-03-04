import React from 'react';
import { render } from '@testing-library/react-native';
import SpeechScreen from '../app/(tabs)/speech';

test('SpeechScreen shows placeholder text', () => {
  const { getByText } = render(<SpeechScreen />);
  getByText('Voice Control');
  getByText('Your speech will appear here...');
});
