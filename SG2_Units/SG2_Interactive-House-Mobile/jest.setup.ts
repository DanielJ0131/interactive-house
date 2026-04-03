jest.mock('react-native-css-interop', () => {
  return {
    cssInterop: () => {},
    createInteropElement: (...args: any[]) => require('react').createElement(...args),
  };
});

// jest.setup.ts

jest.doMock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.doMock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children }: any) => React.createElement('SafeAreaView', null, children),
  };
});

jest.doMock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useLocalSearchParams: () => ({ room: 'kitchen' }),
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const originalConsoleError = console.error.bind(console);

jest.spyOn(console, 'error').mockImplementation((...args: any[]) => {
  const message = String(args[0] ?? '');
  if (
    message.includes('not wrapped in act') ||
    message === 'Error: boom' ||
    message === 'Error: Network failure' ||
    message === 'Error: Firestore unavailable'
  ) {
    return;
  }

  originalConsoleError(...args);
});
