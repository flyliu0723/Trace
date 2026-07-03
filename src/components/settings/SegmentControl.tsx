import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { radius, spacing, typography } from '../../theme';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentControlProps<T>) {
  const [segmentWidth, setSegmentWidth] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const activeIndex = options.findIndex((option) => option.value === value);

  const styles = useThemedStyles(({ colors }) => ({
    container: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.sm,
      padding: 3,
    },
    indicator: {
      position: 'absolute',
      top: 3,
      bottom: 3,
      left: 3,
      backgroundColor: colors.surface,
      borderRadius: radius.sm - 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 2,
      elevation: 1,
    },
    segment: {
      flex: 1,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.sm - 2,
      alignItems: 'center',
      zIndex: 1,
    },
    segmentPressed: {
      opacity: 0.7,
    },
    label: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    labelActive: {
      color: colors.textPrimary,
      fontWeight: '600',
    },
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    const totalWidth = event.nativeEvent.layout.width - 6;
    setSegmentWidth(totalWidth / options.length);
  };

  useEffect(() => {
    if (segmentWidth <= 0 || activeIndex < 0) {
      return;
    }
    Animated.spring(slideAnim, {
      toValue: activeIndex * segmentWidth,
      friction: 8,
      tension: 120,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, segmentWidth, slideAnim]);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            styles.indicator,
            {
              width: segmentWidth,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            style={({ pressed }) => [styles.segment, pressed && styles.segmentPressed]}
            onPress={() => onChange(option.value)}>
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
