import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DarkTheme } from '@react-navigation/native';

export type ThemeMode =
  | 'default'
  | 'ocean'
  | 'forest'
  | 'sunset'
  | 'highContrast'
  | 'protanopiaSafe'
  | 'deuteranopiaSafe'
  | 'tritanopiaSafe';

export type AppTheme = {
  id: ThemeMode;
  name: string;
  description: string;
  colors: {
    background: string;
    backgroundAlt: string;
    surface: string;
    surfaceElevated: string;
    surfaceStrong: string;
    border: string;
    borderStrong: string;
    text: string;
    mutedText: string;
    subtleText: string;
    accent: string;
    accentSoft: string;
    accentText: string;
    secondaryAccent: string;
    secondaryAccentSoft: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    info: string;
    inputBackground: string;
    selectedSurface: string;
    selectedBorder: string;
    chipBackground: string;
    chipBorder: string;
    overlay: string;
  };
};

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  theme: AppTheme;
  options: AppTheme[];
  isThemeReady: boolean;
};

const THEME_STORAGE_KEY = 'interactive-house.theme-mode';

const createTheme = (
  id: ThemeMode,
  name: string,
  description: string,
  colors: AppTheme['colors']
): AppTheme => ({
  id,
  name,
  description,
  colors,
});

export const THEME_OPTIONS: AppTheme[] = [
  createTheme('default', 'Default', 'Original smart-home palette with cool blue accents.', {
    background: '#020617',
    backgroundAlt: '#0f172a',
    surface: '#0f172a',
    surfaceElevated: '#111827',
    surfaceStrong: '#1e293b',
    border: '#1e293b',
    borderStrong: '#334155',
    text: '#f8fafc',
    mutedText: '#94a3b8',
    subtleText: '#64748b',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.14)',
    accentText: '#bae6fd',
    secondaryAccent: '#a855f7',
    secondaryAccentSoft: 'rgba(168, 85, 247, 0.14)',
    success: '#22c55e',
    successSoft: 'rgba(34, 197, 94, 0.14)',
    warning: '#facc15',
    warningSoft: 'rgba(250, 204, 21, 0.14)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.14)',
    info: '#0ea5e9',
    inputBackground: '#020617',
    selectedSurface: 'rgba(56, 189, 248, 0.18)',
    selectedBorder: 'rgba(125, 211, 252, 0.75)',
    chipBackground: 'rgba(15, 23, 42, 0.92)',
    chipBorder: '#1e293b',
    overlay: 'rgba(2, 6, 23, 0.76)',
  }),
  createTheme('ocean', 'Ocean Blue', 'Blue-forward palette for strong device status contrast.', {
    background: '#03111d',
    backgroundAlt: '#082033',
    surface: '#0b1b2d',
    surfaceElevated: '#10253d',
    surfaceStrong: '#17324d',
    border: '#17324d',
    borderStrong: '#2563eb',
    text: '#f8fafc',
    mutedText: '#93c5fd',
    subtleText: '#60a5fa',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.18)',
    accentText: '#dbeafe',
    secondaryAccent: '#60a5fa',
    secondaryAccentSoft: 'rgba(96, 165, 250, 0.18)',
    success: '#34d399',
    successSoft: 'rgba(52, 211, 153, 0.14)',
    warning: '#fde047',
    warningSoft: 'rgba(253, 224, 71, 0.14)',
    danger: '#fb7185',
    dangerSoft: 'rgba(251, 113, 133, 0.14)',
    info: '#0ea5e9',
    inputBackground: '#03111d',
    selectedSurface: 'rgba(14, 165, 233, 0.2)',
    selectedBorder: 'rgba(96, 165, 250, 0.8)',
    chipBackground: 'rgba(11, 27, 45, 0.94)',
    chipBorder: '#17324d',
    overlay: 'rgba(3, 17, 29, 0.78)',
  }),
  createTheme('forest', 'Forest', 'Green and teal tones with calm, clear contrast.', {
    background: '#05120d',
    backgroundAlt: '#0e1f18',
    surface: '#10261c',
    surfaceElevated: '#153022',
    surfaceStrong: '#21422f',
    border: '#21422f',
    borderStrong: '#22c55e',
    text: '#f0fdf4',
    mutedText: '#bbf7d0',
    subtleText: '#86efac',
    accent: '#34d399',
    accentSoft: 'rgba(52, 211, 153, 0.18)',
    accentText: '#d1fae5',
    secondaryAccent: '#14b8a6',
    secondaryAccentSoft: 'rgba(20, 184, 166, 0.18)',
    success: '#22c55e',
    successSoft: 'rgba(34, 197, 94, 0.14)',
    warning: '#fde047',
    warningSoft: 'rgba(253, 224, 71, 0.14)',
    danger: '#fb7185',
    dangerSoft: 'rgba(251, 113, 133, 0.14)',
    info: '#2dd4bf',
    inputBackground: '#05120d',
    selectedSurface: 'rgba(34, 197, 94, 0.18)',
    selectedBorder: 'rgba(110, 231, 183, 0.78)',
    chipBackground: 'rgba(16, 38, 28, 0.94)',
    chipBorder: '#21422f',
    overlay: 'rgba(5, 18, 13, 0.8)',
  }),
  createTheme('sunset', 'Sunset Ember', 'Orange and coral accents with strong warmth.', {
    background: '#170b0a',
    backgroundAlt: '#2a1411',
    surface: '#23100f',
    surfaceElevated: '#311613',
    surfaceStrong: '#4a1f1a',
    border: '#4a1f1a',
    borderStrong: '#fb923c',
    text: '#fff7ed',
    mutedText: '#fed7aa',
    subtleText: '#fdba74',
    accent: '#fb923c',
    accentSoft: 'rgba(251, 146, 60, 0.18)',
    accentText: '#ffedd5',
    secondaryAccent: '#f97316',
    secondaryAccentSoft: 'rgba(249, 115, 22, 0.18)',
    success: '#4ade80',
    successSoft: 'rgba(74, 222, 128, 0.14)',
    warning: '#fbbf24',
    warningSoft: 'rgba(251, 191, 36, 0.14)',
    danger: '#fb7185',
    dangerSoft: 'rgba(251, 113, 133, 0.14)',
    info: '#f97316',
    inputBackground: '#170b0a',
    selectedSurface: 'rgba(249, 115, 22, 0.2)',
    selectedBorder: 'rgba(251, 191, 36, 0.78)',
    chipBackground: 'rgba(35, 16, 15, 0.94)',
    chipBorder: '#4a1f1a',
    overlay: 'rgba(23, 11, 10, 0.82)',
  }),
  createTheme('highContrast', 'High Contrast', 'Maximum separation with bright text and sharp surfaces.', {
    background: '#000000',
    backgroundAlt: '#0a0a0a',
    surface: '#111111',
    surfaceElevated: '#171717',
    surfaceStrong: '#262626',
    border: '#404040',
    borderStrong: '#facc15',
    text: '#ffffff',
    mutedText: '#d4d4d4',
    subtleText: '#a3a3a3',
    accent: '#facc15',
    accentSoft: 'rgba(250, 204, 21, 0.18)',
    accentText: '#fef08a',
    secondaryAccent: '#38bdf8',
    secondaryAccentSoft: 'rgba(56, 189, 248, 0.18)',
    success: '#4ade80',
    successSoft: 'rgba(74, 222, 128, 0.14)',
    warning: '#facc15',
    warningSoft: 'rgba(250, 204, 21, 0.14)',
    danger: '#f87171',
    dangerSoft: 'rgba(248, 113, 113, 0.14)',
    info: '#38bdf8',
    inputBackground: '#000000',
    selectedSurface: 'rgba(250, 204, 21, 0.18)',
    selectedBorder: 'rgba(250, 204, 21, 0.85)',
    chipBackground: 'rgba(17, 17, 17, 0.96)',
    chipBorder: '#404040',
    overlay: 'rgba(0, 0, 0, 0.88)',
  }),
  createTheme('protanopiaSafe', 'Protanopia Safe', 'Blue and amber contrast avoids red/green confusion.', {
    background: '#06111f',
    backgroundAlt: '#102033',
    surface: '#10263d',
    surfaceElevated: '#16314f',
    surfaceStrong: '#1f456f',
    border: '#1f456f',
    borderStrong: '#f59e0b',
    text: '#eff6ff',
    mutedText: '#bfdbfe',
    subtleText: '#93c5fd',
    accent: '#60a5fa',
    accentSoft: 'rgba(96, 165, 250, 0.18)',
    accentText: '#dbeafe',
    secondaryAccent: '#f59e0b',
    secondaryAccentSoft: 'rgba(245, 158, 11, 0.18)',
    success: '#38bdf8',
    successSoft: 'rgba(56, 189, 248, 0.14)',
    warning: '#fbbf24',
    warningSoft: 'rgba(251, 191, 36, 0.14)',
    danger: '#fb7185',
    dangerSoft: 'rgba(251, 113, 133, 0.14)',
    info: '#0ea5e9',
    inputBackground: '#06111f',
    selectedSurface: 'rgba(96, 165, 250, 0.18)',
    selectedBorder: 'rgba(245, 158, 11, 0.78)',
    chipBackground: 'rgba(16, 38, 61, 0.94)',
    chipBorder: '#1f456f',
    overlay: 'rgba(6, 17, 31, 0.8)',
  }),
  createTheme('deuteranopiaSafe', 'Deuteranopia Safe', 'Blue and violet contrast keeps device states distinct.', {
    background: '#071018',
    backgroundAlt: '#111827',
    surface: '#111c2c',
    surfaceElevated: '#17253a',
    surfaceStrong: '#22314b',
    border: '#22314b',
    borderStrong: '#8b5cf6',
    text: '#f8fafc',
    mutedText: '#c4b5fd',
    subtleText: '#a78bfa',
    accent: '#818cf8',
    accentSoft: 'rgba(129, 140, 248, 0.18)',
    accentText: '#e0e7ff',
    secondaryAccent: '#8b5cf6',
    secondaryAccentSoft: 'rgba(139, 92, 246, 0.18)',
    success: '#38bdf8',
    successSoft: 'rgba(56, 189, 248, 0.14)',
    warning: '#fbbf24',
    warningSoft: 'rgba(251, 191, 36, 0.14)',
    danger: '#f472b6',
    dangerSoft: 'rgba(244, 114, 182, 0.14)',
    info: '#6366f1',
    inputBackground: '#071018',
    selectedSurface: 'rgba(129, 140, 248, 0.18)',
    selectedBorder: 'rgba(139, 92, 246, 0.8)',
    chipBackground: 'rgba(17, 28, 44, 0.94)',
    chipBorder: '#22314b',
    overlay: 'rgba(7, 16, 24, 0.8)',
  }),
  createTheme('tritanopiaSafe', 'Tritanopia Safe', 'Red and green contrast for blue/yellow separation.', {
    background: '#120f0a',
    backgroundAlt: '#211a12',
    surface: '#251f15',
    surfaceElevated: '#342b1d',
    surfaceStrong: '#4a3b27',
    border: '#4a3b27',
    borderStrong: '#4ade80',
    text: '#fffaf0',
    mutedText: '#fed7aa',
    subtleText: '#fdba74',
    accent: '#4ade80',
    accentSoft: 'rgba(74, 222, 128, 0.18)',
    accentText: '#dcfce7',
    secondaryAccent: '#fb7185',
    secondaryAccentSoft: 'rgba(251, 113, 133, 0.18)',
    success: '#22c55e',
    successSoft: 'rgba(34, 197, 94, 0.14)',
    warning: '#facc15',
    warningSoft: 'rgba(250, 204, 21, 0.14)',
    danger: '#fb7185',
    dangerSoft: 'rgba(251, 113, 133, 0.14)',
    info: '#f59e0b',
    inputBackground: '#120f0a',
    selectedSurface: 'rgba(74, 222, 128, 0.18)',
    selectedBorder: 'rgba(251, 113, 133, 0.78)',
    chipBackground: 'rgba(37, 31, 21, 0.94)',
    chipBorder: '#4a3b27',
    overlay: 'rgba(18, 15, 10, 0.82)',
  }),
];

