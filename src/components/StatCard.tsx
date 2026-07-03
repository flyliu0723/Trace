import React from 'react';
import { Text, View } from 'react-native';
import { SpringPressable } from './SpringPressable';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, tabularNums } from '../theme';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accentColor?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, hint, accentColor, onPress }: StatCardProps) {
  const { colors } = useTheme();
  const resolvedAccent = accentColor ?? colors.accent;

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    card: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.md,
      position: 'relative',
      ...shadows.elevatedSubtle,
    },
    dot: {
      position: 'absolute',
      top: spacing.md + 2,
      right: spacing.md,
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    label: {
      fontSize: 12,
      fontWeight: '500',
      color: c.labelSecondary,
      marginBottom: spacing.sm,
      letterSpacing: 0.2,
    },
    value: {
      fontSize: 26,
      fontWeight: '800',
      color: c.statInk,
      letterSpacing: -0.6,
      ...tabularNums,
    },
    hint: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: spacing.xs,
    },
  }));

  const content = (
    <>
      <View style={[styles.dot, { backgroundColor: resolvedAccent }]} />
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <SpringPressable style={styles.card} onPress={onPress}>
        {content}
      </SpringPressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

interface HomeMetricsProps {
  children: React.ReactNode;
}

export function HomeMetricsGrid({ children }: HomeMetricsProps) {
  const styles = useThemedStyles(() => ({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
  }));

  return <View style={styles.grid}>{children}</View>;
}
