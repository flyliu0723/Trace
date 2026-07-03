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
  background: '#0A0B0D',
  surface: '#14161A',
  surfaceElevated: '#1C1E24',
  border: '#2A2A2A',
  borderLight: '#FFFFFF22',
  ghostBorder: 'rgba(255,255,255,0.03)',
  textPrimary: '#F2F2F2',
  textSecondary: '#9A9A9A',
  textMuted: '#666666',
  statInk: '#F2F2F2',
  labelSecondary: '#8E95A5',
  accent: semantic.accent,
  accentSoft: '#5E81AC33',
  onAccent: '#FFFFFF',
  success: semantic.success,
  warning: semantic.warning,
  danger: semantic.danger,
  unlock: semantic.unlock,
  morandiUnlock: '#A78BFA',
  screenOff: semantic.screenOff,
  appForeground: semantic.appForeground,
  media: semantic.media,
  quickSession: semantic.quickSession,
  glow: '#5E81AC18',
  heatEmpty: '#2A2D35',
  heatLow: '#2A3548',
  heatMid: '#3D5270',
  heatHigh: '#5E81AC',
  heatPeak: '#88C0D0',
};

export const lightColors: ThemeColors = {
  background: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E8EAED',
  borderLight: 'rgba(0,0,0,0.06)',
  ghostBorder: 'rgba(0,0,0,0.03)',
  textPrimary: '#1A1C20',
  textSecondary: '#5C6370',
  textMuted: '#9CA3AF',
  statInk: '#1A1C20',
  labelSecondary: '#8E95A5',
  accent: semantic.accent,
  accentSoft: 'rgba(94,129,172,0.08)',
  onAccent: '#FFFFFF',
  success: semantic.success,
  warning: semantic.warning,
  danger: semantic.danger,
  unlock: semantic.unlock,
  morandiUnlock: '#9B4DAB',
  screenOff: semantic.screenOff,
  appForeground: semantic.appForeground,
  media: semantic.media,
  quickSession: semantic.quickSession,
  glow: 'rgba(94,129,172,0.06)',
  heatEmpty: '#E5E7EB',
  heatLow: '#E4E8EF',
  heatMid: '#C8D4E4',
  heatHigh: '#8BA4C4',
  heatPeak: '#5E81AC',
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
