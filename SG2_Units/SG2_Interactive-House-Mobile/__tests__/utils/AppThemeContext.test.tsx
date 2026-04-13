import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppThemeProvider,
  useAppTheme,
  getNavigationTheme,
  THEME_OPTIONS,
} from '../../utils/AppThemeContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

function ThemeConsumer() {
  const { mode, theme, isThemeReady, setMode } = useAppTheme();

  return (
    <>
      <Text testID="ready">{String(isThemeReady)}</Text>
      <Text testID="mode">{mode}</Text>
      <Text testID="theme-id">{theme.id}</Text>
      <Text testID="setter-type">{typeof setMode}</Text>
    </>
  );
}

describe('AppThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('loads default theme when nothing is stored', async () => {
    const { getByTestId } = render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('ready').props.children).toBe('true');
    });

    expect(getByTestId('mode').props.children).toBe('default');
    expect(getByTestId('theme-id').props.children).toBe('default');
    expect(getByTestId('setter-type').props.children).toBe('function');
  });

  it('loads stored theme from AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('ocean');

    const { getByTestId } = render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('ocean');
    });

    expect(getByTestId('theme-id').props.children).toBe('ocean');
  });

  it('migrates midnight to default', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('midnight');

    const { getByTestId } = render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('mode').props.children).toBe('default');
    });

    expect(getByTestId('theme-id').props.children).toBe('default');
  });

  it('falls back to default for invalid stored mode', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-theme');

    const { getByTestId } = render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('ready').props.children).toBe('true');
    });

    expect(getByTestId('mode').props.children).toBe('default');
    expect(getByTestId('theme-id').props.children).toBe('default');
  });

  it('logs error when loading theme fails', async () => {
    const error = new Error('load failed');
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to load theme preference:',
        error
      );
    });
  });

  it('saves theme after theme is ready', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('forest');

    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'interactive-house.theme-mode',
        'forest'
      );
    });
  });

  it('logs error when saving theme fails', async () => {
    const error = new Error('save failed');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('ocean');
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(error);

    render(
      <AppThemeProvider>
        <ThemeConsumer />
      </AppThemeProvider>
    );

    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Failed to save theme preference:',
        error
      );
    });
  });

  it('returns correct navigation theme mapping', () => {
    const theme = THEME_OPTIONS.find((option) => option.id === 'sunset')!;
    const navigationTheme = getNavigationTheme(theme);

    expect(navigationTheme.dark).toBe(true);
    expect(navigationTheme.colors.primary).toBe(theme.colors.accent);
    expect(navigationTheme.colors.background).toBe(theme.colors.background);
    expect(navigationTheme.colors.card).toBe(theme.colors.surface);
    expect(navigationTheme.colors.text).toBe(theme.colors.text);
    expect(navigationTheme.colors.border).toBe(theme.colors.border);
    expect(navigationTheme.colors.notification).toBe(theme.colors.warning);
  });
});