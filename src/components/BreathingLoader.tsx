import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing, typography } from '../theme';

interface BreathingLoaderProps {
  text?: string;
}

export function BreathingLoader({ text = '正在整理你的生活轨迹…' }: BreathingLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  const styles = useThemedStyles(({ colors }) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    dotMid: {
      backgroundColor: colors.success,
    },
    dotLate: {
      backgroundColor: colors.quickSession,
    },
    text: {
      ...typography.caption,
      color: colors.textSecondary,
      marginLeft: spacing.xs,
    },
  }));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.dot, { opacity }]} />
      <Animated.View style={[styles.dot, styles.dotMid, { opacity }]} />
      <Animated.View style={[styles.dot, styles.dotLate, { opacity }]} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}
