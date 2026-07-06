import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getGoalTypeLabel,
  type SessionGoalType,
} from '../analysis/sessionGoalAnalyzer';
import { getSessionMoodLabel } from '../analysis/sessionMoodAnalyzer';
import { formatDuration, formatTime } from '../analysis/sessionAnalyzer';
import type { DiarySessionEntry } from '../analysis/diarySessionBuilder';
import { EventTimelineItem } from './EventTimelineItem';
import { AppDwellBlockList } from './AppDwellBlockList';
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
  const { session, goal, mood, appPath, appBlocks } = entry;
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
  const flowLineColor = colors.accent;

  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      opacity: cardOpacity,
    },
    timeline: {
      width: 28,
      alignItems: 'center',
      paddingTop: spacing.sm,
    },
    flowLine: {
      width: 3,
      flex: 1,
      borderRadius: 2,
      backgroundColor: flowLineColor,
      marginTop: spacing.xs,
      minHeight: 24,
    },
    segmentAnchor: {
      width: 8,
      height: 2,
      borderRadius: 1,
      backgroundColor: c.border,
      opacity: 0.45,
    },
    segmentLine: {
      flex: 1,
      width: 1,
      borderLeftWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.borderLight,
      opacity: 0.55,
      marginTop: spacing.xs,
      minHeight: 20,
    },
    wanderingAnchor: {
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.warning + '88',
      backgroundColor: c.warning + '22',
    },
    wanderingLine: {
      flex: 1,
      width: 1,
      borderLeftWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.warning + '55',
      marginTop: spacing.xs,
      minHeight: 20,
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
    headerMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      minWidth: 0,
    },
    expandIcon: {
      marginLeft: 'auto',
      opacity: 0.35,
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
      ...typography.mono,
    },
    summary: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 20,
    },
    rawPathSection: {
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    rawPathLabel: {
      ...typography.label,
      color: c.textMuted,
      fontSize: 10,
      letterSpacing: 0.5,
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
      fontSize: 10,
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

  const renderTimelineAxis = () => {
    if (isFlow) {
      return (
        <>
          {!isLast || expanded ? <View style={styles.flowLine} /> : null}
        </>
      );
    }
    if (isWandering) {
      return (
        <>
          <View style={styles.wanderingAnchor} />
          {!isLast || expanded ? <View style={styles.wanderingLine} /> : null}
        </>
      );
    }
    return (
      <>
        <View style={styles.segmentAnchor} />
        {!isLast || expanded ? <View style={styles.segmentLine} /> : null}
      </>
    );
  };

  return (
    <View style={styles.row}>
      <View style={styles.timeline}>{renderTimelineAxis()}</View>

      <View style={styles.content}>
        <Pressable
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded }}>
          <View style={styles.header}>
            <View style={styles.headerMain}>
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
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textMuted}
              style={styles.expandIcon}
            />
          </View>

          <Text style={styles.summary}>{goal.summary}</Text>

          {appBlocks.length > 0 ? (
            <AppDwellBlockList
              blocks={appBlocks}
              iconSize={isFlow ? 26 : 24}
              compact={isWandering && appBlocks.length > 4}
              maxVisible={isWandering && appBlocks.length > 6 ? 5 : undefined}
            />
          ) : null}

          {expanded ? (
            <View style={styles.expandedSection}>
              {appPath.length > 1 ? (
                <View style={styles.rawPathSection}>
                  <Text style={styles.rawPathLabel}>切换路径</Text>
                  <View style={styles.appPath}>
                    {appPath.map((app, index) => (
                      <React.Fragment key={`${app.packageName}-${index}`}>
                        {index > 0 ? <Text style={styles.arrow}>→</Text> : null}
                        <AppIconBadge
                          packageName={app.packageName}
                          appLabel={app.appLabel}
                          size={20}
                        />
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              ) : null}
              {session.events.map((event, index) => (
                <EventTimelineItem
                  key={String(event.id ?? `${event.timestamp}-${event.type}-${index}`)}
                  event={event}
                  contextEvents={session.events}
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
