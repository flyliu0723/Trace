import React, { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSelectedDate } from '../context/DateContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatDisplayDate } from '../utils/dateUtils';
import { radius, spacing, typography } from '../theme';

export function DateNavigator() {
  const { selectedDate, goPrevDay, goNextDay, goToday, canGoNext, isSelectedToday } =
    useSelectedDate();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const styles = useThemedStyles(({ colors }) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'transparent',
      borderRadius: radius.lg,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    arrowButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    pressed: {
      backgroundColor: colors.surface,
      transform: [{ scale: 0.95 }],
    },
    arrowDisabled: {
      opacity: 0.25,
    },
    arrow: {
      color: colors.textPrimary,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '300',
    },
    arrowTextDisabled: {
      color: colors.textMuted,
    },
    dateCenter: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    dateText: {
      ...typography.subtitle,
      color: colors.textPrimary,
      fontWeight: '600',
      ...typography.mono,
    },
  }));

  const animateSlide = (direction: 'left' | 'right') => {
    slideAnim.setValue(direction === 'left' ? 12 : -12);
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 8,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const handlePrev = () => {
    animateSlide('right');
    goPrevDay();
  };

  const handleNext = () => {
    if (canGoNext) {
      animateSlide('left');
      goNextDay();
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={({ pressed }) => [styles.arrowButton, pressed && styles.pressed]}
        onPress={handlePrev}
        hitSlop={8}>
        <Text style={styles.arrow}>‹</Text>
      </Pressable>

      <Pressable
        style={styles.dateCenter}
        onPress={goToday}
        disabled={isSelectedToday}>
        <Animated.Text
          style={[styles.dateText, { transform: [{ translateX: slideAnim }] }]}>
          {formatDisplayDate(selectedDate)}
        </Animated.Text>
      </Pressable>

      <Pressable
        style={({ pressed }) => [
          styles.arrowButton,
          !canGoNext && styles.arrowDisabled,
          pressed && canGoNext && styles.pressed,
        ]}
        onPress={handleNext}
        disabled={!canGoNext}
        hitSlop={8}>
        <Text style={[styles.arrow, !canGoNext && styles.arrowTextDisabled]}>›</Text>
      </Pressable>
    </View>
  );
}
