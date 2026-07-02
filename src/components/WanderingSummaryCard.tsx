import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { WanderingSummary } from '../analysis/wanderingViewBuilder';
import { formatDuration } from '../analysis/sessionAnalyzer';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface WanderingSummaryCardProps {
  summary: WanderingSummary;
  actionLabel?: string;
  onActionPress?: () => void;
  onPeakPress?: () => void;
}

export function WanderingSummaryCard({
  summary,
  actionLabel,
  onActionPress,
  onPeakPress,
}: WanderingSummaryCardProps) {
  const styles = useThemedStyles(({ colors: c }) => ({
    card: {
      backgroundColor: c.warning + '18',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.warning + '44',
      padding: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
    },
    stats: {
      ...typography.caption,
      color: c.textSecondary,
      ...typography.mono,
    },
    peakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    peakLabel: {
      ...typography.caption,
      color: c.textSecondary,
    },
    peakTime: {
      ...typography.caption,
      color: c.accent,
      fontWeight: '600',
      ...typography.mono,
    },
    repeatNote: {
      ...typography.caption,
      color: c.danger,
    },
    sting: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 20,
      fontStyle: 'italic',
    },
    action: {
      ...typography.label,
      color: c.accent,
      alignSelf: 'flex-end',
      fontWeight: '600',
    },
  }));

  if (summary.episodeCount === 0) {
    return null;
  }

  const topChainLabel = summary.topChain
    ? `${summary.topChain.apps.slice(0, 3).join(' → ')}`
    : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>无意识刷屏</Text>
      <Text style={styles.stats}>
        碎片化时间 {formatDuration(summary.totalWanderingMs)} · {summary.episodeCount} 次 · 切换{' '}
        {summary.totalSwitchCount} 次
      </Text>

      {summary.peakTimeLabel && onPeakPress ? (
        <Pressable style={styles.peakRow} onPress={onPeakPress} hitSlop={8}>
          <Text style={styles.peakLabel}>最密集时段</Text>
          <Text style={styles.peakTime}>{summary.peakTimeLabel}</Text>
          <Text style={styles.peakLabel}>→</Text>
        </Pressable>
      ) : summary.peakTimeLabel ? (
        <Text style={styles.stats}>最密集：{summary.peakTimeLabel}</Text>
      ) : null}

      {topChainLabel ? (
        <Text style={styles.stats}>最夸张：{topChainLabel}</Text>
      ) : null}

      {summary.repeatedPathCount > 0 ? (
        <Text style={styles.repeatNote}>
          有 {summary.repeatedPathCount} 段路径与昨天重复
        </Text>
      ) : null}

      {summary.stingLine ? <Text style={styles.sting}>「{summary.stingLine}」</Text> : null}

      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
