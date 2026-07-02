import React from 'react';
import { Text, View } from 'react-native';
import {
  CATEGORY_LEGEND,
  getCategoryColor,
  getCategoryLabel,
} from '../analysis/appClassifier';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

export function CategoryLegend() {
  const styles = useThemedStyles(({ colors }) => ({
    container: {
      marginBottom: spacing.md,
    },
    title: {
      ...typography.label,
      color: colors.textMuted,
      marginBottom: spacing.sm,
      letterSpacing: 0.5,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    chipText: {
      ...typography.label,
      fontWeight: '600',
    },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>类别图例</Text>
      <View style={styles.chips}>
        {CATEGORY_LEGEND.map((category) => {
          const color = getCategoryColor(category);
          return (
            <View
              key={category}
              style={[styles.chip, { borderColor: color + '55', backgroundColor: color + '18' }]}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Text style={[styles.chipText, { color }]}>{getCategoryLabel(category)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
