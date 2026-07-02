import type { DayMood } from '../analysis/contributionAnalyzer';

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderLight: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  warning: string;
  danger: string;
  unlock: string;
  screenOff: string;
  appForeground: string;
  media: string;
  quickSession: string;
  glow: string;
  heatEmpty: string;
  heatLow: string;
  heatMid: string;
  heatHigh: string;
  heatPeak: string;
}

export interface ThemePalettes {
  mood: Record<DayMood, string[]>;
}

export interface AppTheme {
  mode: ThemeMode;
  colors: ThemeColors;
  palettes: ThemePalettes;
  isDark: boolean;
}
