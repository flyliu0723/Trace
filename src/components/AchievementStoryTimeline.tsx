import React from 'react';
import { Text, View } from 'react-native';
import type { AchievementStoryStep } from '../analysis/achievements/achievementCatalog';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing, typography } from '../theme';

interface AchievementStoryTimelineProps {
  steps: AchievementStoryStep[];
}

export function AchievementStoryTimeline({ steps }: AchievementStoryTimelineProps) {
  const styles = useThemedStyles(({ colors: c }) => ({
    wrap: {
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'flex-start',
    },
    rail: {
      width: 16,
      alignItems: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.accent,
      marginTop: 5,
    },
    line: {
      width: 1,
      flex: 1,
      backgroundColor: c.borderLight,
      marginTop: 4,
      minHeight: 12,
    },
    label: {
      ...typography.body,
      color: c.textPrimary,
      flex: 1,
      lineHeight: 22,
    },
  }));

  return (
    <View style={styles.wrap}>
      {steps.map((step, index) => (
        <View key={`${step.label}-${index}`} style={styles.row}>
          <View style={styles.rail}>
            <View style={styles.dot} />
            {index < steps.length - 1 ? <View style={styles.line} /> : null}
          </View>
          <Text style={styles.label}>{step.label}</Text>
        </View>
      ))}
    </View>
  );
}
