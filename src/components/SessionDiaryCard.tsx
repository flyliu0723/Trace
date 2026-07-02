import React from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  getGoalTypeLabel,
  type SessionGoalType,
} from '../analysis/sessionGoalAnalyzer';
import { getSessionMoodLabel } from '../analysis/sessionMoodAnalyzer';
import { formatDuration, formatTime } from '../analysis/sessionAnalyzer';
import type { DiarySessionEntry } from '../analysis/diarySessionBuilder';
import { EventTimelineItem } from './EventTimelineItem';
import { AppIconBadge } from './HourlyAppRow';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface SessionDiaryCardProps {
  entry: DiarySessionEntry;
  expanded: boolean;
  onToggle: () => void;
  onWanderingPress?: () => void;
  isLast?: boolean;
}

const MUTED_GOAL_TYPES = new Set<SessionGoalType>(['quick_glance', 'idle']);

export function SessionDiaryCard({
  entry,
  expanded,
  onToggle,
  onWanderingPress,
  isLast = false,
}: SessionDiaryCardProps) {
  const { colors } = useTheme();
  const { session, goal, mood, appPath } = entry;
  const isMuted = MUTED_GOAL_TYPES.has(goal.goalType) && mood.mood !== 'wandering';
  const isWandering = mood.mood === 'wandering';
  const isFlow = mood.mood === 'flow';

  const GOAL_COLORS: Record<SessionGoalType, string> = {
    productive: colors.success,
    entertainment: colors.quickSession,
    quick_glance: colors.textMuted,
    mixed: colors.accent,
    passive_media: colors.media,
    idle: colors.screenOff,
  };

  const moodAccent = isWandering
    ? colors.warning
    : isFlow
      ? colors.accent
      : GOAL_COLORS[goal.goalType];

  const accent = moodAccent;
  const borderColor = isWandering
    ? colors.warning + '55'
    : isMuted
      ? colors.borderLight
      : accent + '55';
  const cardBackground = isWandering ? colors.warning + '14' : colors.surfaceElevated;
  const cardOpacity = isMuted ? 0.82 : 1;
  const anchorLabel = isFlow ? '流' : isWandering ? '离' : '段';

  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      opacity: cardOpacity,
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
      borderColor: accent,
      backgroundColor: c.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anchorText: {
      fontSize: 10,
      fontWeight: '700',
      color: accent,
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
    card: {
      borderRadius: radius.md,
      borderWidth: isMuted ? 1 : 1.5,
      borderColor,
      backgroundColor: cardBackground,
      padding: spacing.md,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    timeRange: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontSize: 15,
      ...typography.mono,
    },
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
      backgroundColor: accent + '22',
    },
    badgeText: {
      ...typography.label,
      fontWeight: '600',
      color: accent,
    },
    moodBadge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      backgroundColor: isWandering ? c.warning + '33' : c.borderLight,
    },
    moodBadgeText: {
      ...typography.label,
      color: isWandering ? c.warning : c.textMuted,
      fontWeight: isWandering ? '600' : '400',
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
    appPath: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    arrow: {
      ...typography.label,
      color: c.textMuted,
      marginHorizontal: 2,
    },
    expandHint: {
      ...typography.label,
      color: c.textMuted,
    },
    expandedSection: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      gap: 0,
    },
  }));

  const endTimeLabel =
    session.endTime > session.startTime ? formatTime(session.endTime) : null;

  const moodBadge = (
    <Pressable
      onPress={isWandering ? onWanderingPress : undefined}
      disabled={!isWandering || !onWanderingPress}
      hitSlop={8}>
      <View style={styles.moodBadge}>
        <Text style={styles.moodBadgeText}>{getSessionMoodLabel(mood.mood)}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <View style={styles.anchor}>
          <Text style={styles.anchorText}>{anchorLabel}</Text>
        </View>
        {!isLast || expanded ? <View style={styles.dashedLine} /> : null}
      </View>

      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}>
          <View style={styles.header}>
            <Text style={styles.timeRange}>
              {formatTime(goal.startTime)}
              {endTimeLabel ? ` — ${endTimeLabel}` : ''}
            </Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{getGoalTypeLabel(goal.goalType)}</Text>
            </View>
            {(isWandering || isFlow) ? moodBadge : null}
            <Text style={styles.duration}>{formatDuration(goal.durationMs)}</Text>
          </View>

          {appPath.length > 0 ? (
            <>
              <View style={styles.appPath}>
                {appPath.map((app, index) => (
                  <React.Fragment key={`${app.packageName}-${index}`}>
                    {index > 0 ? <Text style={styles.arrow}>→</Text> : null}
                    <AppIconBadge
                      packageName={app.packageName}
                      appLabel={app.appLabel}
                      size={isFlow ? 26 : 22}
                    />
                  </React.Fragment>
                ))}
              </View>
              <Text style={styles.summary}>{goal.summary}</Text>
            </>
          ) : (
            <Text style={styles.summary}>{goal.summary}</Text>
          )}

          <Text style={styles.expandHint}>{expanded ? '收起详情' : '点击查看原始事件'}</Text>

          {expanded ? (
            <View style={styles.expandedSection}>
              {session.events.map((event, index) => (
                <EventTimelineItem
                  key={String(event.id ?? `${event.timestamp}-${event.type}-${index}`)}
                  event={event}
                  isLast={index === session.events.length - 1}
                />
              ))}
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
