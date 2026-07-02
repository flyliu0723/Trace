import React, { useCallback } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  UIManager,
  View,
} from 'react-native';
import type { WanderingBundle } from '../analysis/wanderingViewBuilder';
import { formatDuration, formatTime } from '../analysis/sessionAnalyzer';
import { WanderingCapsule } from './WanderingCapsule';
import { AppIconBadge } from './HourlyAppRow';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

if (
  Platform.OS === 'android'
  && UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface WanderingBundleBarProps {
  bundle: WanderingBundle;
  expanded: boolean;
  onToggle: () => void;
  onViewDiary?: (sessionId: string) => void;
}

export function WanderingBundleBar({
  bundle,
  expanded,
  onToggle,
  onViewDiary,
}: WanderingBundleBarProps) {
  const styles = useThemedStyles(({ colors: c }) => ({
    wrapper: {
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    bar: {
      borderRadius: radius.lg,
      borderWidth: 1.5,
      borderColor: c.warning + '55',
      backgroundColor: c.warning + '14',
      padding: spacing.md,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    title: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
      fontSize: 14,
    },
    meta: {
      ...typography.caption,
      color: c.textSecondary,
      ...typography.mono,
    },
    hint: {
      ...typography.label,
      color: c.textMuted,
    },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    arrow: {
      ...typography.label,
      color: c.textMuted,
      fontSize: 10,
    },
    episodes: {
      gap: spacing.sm,
      paddingTop: spacing.xs,
    },
  }));

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  }, [onToggle]);

  const rangeLabel = `${formatTime(bundle.startTime)}–${formatTime(bundle.endTime)}`;

  return (
    <View style={styles.wrapper}>
      <Pressable
        style={({ pressed }) => [styles.bar, pressed && { opacity: 0.85 }]}
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}>
        <View style={styles.header}>
          <Text style={styles.title}>碎片化时间</Text>
          <Text style={styles.meta}>
            {rangeLabel} · {formatDuration(bundle.totalMs)}
          </Text>
        </View>
        <Text style={styles.meta}>
          {bundle.episodeCount} 段游离 · 切换 {bundle.switchCount} 次
        </Text>
        {bundle.previewApps.length > 0 ? (
          <View style={styles.preview}>
            {bundle.previewApps.map((app, index) => (
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
        ) : null}
        <Text style={styles.hint}>{expanded ? '▲ 收起' : '▼ 展开查看切换路径'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.episodes}>
          {bundle.episodes.map((episode) => (
            <WanderingCapsule
              key={episode.sessionId}
              episode={episode}
              onViewDiary={onViewDiary ? () => onViewDiary(episode.sessionId) : undefined}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
