import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';
import type { LifeSpectrumDimension } from '../analysis/lifeSpectrumAnalyzer';
import { getDimensionLabel } from '../analysis/lifeSpectrumAnalyzer';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface LifeSpectrumDimensionPickerProps {
  dimensions: LifeSpectrumDimension[];
  activeDimension: LifeSpectrumDimension;
  onSelect: (dimension: LifeSpectrumDimension) => void;
}

export function LifeSpectrumDimensionPicker({
  dimensions,
  activeDimension,
  onSelect,
}: LifeSpectrumDimensionPickerProps) {
  const styles = useThemedStyles(({ colors: c }) => ({
    scroll: {
      marginBottom: spacing.md,
      marginHorizontal: -spacing.md,
    },
    content: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      flexDirection: 'row',
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
    },
    chipActive: {
      borderColor: c.accent,
      backgroundColor: c.accent + '18',
    },
    chipPressed: {
      opacity: 0.85,
    },
    chipText: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '600',
    },
    chipTextActive: {
      color: c.accent,
    },
  }));

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      {dimensions.map((dimension) => {
        const active = dimension === activeDimension;
        return (
          <Pressable
            key={dimension}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && styles.chipPressed,
            ]}
            onPress={() => onSelect(dimension)}>
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {getDimensionLabel(dimension)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
