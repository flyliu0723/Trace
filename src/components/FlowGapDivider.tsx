import React from 'react';
import { Text, View } from 'react-native';
import { formatTime } from '../analysis/sessionAnalyzer';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing, typography } from '../theme';

interface FlowGapDividerProps {
  label: string;
}

export function FlowGapDivider({ label }: FlowGapDividerProps) {
  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    line: {
      flex: 1,
      height: 1,
      backgroundColor: c.borderLight,
    },
    label: {
      ...typography.label,
      color: c.textMuted,
      maxWidth: '70%',
      textAlign: 'center',
    },
  }));

  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <View style={styles.line} />
    </View>
  );
}

export function formatFlowGapLabel(startTime: number, endTime: number, label: string): string {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  if (start === end) {
    return label;
  }
  return `${start}–${end}  ${label}`;
}
