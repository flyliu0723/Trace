import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type {
  ContextMediaBucket,
  ContextMediaSegment,
  DailyContextMediaReport,
  MediaListeningContext,
} from '../analysis/contextMediaAnalyzer';
import {
  formatContextMediaBucketSummary,
} from '../analysis/contextMediaAnalyzer';
import { formatDuration, formatTime } from '../analysis/sessionAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';
import { AppIconBadge } from './HourlyAppRow';

interface ContextMediaCardProps {
  report: DailyContextMediaReport | null;
  compact?: boolean;
  variant?: 'card' | 'ghost';
  onReportPress?: () => void;
}

const CONTEXT_BADGE: Record<MediaListeningContext, { bg: string; text: string; icon: string }> = {
  in_vehicle: { bg: '#E8EDF9', text: '#4A69BB', icon: 'car-outline' },
  walking: { bg: '#F5EDE8', text: '#9A6B4A', icon: 'walk-outline' },
  passive: { bg: '#E5EDE8', text: '#4A7A5E', icon: 'headset-outline' },
};

interface SegmentRowProps {
  segment: ContextMediaSegment;
  compact?: boolean;
}

function SegmentRow({ segment, compact }: SegmentRowProps) {
  const styles = useThemedStyles(({ colors }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    body: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    meta: {
      fontSize: 11,
      color: colors.labelSecondary,
      ...typography.mono,
    },
    appName: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    title: {
      fontSize: 12,
      color: colors.textMuted,
      lineHeight: 17,
    },
    duration: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.statInk,
      ...typography.mono,
    },
    trackPill: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.labelSecondary,
      paddingHorizontal: 0,
      paddingVertical: 2,
      alignSelf: 'flex-start',
    },
  }));

  return (
    <View style={styles.row}>
      <AppIconBadge
        packageName={segment.packageName}
        appLabel={segment.appLabel}
        size={compact ? 28 : 32}
      />
      <View style={styles.body}>
        <Text style={styles.meta}>{formatTime(segment.startTime)}</Text>
        <Text style={styles.appName} numberOfLines={1}>
          {segment.appLabel}
        </Text>
        {segment.title ? (
          <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
            {segment.title}
          </Text>
        ) : null}
        {segment.trackCount > 1 ? (
          <Text style={styles.trackPill}>{segment.trackCount} 集连播</Text>
        ) : null}
        {segment.pauseCount && segment.pauseCount > 0 ? (
          <Text style={styles.trackPill}>暂停 {segment.pauseCount} 次</Text>
        ) : null}
      </View>
      <Text style={styles.duration}>{formatDuration(segment.durationMs)}</Text>
    </View>
  );
}

interface BucketBlockProps {
  bucket: ContextMediaBucket;
  compact?: boolean;
  isDark: boolean;
}

function BucketBlock({ bucket, compact, isDark }: BucketBlockProps) {
  const badge = CONTEXT_BADGE[bucket.context];

  const styles = useThemedStyles(({ colors }) => ({
    block: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: isDark ? badge.text + '22' : badge.bg,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: badge.text,
    },
    summary: {
      fontSize: 11,
      color: colors.labelSecondary,
      ...typography.mono,
      flexShrink: 1,
      textAlign: 'right',
    },
    divider: {
      height: 1,
      backgroundColor: colors.ghostBorder,
    },
    segmentList: {
      gap: 2,
    },
  }));

  return (
    <View style={styles.block}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={styles.badge}>
            <Ionicons name={badge.icon} size={12} color={badge.text} />
            <Text style={styles.badgeText}>{bucket.label}</Text>
          </View>
        </View>
        <Text style={styles.summary} numberOfLines={2}>
          {formatContextMediaBucketSummary(bucket)}
        </Text>
      </View>
      {!compact && bucket.topSegments.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.segmentList}>
            {bucket.topSegments.map((segment) => (
              <SegmentRow
                key={`${segment.startTime}-${segment.appLabel}-${segment.title ?? ''}`}
                segment={segment}
                compact={compact}
              />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

export function ContextMediaCard({
  report,
  compact = false,
  variant = 'card',
  onReportPress,
}: ContextMediaCardProps) {
  const { colors, isDark } = useTheme();
  const isGhost = variant === 'ghost';

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: isGhost ? spacing.xl : spacing.md,
      gap: spacing.sm,
      ...shadows.elevatedSubtle,
      ...(isDark && !isGhost ? { borderWidth: 1, borderColor: c.borderLight } : {}),
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerIcon: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      backgroundColor: c.media + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...(isGhost ? typography.caption : typography.subtitle),
      color: isGhost ? c.labelSecondary : c.textPrimary,
      fontWeight: '600',
      letterSpacing: isGhost ? 0.8 : 0,
      textTransform: isGhost ? 'uppercase' : 'none',
      flex: 1,
    },
    activityHint: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.ghostBorder,
      borderStyle: 'dashed',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    activityHintText: {
      ...typography.caption,
      color: c.textMuted,
      lineHeight: 20,
      flex: 1,
    },
    bucketList: {
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.ghostBorder,
      paddingTop: spacing.sm,
    },
    footerHint: {
      ...typography.caption,
      color: c.labelSecondary,
      lineHeight: 18,
    },
    reportLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: spacing.xs,
    },
    reportLinkText: {
      ...typography.label,
      color: c.media,
      fontWeight: '600',
    },
  }));

  if (!report || report.buckets.length === 0) {
    return null;
  }

  const contextualBuckets = report.buckets.filter((bucket) => bucket.context !== 'passive');
  const passiveBucket = report.buckets.find((bucket) => bucket.context === 'passive');
  const orderedBuckets = [
    ...contextualBuckets,
    ...(passiveBucket ? [passiveBucket] : []),
  ];

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="headset-outline" size={15} color={colors.media} />
        </View>
        <Text style={styles.title}>伴随式收听</Text>
      </View>

      {!report.hasActivityData ? (
        <View style={styles.activityHint}>
          <Ionicons name="footsteps-outline" size={16} color={colors.labelSecondary} />
          <Text style={styles.activityHintText}>
            步行与行进场景通过计步传感器识别（无需 Google）。若仍无数据，请确认监控服务在运行。
          </Text>
        </View>
      ) : null}

      <View style={styles.bucketList}>
        {orderedBuckets.map((bucket) => (
          <BucketBlock
            key={bucket.context}
            bucket={bucket}
            compact={compact}
            isDark={isDark}
          />
        ))}
      </View>

      {report.hasActivityData && contextualBuckets.length > 0 && passiveBucket ? (
        <Text style={styles.footerHint}>
          {contextualBuckets.reduce((sum, bucket) => sum + bucket.segmentCount, 0)} 段行进/步行收听，
          {passiveBucket.segmentCount} 段纯后台
        </Text>
      ) : null}

      {onReportPress ? (
        <Pressable style={styles.reportLink} onPress={onReportPress} hitSlop={8}>
          <Text style={styles.reportLinkText}>查看收听报告</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.media} />
        </Pressable>
      ) : null}
    </View>
  );
}
