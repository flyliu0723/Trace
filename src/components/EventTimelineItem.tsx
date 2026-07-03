import React from 'react';
import { Text, View } from 'react-native';
import { resolveMediaContextLabel } from '../analysis/contextMediaAnalyzer';
import { classifyApp, getCategoryColor } from '../analysis/appClassifier';
import { formatTime, formatMediaSubtitle } from '../analysis/sessionAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useAppDisplay } from '../hooks/useAppDisplay';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { AppIconBadge } from './HourlyAppRow';
import type { BehaviorEvent } from '../types/event';
import { radius, spacing, typography } from '../theme';

const EVENT_LABELS: Record<BehaviorEvent['type'], string> = {
  unlock: '解锁',
  screen_off: '锁屏',
  app_foreground: '打开',
  app_background: '后台',
  media_start: '播放',
  media_track_change: '切集',
  media_pause: '暂停',
  media_stop: '停止',
  activity_change: '运动',
  posture_change: '姿态',
};

const EVENT_ICONS: Record<BehaviorEvent['type'], string> = {
  unlock: '解',
  screen_off: '锁',
  app_foreground: '开',
  app_background: '退',
  media_start: '播',
  media_track_change: '集',
  media_pause: '停',
  media_stop: '止',
  activity_change: '动',
  posture_change: '姿',
};

const ACTIVITY_LABELS: Record<string, string> = {
  WALKING: '步行',
  RUNNING: '跑步',
  STILL: '静止',
  IN_VEHICLE: '乘车',
  ON_FOOT: '步行',
  ON_BICYCLE: '骑行',
  UNKNOWN: '未知',
};

const POSTURE_LABELS: Record<string, string> = {
  lying: '躺卧',
  handheld: '手持',
  on_surface: '放置',
};

function formatContextSubtitle(event: BehaviorEvent): string | null {
  if (event.type === 'activity_change' && event.metadata?.activity) {
    const label = ACTIVITY_LABELS[event.metadata.activity] ?? event.metadata.activity;
    return `检测到${label}`;
  }
  if (event.type === 'posture_change' && event.metadata?.posture) {
    const label = POSTURE_LABELS[event.metadata.posture] ?? event.metadata.posture;
    return `检测到${label}姿态`;
  }
  return null;
}

const MEDIA_EVENT_TYPES = new Set<BehaviorEvent['type']>([
  'media_start',
  'media_track_change',
  'media_pause',
  'media_stop',
]);

interface EventTimelineItemProps {
  event: BehaviorEvent;
  isLast?: boolean;
  /** 用于推断媒体事件的行进/步行上下文 */
  contextEvents?: BehaviorEvent[];
}

export function EventTimelineItem({ event, isLast = false, contextEvents }: EventTimelineItemProps) {
  const { colors } = useTheme();

  const mediaContextLabel =
    contextEvents && MEDIA_EVENT_TYPES.has(event.type)
      ? resolveMediaContextLabel(contextEvents, event.timestamp)
      : null;

  const EVENT_COLORS: Record<BehaviorEvent['type'], string> = {
    unlock: colors.unlock,
    screen_off: colors.screenOff,
    app_foreground: colors.appForeground,
    app_background: colors.textMuted,
    media_start: mediaContextLabel === '行进中' ? colors.accent : mediaContextLabel === '步行中' ? colors.quickSession : colors.media,
    media_track_change: mediaContextLabel === '行进中' ? colors.accent : mediaContextLabel === '步行中' ? colors.quickSession : colors.media,
    media_stop: mediaContextLabel === '行进中' ? colors.accent : mediaContextLabel === '步行中' ? colors.quickSession : colors.media,
    media_pause: mediaContextLabel === '行进中' ? colors.accent : mediaContextLabel === '步行中' ? colors.quickSession : colors.media,
    activity_change: colors.quickSession,
    posture_change: colors.warning,
  };

  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      minHeight: 64,
    },
    timeline: {
      width: 36,
      alignItems: 'center',
    },
    anchor: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      backgroundColor: c.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anchorIcon: {
      fontSize: 11,
      fontWeight: '700',
    },
    dashedLine: {
      flex: 1,
      width: 1,
      borderLeftWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border,
      marginVertical: 4,
    },
    content: {
      flex: 1,
      paddingBottom: spacing.lg,
      paddingLeft: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    time: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontSize: 15,
      ...typography.mono,
    },
    capsule: {
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
    },
    capsuleText: {
      ...typography.label,
      fontWeight: '600',
    },
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    appName: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '500',
      flex: 1,
    },
    contextBadge: {
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
    },
    contextBadgeText: {
      ...typography.label,
      fontSize: 10,
      fontWeight: '600',
    },
    mediaSubtitle: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 2,
      fontStyle: 'italic',
    },
  }));

  const accent = EVENT_COLORS[event.type];
  const mediaSubtitle = formatMediaSubtitle(event);
  const contextSubtitle = formatContextSubtitle(event);
  const hasApp = Boolean(event.appLabel || event.packageName);
  const { displayLabel } = useAppDisplay(event.packageName, event.appLabel);
  const appCategory = hasApp ? classifyApp(event.packageName, displayLabel) : null;
  const categoryColor = appCategory ? getCategoryColor(appCategory) : null;

  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <View style={[styles.anchor, { borderColor: accent }]}>
          <Text style={[styles.anchorIcon, { color: accent }]}>{EVENT_ICONS[event.type]}</Text>
        </View>
        {!isLast ? <View style={styles.dashedLine} /> : null}
      </View>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.time}>{formatTime(event.timestamp)}</Text>
          <View style={[styles.capsule, { backgroundColor: accent + '22', borderColor: accent + '44' }]}>
            <Text style={[styles.capsuleText, { color: accent }]}>{EVENT_LABELS[event.type]}</Text>
          </View>
          {mediaContextLabel ? (
            <View
              style={[
                styles.contextBadge,
                {
                  backgroundColor: accent + '18',
                  borderColor: accent + '44',
                },
              ]}>
              <Text style={[styles.contextBadgeText, { color: accent }]}>{mediaContextLabel}</Text>
            </View>
          ) : null}
        </View>
        {hasApp ? (
          <View style={styles.appRow}>
            <AppIconBadge packageName={event.packageName} appLabel={event.appLabel} size={24} />
            <Text style={[styles.appName, categoryColor ? { color: categoryColor } : undefined]}>
              {displayLabel}
            </Text>
          </View>
        ) : null}
        {mediaSubtitle ? <Text style={styles.mediaSubtitle}>{mediaSubtitle}</Text> : null}
        {!mediaSubtitle && contextSubtitle ? (
          <Text style={styles.mediaSubtitle}>{contextSubtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}
