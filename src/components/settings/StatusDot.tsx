import React, { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';

type StatusDotVariant = 'ok' | 'partial' | 'paused' | 'incomplete';

interface StatusDotProps {
  variant: StatusDotVariant;
  pulse?: boolean;
  size?: number;
}

export function StatusDot({ variant, pulse = false, size = 8 }: StatusDotProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  const styles = useThemedStyles(({ colors }) => ({
    dot: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    ok: {
      backgroundColor: colors.success,
    },
    paused: {
      backgroundColor: colors.warning,
    },
    partial: {
      backgroundColor: colors.warning,
    },
    incomplete: {
      backgroundColor: colors.danger,
    },
    glow: {
      position: 'absolute',
      width: size * 2.5,
      height: size * 2.5,
      borderRadius: size * 1.25,
      backgroundColor: colors.success,
      opacity: 0.2,
    },
  }));

  useEffect(() => {
    if (!pulse) {
      opacity.setValue(1);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, opacity]);

  const variantStyle = styles[variant] as ViewStyle;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {pulse ? (
        <Animated.View style={[styles.glow, { opacity, transform: [{ scale: opacity }] }]} />
      ) : null}
      <View style={[styles.dot, variantStyle]} />
    </View>
  );
}
