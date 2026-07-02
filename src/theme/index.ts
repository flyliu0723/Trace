/** SpendWhere 设计系统 — 数字生活日记 */

import type { TextStyle } from 'react-native';
import { darkColors } from './palettes';
import type { ThemeColors } from './types';

export type { AppTheme, ThemeColors, ThemeMode, ThemePalettes } from './types';
export { darkColors, lightColors, getThemeColors, getThemePalettes } from './palettes';

/** @deprecated 请使用 useTheme().colors */
export const colors = darkColors;

export const tabularNums: TextStyle = {
  fontVariant: ['tabular-nums'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  pill: 999,
};

export const typography = {
  hero: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, fontWeight: '500' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '500' as const },
  stat: { fontSize: 28, fontWeight: '700' as const, ...tabularNums },
  statHero: { fontSize: 44, fontWeight: '700' as const, ...tabularNums },
  mono: tabularNums,
};

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
};

export function createShadows(themeColors: ThemeColors, isDark = true) {
  return {
    glow: {
      shadowColor: themeColors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: isDark ? 0.15 : 0.12,
      shadowRadius: 12,
      elevation: 4,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.25 : 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
  };
}

/** @deprecated 请使用 useTheme().shadows */
export const shadows = createShadows(darkColors);
