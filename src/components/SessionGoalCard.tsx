import React from 'react';
import { Text, View } from 'react-native';
import {
  getGoalTypeLabel,
  type SessionGoal,
  type SessionGoalType,
} from '../analysis/sessionGoalAnalyzer';
import { formatTime, formatDuration } from '../analysis/sessionAnalyzer';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface SessionGoalCardProps {
  goal: SessionGoal;
}

interface SessionGoalCardStyles {
  summary: object;
  summaryBold: object;
}

const GOAL_BADGE: Record<SessionGoalType, { bg: string; text: string }> = {
  productive: { bg: '#E5EDE8', text: '#4A7A5E' },
  entertainment: { bg: '#F5EDE8', text: '#9A6B4A' },
  quick_glance: { bg: '#EEF0F3', text: '#8E95A5' },
  mixed: { bg: '#E8EDF9', text: '#4A69BB' },
  passive_media: { bg: '#E5EDE8', text: '#4A7A5E' },
  idle: { bg: '#EDE8F0', text: '#6B608A' },
};

function renderSummary(goal: SessionGoal, styles: SessionGoalCardStyles) {
  if (goal.goalType === 'productive' && goal.appLabels.length > 0) {
    const appPart = goal.appLabels.join('、');
    return (
      <Text style={styles.summary}>
        在 <Text style={styles.summaryBold}>{appPart}</Text> 上专注处理事务
      </Text>
    );
  }

  if (goal.goalType === 'entertainment' && goal.appLabels.length === 1) {
    return (
      <Text style={styles.summary}>
        在 <Text style={styles.summaryBold}>{goal.appLabels[0]}</Text> 上沉浸浏览
      </Text>
    );
  }

  if (goal.goalType === 'entertainment' && goal.appLabels.length > 1) {
    return (
      <Text style={styles.summary}>
        浏览了 <Text style={styles.summaryBold}>{goal.appLabels.join('、')}</Text>
      </Text>
    );
  }

  if (goal.goalType === 'idle' && goal.appLabels.length > 0) {
    return (
      <Text style={styles.summary}>
        短暂打开 <Text style={styles.summaryBold}>{goal.appLabels.join('、')}</Text>
      </Text>
    );
  }

  if (goal.goalType === 'mixed' && goal.appLabels.length > 0) {
    return (
      <Text style={styles.summary}>
        混合切换 <Text style={styles.summaryBold}>{goal.appLabels.join(' → ')}</Text>
      </Text>
    );
  }

  if (goal.goalType === 'passive_media' && goal.appLabels.length > 0) {
    return (
      <Text style={styles.summary}>
        打开 <Text style={styles.summaryBold}>{goal.appLabels[0]}</Text> 后后台陪伴
      </Text>
    );
  }

  return <Text style={styles.summary}>{goal.summary}</Text>;
}

export function SessionGoalCard({ goal }: SessionGoalCardProps) {
  const badge = GOAL_BADGE[goal.goalType];

  const styles = useThemedStyles(({ colors: c, shadows, isDark }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      ...shadows.elevatedSubtle,
      ...(isDark ? { borderWidth: 1, borderColor: c.borderLight } : {}),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    time: {
      fontSize: 12,
      fontWeight: '500',
      color: c.labelSecondary,
      ...typography.mono,
    },
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 3,
      backgroundColor: isDark ? badge.text + '22' : badge.bg,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: badge.text,
    },
    duration: {
      fontSize: 15,
      fontWeight: '700',
      color: c.statInk,
      marginLeft: 'auto',
      ...typography.mono,
    },
    summary: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 22,
    },
    summaryBold: {
      fontWeight: '700',
      color: c.textPrimary,
    },
  }));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.time}>{formatTime(goal.startTime)}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{getGoalTypeLabel(goal.goalType)}</Text>
        </View>
        <Text style={styles.duration}>{formatDuration(goal.durationMs)}</Text>
      </View>
      {renderSummary(goal, styles)}
    </View>
  );
}
