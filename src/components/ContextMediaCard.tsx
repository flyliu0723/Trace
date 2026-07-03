import React from 'react';
import { Text, View } from 'react-native';
import type { DailyContextMediaReport } from '../analysis/contextMediaAnalyzer';
import {
  formatContextMediaBucketSummary,
  formatContextMediaSegmentLine,
  getContextMediaAccentKey,
} from '../analysis/contextMediaAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface ContextMediaCardProps {
  report: DailyContextMediaReport | null;
  compact?: boolean;
  variant?: 'card' | 'ghost';
}

export function ContextMediaCard({
  report,
  compact = false,
  variant = 'card',
}: ContextMediaCardProps) {
  const { colors } = useTheme();
  const isGhost = variant === 'ghost';

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: isGhost ? spacing.lg : spacing.md,
      marginBottom: isGhost ? spacing.xl : spacing.md,
      gap: spacing.sm,
      ...(isGhost ? shadows.elevated : shadows.card),
    },
    title: {
      ...(isGhost ? typography.caption : typography.subtitle),
      color: isGhost ? c.labelSecondary : c.textPrimary,
      fontWeight: '600',
      letterSpacing: isGhost ? 0.8 : 0,
      textTransform: isGhost ? 'uppercase' : 'none',
      marginBottom: isGhost ? spacing.sm : 0,
    },
    hint: {
      ...typography.caption,
      color: c.textMuted,
    },
    bucketList: {
      gap: spacing.md,
    },
    bucketRow: {
      borderRadius: radius.md,
      borderWidth: isGhost ? 0 : 1,
      paddingVertical: isGhost ? spacing.xs : spacing.sm,
      paddingHorizontal: isGhost ? 0 : spacing.sm,
      gap: 4,
      borderBottomWidth: isGhost ? 1 : 0,
      borderBottomColor: c.ghostBorder,
    },
    bucketHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    bucketLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    bucketDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    bucketLabel: {
      ...typography.caption,
      fontWeight: isGhost ? '500' : '600',
      color: isGhost ? c.textPrimary : undefined,
    },
    bucketSummary: {
      ...typography.caption,
      color: c.labelSecondary,
      ...typography.mono,
    },
    segmentLine: {
      ...typography.caption,
      color: c.textMuted,
      lineHeight: 18,
    },
    emptyNote: {
      ...typography.caption,
      color: c.textMuted,
      fontStyle: 'italic',
    },
  }));

  if (!report || report.buckets.length === 0) {
    return null;
  }

  const contextualBuckets = report.buckets.filter((bucket) => bucket.context !== 'passive');
  const passiveBucket = report.buckets.find((bucket) => bucket.context === 'passive');

  return (
    <View style={styles.card}>
      <Text style={styles.title}>伴随式收听</Text>
      {!report.hasActivityData ? (
        <Text style={styles.emptyNote}>暂无运动数据，仅展示后台播放汇总</Text>
      ) : null}

      <View style={styles.bucketList}>
        {contextualBuckets.map((bucket) => {
          const accentKey = getContextMediaAccentKey(bucket.context);
          const accentColor = colors[accentKey];
          return (
            <View
              key={bucket.context}
              style={[
                styles.bucketRow,
                !isGhost && { borderColor: accentColor + '55', backgroundColor: accentColor + '12' },
              ]}>
              <View style={styles.bucketHeader}>
                <View style={styles.bucketLabelRow}>
                  {isGhost ? <View style={[styles.bucketDot, { backgroundColor: accentColor }]} /> : null}
                  <Text style={[styles.bucketLabel, !isGhost && { color: accentColor }]}>
                    {bucket.label}
                  </Text>
                </View>
                <Text style={styles.bucketSummary}>{formatContextMediaBucketSummary(bucket)}</Text>
              </View>
              {!compact
                ? bucket.topSegments.map((segment) => (
                    <Text key={`${segment.startTime}-${segment.appLabel}`} style={styles.segmentLine}>
                      {formatContextMediaSegmentLine(segment)}
                    </Text>
                  ))
                : null}
            </View>
          );
        })}

        {passiveBucket ? (
          <View
            style={[
              styles.bucketRow,
              !isGhost && {
                borderColor: colors.media + '55',
                backgroundColor: colors.media + '12',
              },
            ]}>
            <View style={styles.bucketHeader}>
              <View style={styles.bucketLabelRow}>
                {isGhost ? <View style={[styles.bucketDot, { backgroundColor: colors.media }]} /> : null}
                <Text style={[styles.bucketLabel, !isGhost && { color: colors.media }]}>
                  {passiveBucket.label}
                </Text>
              </View>
              <Text style={styles.bucketSummary}>{formatContextMediaBucketSummary(passiveBucket)}</Text>
            </View>
            {!compact
              ? passiveBucket.topSegments.map((segment) => (
                  <Text key={`${segment.startTime}-${segment.appLabel}`} style={styles.segmentLine}>
                    {formatContextMediaSegmentLine(segment)}
                  </Text>
                ))
              : null}
          </View>
        ) : null}
      </View>

      {report.hasActivityData && contextualBuckets.length > 0 && passiveBucket ? (
        <Text style={styles.hint}>
          {contextualBuckets.reduce((sum, bucket) => sum + bucket.segmentCount, 0)} 段行进/步行收听，
          {passiveBucket.segmentCount} 段纯后台
        </Text>
      ) : null}
    </View>
  );
}
