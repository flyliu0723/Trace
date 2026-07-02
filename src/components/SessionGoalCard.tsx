import React from 'react';
import { Text, View } from 'react-native';
import {
  getGoalTypeLabel,
  type SessionGoal,
  type SessionGoalType,
} from '../analysis/sessionGoalAnalyzer';
import { formatTime, formatDuration } from '../analysis/sessionAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface SessionGoalCardProps {
  goal: SessionGoal;
}

export function SessionGoalCard({ goal }: SessionGoalCardProps) {
  const { colors } = useTheme();

  const GOAL_COLORS: Record<SessionGoalType, string> = {
    productive: colors.success,
    entertainment: colors.quickSession,
    quick_glance: colors.textMuted,
    mixed: colors.accent,
    passive_media: colors.media,
    idle: colors.screenOff,
  };

  const styles = useThemedStyles(({ colors: c }) => ({
    card: {
      backgroundColor: 'transparent',
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    time: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '600',
      ...typography.mono,
    },
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    badgeText: {
      ...typography.label,
      fontWeight: '600',
    },
    duration: {
      ...typography.label,
      color: c.textMuted,
      marginLeft: 'auto',
      ...typography.mono,
    },
    summary: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 20,
    },
    apps: {
      ...typography.label,
      color: c.accent,
      marginTop: spacing.xs,
      fontWeight: '500',
    },
  }));

  const accent = GOAL_COLORS[goal.goalType];

  return (
    <View style={[styles.card, { borderColor: accent + '44' }]}>
      <View style={styles.header}>
        <Text style={styles.time}>{formatTime(goal.startTime)}</Text>
        <View style={[styles.badge, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.badgeText, { color: accent }]}>
            {getGoalTypeLabel(goal.goalType)}
          </Text>
        </View>
        <Text style={styles.duration}>{formatDuration(goal.durationMs)}</Text>
      </View>
      <Text style={styles.summary}>{goal.summary}</Text>
      {goal.appLabels.length > 0 ? (
        <Text style={styles.apps}>{goal.appLabels.join(' → ')}</Text>
      ) : null}
    </View>
  );
}
