import React from 'react';
import { render } from '@testing-library/react-native';
import AiScreen from '../app/(tabs)/ai';

describe('AiScreen (UI)', () => {
  it('renders placeholder texts', () => {
    const { getByText } = render(<AiScreen />);
    expect(getByText('AI Chat + Functionality')).toBeTruthy();
    expect(getByText('WORK IN PROGRESS')).toBeTruthy();
  });
});
