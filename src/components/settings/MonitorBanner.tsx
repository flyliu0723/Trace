import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SpringPressable } from '../SpringPressable';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { radius, spacing } from '../../theme';

interface MonitorBannerProps {
  message: string;
  onPress: () => void;
  onDismiss?: () => void;
}

export function MonitorBanner({ message, onPress, onDismiss }: MonitorBannerProps) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-6)).current;

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    wrapper: {
      marginBottom: spacing.xl,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
      paddingVertical: spacing.sm + 4,
      ...shadows.elevatedSubtle,
    },
    mainArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    text: {
      flex: 1,
      fontSize: 13,
      fontWeight: '500',
      color: c.textPrimary,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    dismissButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    dismissPressed: {
      backgroundColor: c.surfaceElevated,
    },
    chevron: {
      opacity: 0.35,
      marginRight: spacing.xs,
    },
  }));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}>
      <View style={styles.banner}>
        <SpringPressable style={styles.mainArea} onPress={onPress} scaleTo={0.98}>
          <Text style={styles.text}>{message}</Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.labelSecondary}
            style={styles.chevron}
          />
        </SpringPressable>
        {onDismiss ? (
          <Pressable
            style={({ pressed }) => [styles.dismissButton, pressed && styles.dismissPressed]}
            onPress={onDismiss}
            hitSlop={8}
            accessibilityLabel="关闭提示">
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}
