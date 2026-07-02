import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing } from '../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  textured?: boolean;
}

export function ScreenContainer({ children, style, textured = false }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(({ colors }) => ({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
    },
    texture: {
      ...StyleSheet.absoluteFill,
      overflow: 'hidden',
    },
    textureLine: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: 1,
      backgroundColor: colors.borderLight,
      opacity: 0.3,
    },
  }));

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.sm }, style]}>
      {textured ? (
        <View style={styles.texture} pointerEvents="none">
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={[styles.textureLine, { top: i * 120 + 40 }]} />
          ))}
        </View>
      ) : null}
      {children}
    </View>
  );
}
