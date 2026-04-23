import React from 'react';
import { Text, Pressable } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { GuestProvider, useGuest } from '../../utils/GuestContext';

function Consumer() {
  const { isGuest, setIsGuest } = useGuest();

  return (
    <>
      <Text testID="guest-state">{isGuest ? 'guest' : 'signed-in'}</Text>
      <Pressable testID="set-guest-true" onPress={() => setIsGuest(true)}>
        <Text>Set Guest True</Text>
      </Pressable>
      <Pressable testID="set-guest-false" onPress={() => setIsGuest(false)}>
        <Text>Set Guest False</Text>
      </Pressable>
    </>
  );
}

describe('GuestContext', () => {
  it('provides default value as false when no provider is used', () => {
    const DefaultConsumer = () => {
      const { isGuest } = useGuest();
      return <Text testID="default-state">{isGuest ? 'guest' : 'signed-in'}</Text>;
    };

    const { getByTestId } = render(<DefaultConsumer />);

    expect(getByTestId('default-state').props.children).toBe('signed-in');
  });

  it('consumer hook reads provider value', () => {
    const { getByTestId } = render(
      <GuestProvider>
        <Consumer />
      </GuestProvider>
    );

    expect(getByTestId('guest-state').props.children).toBe('signed-in');
  });

  it('setIsGuest updates state to true and false', () => {
    const { getByTestId } = render(
      <GuestProvider>
        <Consumer />
      </GuestProvider>
    );

    expect(getByTestId('guest-state').props.children).toBe('signed-in');

    fireEvent.press(getByTestId('set-guest-true'));
    expect(getByTestId('guest-state').props.children).toBe('guest');

    fireEvent.press(getByTestId('set-guest-false'));
    expect(getByTestId('guest-state').props.children).toBe('signed-in');
  });
});