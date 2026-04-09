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
  const message = args.map((value) => String(value ?? '')).join(' ');
  if (
    message.includes('not wrapped in act') ||
    message.includes('wrapped in act') ||
    message.includes('overlapping act') ||
    message.includes('component suspended inside an `act` scope') ||
    (message.includes('MusicScreen') && message.includes('act')) ||
    message === 'Error: boom' ||
    message === 'Error: Network failure' ||
    message === 'Error: Firestore unavailable'
  ) {
    return;
  }

  originalConsoleError(...args);
});
