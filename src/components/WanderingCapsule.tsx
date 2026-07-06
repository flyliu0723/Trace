import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import type { WanderingEpisode } from '../analysis/wanderingViewBuilder';
import { formatDuration, formatTime } from '../analysis/sessionAnalyzer';
import { WANDERING_SHAKE_SWITCH_THRESHOLD } from '../constants';
import { AppDwellBlockList } from './AppDwellBlockList';
import { AppIconBadge } from './HourlyAppRow';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface WanderingCapsuleProps {
  episode: WanderingEpisode;
  onViewDiary?: () => void;
}

export function WanderingCapsule({ episode, onViewDiary }: WanderingCapsuleProps) {
  const { colors } = useTheme();
  const shouldShake = episode.switchCount >= WANDERING_SHAKE_SWITCH_THRESHOLD;
  const iconSize = episode.switchCount >= 5 ? 18 : 22;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!shouldShake) {
      return;
    }

    const shakeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
        Animated.delay(2200),
      ]),
    );

    shakeLoop.start();

    return () => {
      shakeLoop.stop();
    };
  }, [shakeAnim, shouldShake]);

  const translateX = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-1.5, 1.5],
  });

  const styles = useThemedStyles(({ colors: c }) => ({
    animatedWrap: {
      borderRadius: radius.lg,
    },
    capsule: {
      borderRadius: radius.lg,
      borderWidth: shouldShake ? 0 : episode.switchCount >= 5 ? 1 : 1.5,
      borderStyle: episode.switchCount >= 5 ? 'dashed' : 'solid',
      borderColor: c.warning + '66',
      backgroundColor: c.warning + '18',
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
      fontSize: 14,
      ...typography.mono,
    },
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      backgroundColor: c.warning + '33',
    },
    badgeText: {
      ...typography.label,
      color: c.warning,
      fontWeight: '600',
    },
    repeatBadge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      backgroundColor: c.danger + '22',
    },
    repeatBadgeText: {
      ...typography.label,
      color: c.danger,
      fontWeight: '600',
    },
    duration: {
      ...typography.label,
      color: c.textMuted,
      marginLeft: 'auto',
      ...typography.mono,
    },
    meta: {
      ...typography.label,
      color: c.textMuted,
    },
    sting: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 18,
    },
    link: {
      ...typography.label,
      color: c.accent,
      alignSelf: 'flex-end',
    },
  }));

  const endLabel = episode.endTime > episode.startTime ? formatTime(episode.endTime) : null;

  const content = (
    <View style={styles.capsule}>
      <View style={styles.header}>
        <Text style={styles.timeRange}>
          {formatTime(episode.startTime)}
          {endLabel ? ` — ${endLabel}` : ''}
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>游离</Text>
        </View>
        {episode.isRepeatedPath ? (
          <View style={styles.repeatBadge}>
            <Text style={styles.repeatBadgeText}>昨日重现</Text>
          </View>
        ) : null}
        <Text style={styles.duration}>{formatDuration(episode.durationMs)}</Text>
      </View>

      {episode.appBlocks.length > 0 ? (
        <AppDwellBlockList
          blocks={episode.appBlocks}
          iconSize={iconSize}
          compact
          maxVisible={episode.switchCount >= 5 ? 4 : undefined}
        />
      ) : episode.apps.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {episode.apps.map((app) => (
            <AppIconBadge
              key={app.packageName}
              packageName={app.packageName}
              appLabel={app.appLabel}
              size={iconSize}
            />
          ))}
        </View>
      ) : null}

      <Text style={styles.meta}>切换 {episode.switchCount} 次</Text>
      <Text style={styles.sting}>{episode.stingLine}</Text>

      {onViewDiary ? (
        <Pressable onPress={onViewDiary} hitSlop={8}>
          <Text style={styles.link}>查看完整会话 →</Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (!shouldShake) {
    return content;
  }

  return (
    <Animated.View
      style={[
        styles.animatedWrap,
        {
          transform: [{ translateX }],
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: colors.warning + 'AA',
        },
      ]}>
      {content}
    </Animated.View>
  );
}
