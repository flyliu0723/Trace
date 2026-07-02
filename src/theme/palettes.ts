import type { DayMood } from '../analysis/contributionAnalyzer';
import type { ThemeColors, ThemeMode, ThemePalettes } from './types';

const semantic = {
  accent: '#5E81AC',
  success: '#A3BE8C',
  warning: '#EBCB8B',
  danger: '#BF616A',
  unlock: '#B48EAD',
  screenOff: '#6B7280',
  appForeground: '#5E81AC',
  media: '#A3BE8C',
  quickSession: '#D08770',
};

export const darkColors: ThemeColors = {
  background: '#0A0A0A',
  surface: '#151515',
  surfaceElevated: '#1C1C1C',
  border: '#2A2A2A',
  borderLight: '#FFFFFF22',
  textPrimary: '#F2F2F2',
  textSecondary: '#9A9A9A',
  textMuted: '#666666',
  accent: semantic.accent,
  accentSoft: '#5E81AC33',
  onAccent: '#FFFFFF',
  success: semantic.success,
  warning: semantic.warning,
  danger: semantic.danger,
  unlock: semantic.unlock,
  screenOff: semantic.screenOff,
  appForeground: semantic.appForeground,
  media: semantic.media,
  quickSession: semantic.quickSession,
  glow: '#5E81AC18',
  heatEmpty: '#1A1A1A',
  heatLow: '#2A3548',
  heatMid: '#3D5270',
  heatHigh: '#5E81AC',
  heatPeak: '#88C0D0',
};

export const lightColors: ThemeColors = {
  background: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceElevated: '#EEF0F4',
  border: '#D8DCE3',
  borderLight: '#00000014',
  textPrimary: '#1A1D24',
  textSecondary: '#5C6370',
  textMuted: '#9CA3AF',
  accent: semantic.accent,
  accentSoft: '#5E81AC1F',
  onAccent: '#FFFFFF',
  success: semantic.success,
  warning: semantic.warning,
  danger: semantic.danger,
  unlock: semantic.unlock,
  screenOff: semantic.screenOff,
  appForeground: semantic.appForeground,
  media: semantic.media,
  quickSession: semantic.quickSession,
  glow: '#5E81AC14',
  heatEmpty: '#E4E7EC',
  heatLow: '#C8D6E6',
  heatMid: '#8BA4C4',
  heatHigh: '#5E81AC',
  heatPeak: '#3D6A94',
};

const darkMoodColors: Record<DayMood, string[]> = {
  empty: ['#1A1A1A'],
  productive: ['#243028', '#3D5A42', '#5A7A52', '#7A9B6C', '#A3BE8C'],
  entertainment: ['#302824', '#5A4238', '#8B5A42', '#B07050', '#D08770'],
  mixed: ['#2A2830', '#4A4258', '#6B5A7A', '#8B7A9B', '#B48EAD'],
};

const lightMoodColors: Record<DayMood, string[]> = {
  empty: ['#E4E7EC'],
  productive: ['#D8E8D4', '#B8D4B0', '#8FBA88', '#6FA068', '#4A8A52'],
  entertainment: ['#F0E0D4', '#E0C4B0', '#D0A088', '#C08068', '#B06850'],
  mixed: ['#E4DCE8', '#D0C4DC', '#B8A8C8', '#A090B8', '#8B78A8'],
};

export const darkPalettes: ThemePalettes = { mood: darkMoodColors };
export const lightPalettes: ThemePalettes = { mood: lightMoodColors };

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'light' ? lightColors : darkColors;
}

export function getThemePalettes(mode: ThemeMode): ThemePalettes {
  return mode === 'light' ? lightPalettes : darkPalettes;
}
