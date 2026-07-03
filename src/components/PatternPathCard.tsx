import React from 'react';
import { View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing } from '../theme';
import { PatternMetaText, PatternPathText } from './PatternPathText';

interface PatternPathCardProps {
  pathLabel: string;
  occurrenceDays: number;
  totalCount: number;
}

export function PatternPathCard({ pathLabel, occurrenceDays, totalCount }: PatternPathCardProps) {
  const styles = useThemedStyles(({ colors, shadows, isDark }) => ({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.xs,
      ...shadows.elevatedSubtle,
      ...(isDark ? { borderWidth: 1, borderColor: colors.borderLight } : {}),
    },
  }));

  return (
    <View style={styles.card}>
      <PatternPathText pathLabel={pathLabel} />
      <PatternMetaText occurrenceDays={occurrenceDays} totalCount={totalCount} />
    </View>
  );
}
