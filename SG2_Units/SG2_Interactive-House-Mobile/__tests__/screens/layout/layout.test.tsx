jest.mock('../../../global.css', () => ({}));
jest.mock('react-native-reanimated', () => ({}));

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('expo-router', () => {
  const React = require('react');

  const MockStack = ({ children }: any) => <>{children}</>;
  const MockScreen = () => null;

  MockStack.displayName = 'MockStack';
  MockScreen.displayName = 'MockStackScreen';

  (MockStack as any).Screen = MockScreen;

  return {
    Stack: MockStack,
  };
});

jest.mock('@react-navigation/native', () => ({
  ThemeProvider: ({ children }: any) => children,
  DarkTheme: {
    dark: true,
    colors: {},
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');

  const MockSafeAreaProvider = ({ children }: any) => <>{children}</>;
  MockSafeAreaProvider.displayName = 'SafeAreaProvider';

  return {
    SafeAreaProvider: MockSafeAreaProvider,
  };
});

jest.mock('../../../utils/AppThemeContext', () => ({
  AppThemeProvider: ({ children }: any) => children,
  useAppTheme: () => ({
    theme: {
      colors: {
        background: '#020617',
        border: '#1e293b',
        surface: '#0f172a',
        text: '#f8fafc',
        accent: '#38bdf8',
        warning: '#facc15',
      },
    },
  }),
  getNavigationTheme: jest.fn(() => ({
    dark: true,
    colors: {},
  })),
  THEME_OPTIONS: [
    {
      id: 'default',
      name: 'Default',
      description: 'Mock theme',
      colors: {
        background: '#020617',
        border: '#1e293b',
        surface: '#0f172a',
        text: '#f8fafc',
        accent: '#38bdf8',
        warning: '#facc15',
      },
    },
  ],
}));

jest.mock('../../../utils/GuestContext', () => ({
  GuestProvider: ({ children }: any) => children,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

import React from 'react';
import { render } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import RootLayout from '../../../app/_layout';

describe('RootLayout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { toJSON } = render(<RootLayout />);
    expect(toJSON()).toBeTruthy();
  });

  it('calls splash screen setup', async () => {
    jest.resetModules();

    const SplashScreenModule = require('expo-splash-screen');
    require('../../../app/_layout');

    expect(SplashScreenModule.preventAutoHideAsync).toHaveBeenCalled();
  });

  it('hides splash screen after fonts are loaded', () => {
    render(<RootLayout />);
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });
});