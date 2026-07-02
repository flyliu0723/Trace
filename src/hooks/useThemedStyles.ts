import { useMemo } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { AppTheme } from '../theme/types';

type NamedStyles<T> = {
  [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

type ThemedFactoryTheme = AppTheme & Pick<ReturnType<typeof useTheme>, 'shadows'>;

export function useThemedStyles<T extends NamedStyles<T>>(
  factory: (theme: ThemedFactoryTheme) => T,
): T {
  const theme = useTheme();
  // factory 为组件内稳定闭包，仅随 theme 变化重建样式
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory(theme)), [theme]);
}
