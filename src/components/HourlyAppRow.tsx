import React from 'react';
import { Image, Text, View } from 'react-native';
import type { HourlyLongDwell } from '../analysis/hourlyAnalyzer';
import { formatHourlyUsageLine, formatLongDwellLine } from '../analysis/hourlyAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useAppDisplay } from '../hooks/useAppDisplay';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { getAppVisual } from '../utils/appVisual';
import { radius, spacing, typography } from '../theme';

interface AppIconBadgeProps {
  packageName?: string;
  appLabel?: string;
  size?: number;
  floating?: boolean;
}

export function AppIconBadge({
  packageName,
  appLabel,
  size = 36,
  floating = false,
}: AppIconBadgeProps) {
  const { displayLabel, iconUri } = useAppDisplay(packageName, appLabel);
  const visual = getAppVisual(packageName, displayLabel, size);

  const badgeStyles = useThemedStyles(({ isDark }) => ({
    badge: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      overflow: 'hidden',
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.15,
      shadowRadius: 6,
      elevation: 5,
    },
    emoji: {
      textAlign: 'center',
    },
  }));

  return (
    <View
      style={[
        badgeStyles.badge,
        floating && badgeStyles.floating,
        {
          width: size,
          height: size,
          borderRadius: iconUri ? size / 4.5 : visual.borderRadius,
          backgroundColor: iconUri ? 'transparent' : visual.tint + '33',
          borderColor: iconUri ? 'transparent' : visual.tint + '66',
        },
      ]}>
      {iconUri ? (
        <Image
          source={{ uri: iconUri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 4.5,
          }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[badgeStyles.emoji, { fontSize: size * 0.45 }]}>
          {visual.emoji || visual.initial}
        </Text>
      )}
    </View>
  );
}

interface HourlyAppRowProps {
  hour: number;
  packageName?: string;
  appLabel?: string;
  openCount?: number;
  durationMs?: number;
  maxDurationMs?: number;
  longDwells?: HourlyLongDwell[];
  isEmpty?: boolean;
}

export function HourlyAppRow({
  hour,
  packageName,
  appLabel,
  openCount = 0,
  durationMs = 0,
  maxDurationMs = 1,
  longDwells = [],
  isEmpty = false,
}: HourlyAppRowProps) {
  const { colors } = useTheme();
  const { displayLabel } = useAppDisplay(packageName, appLabel);
  const hourLabel = `${String(hour).padStart(2, '0')}:00`;
  const barRatio = isEmpty ? 0 : durationMs / Math.max(maxDurationMs, 1);
  const categoryColor = isEmpty
    ? undefined
    : getAppVisual(packageName, displayLabel, 32).tint;
  const usageLine = formatHourlyUsageLine(openCount, durationMs);
  const hasLongDwell = longDwells.length > 0;

  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    hour: {
      width: 48,
      paddingTop: 14,
      ...typography.label,
      color: c.textMuted,
      ...typography.mono,
    },
    track: {
      flex: 1,
      position: 'relative',
      minHeight: hasLongDwell ? 72 : 48,
      justifyContent: 'center',
    },
    bar: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderRadius: radius.md,
      maxWidth: '100%',
    },
    content: {
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      zIndex: 1,
    },
    mainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyLabel: {
      ...typography.caption,
      color: c.textMuted,
      fontStyle: 'italic',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    appInfo: {
      flex: 1,
    },
    appLabel: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '500',
    },
    usageLine: {
      ...typography.label,
      color: c.textMuted,
      marginTop: 2,
    },
    dwellBlock: {
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: c.border,
      gap: 4,
    },
    dwellLabel: {
      ...typography.label,
      color: c.warning,
      fontWeight: '600',
    },
    dwellLine: {
      ...typography.label,
      color: c.textSecondary,
      lineHeight: 18,
    },
  }));

  return (
    <View style={styles.row}>
      <Text style={styles.hour}>{hourLabel}</Text>
      <View style={styles.track}>
        <View
          style={[
            styles.bar,
            {
              width: `${Math.max(barRatio * 100, isEmpty ? 4 : 12)}%`,
              backgroundColor: isEmpty ? colors.border : (categoryColor ?? colors.border) + '88',
            },
          ]}
        />
        <View style={styles.content}>
          {isEmpty ? (
            <Text style={styles.emptyLabel}>安静时刻</Text>
          ) : (
            <>
              <View style={styles.mainRow}>
                <AppIconBadge
                  packageName={packageName}
                  appLabel={appLabel}
                  size={32}
                  floating
                />
                <View style={styles.appInfo}>
                  <Text style={styles.appLabel} numberOfLines={1}>
                    {displayLabel}
                  </Text>
                  {usageLine ? <Text style={styles.usageLine}>{usageLine}</Text> : null}
                </View>
              </View>
              {hasLongDwell ? (
                <View style={styles.dwellBlock}>
                  <Text style={styles.dwellLabel}>长时间停留</Text>
                  {longDwells.map((dwell) => (
                    <Text key={`${dwell.packageName}-${dwell.startTime}`} style={styles.dwellLine}>
                      {formatLongDwellLine(dwell)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
