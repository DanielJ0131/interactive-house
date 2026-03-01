jest.mock('react-native-css-interop', () => ({}));

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