const defaultTheme = THEME_OPTIONS[0];

const ThemeContext = createContext<ThemeContextValue>({
  mode: defaultTheme.id,
  setMode: () => {},
  theme: defaultTheme,
  options: THEME_OPTIONS,
  isThemeReady: false,
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(defaultTheme.id);
  const [isThemeReady, setIsThemeReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!storedMode) return;

        const migratedMode = storedMode === 'midnight' ? 'default' : storedMode;
        const nextMode = THEME_OPTIONS.find((option) => option.id === migratedMode)?.id;
        if (nextMode && isMounted) {
          setModeState(nextMode);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      } finally {
        if (isMounted) {
          setIsThemeReady(true);
        }
      }
    };

    void loadTheme();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isThemeReady) return;

    void AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch((error) => {
      console.error('Failed to save theme preference:', error);
    });
  }, [mode, isThemeReady]);

  const theme = useMemo(() => {
    return THEME_OPTIONS.find((option) => option.id === mode) ?? defaultTheme;
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      setMode: setModeState,
      theme,
      options: THEME_OPTIONS,
      isThemeReady,
    }),
    [mode, theme, isThemeReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function getNavigationTheme(theme: AppTheme) {
  return {
    ...DarkTheme,
    dark: true,
    colors: {
      ...DarkTheme.colors,
      primary: theme.colors.accent,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.text,
      border: theme.colors.border,
      notification: theme.colors.warning,
    },
  };
}
