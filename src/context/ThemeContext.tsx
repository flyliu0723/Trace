import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getThemePreference, setThemePreference } from '../db/settingsRepository';
import { createShadows } from '../theme';
import { getThemeColors, getThemePalettes } from '../theme/palettes';
import type { AppTheme, ThemeMode } from '../theme/types';

interface ThemeContextValue extends AppTheme {
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  shadows: ReturnType<typeof createShadows>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    getThemePreference().then(setModeState).catch(console.error);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setThemePreference(next).catch(console.error);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : 'light');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(() => {
    const colors = getThemeColors(mode);
    return {
      mode,
      colors,
      palettes: getThemePalettes(mode),
      isDark: mode === 'dark',
      setMode,
      toggleMode,
      shadows: createShadows(colors, mode === 'dark'),
    };
  }, [mode, setMode, toggleMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
