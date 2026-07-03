import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HourlyAppSlot } from '../analysis/hourlyAnalyzer';
import { classifyApp, getCategoryColor } from '../analysis/appClassifier';
import { HIGH_HOURLY_SWITCH_THRESHOLD, HOUR_MS } from '../constants';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { formatDuration } from '../analysis/sessionAnalyzer';
import { radius, spacing, typography } from '../theme';
import { AppIconBadge } from './HourlyAppRow';

interface HourGridCellProps {
  slot: HourlyAppSlot;
  switchCount: number;
  onPress: () => void;
  onLongPress: () => void;
}

export function HourGridCell({ slot, switchCount, onPress, onLongPress }: HourGridCellProps) {
  const { colors } = useTheme();
  const displayLabel = slot.appLabel ?? slot.longDwells[0]?.appLabel;
  const displayPackage = slot.packageName ?? slot.longDwells[0]?.packageName;
  const hasLongDwell = slot.longDwells.length > 0;
  const isHighSwitch = switchCount >= HIGH_HOURLY_SWITCH_THRESHOLD;
  const fillRatio = Math.min(1, slot.durationMs / HOUR_MS);
  const hasUsage = fillRatio > 0 || slot.openCount > 0;
  const categoryColor = displayLabel
    ? getCategoryColor(classifyApp(displayPackage, displayLabel))
    : colors.accent;

  const styles = useThemedStyles(({ colors: c }) => ({
    cell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surfaceElevated,
      overflow: 'hidden',
      position: 'relative',
    },
    cellLongDwell: {
      borderColor: c.warning + '55',
      shadowColor: c.warning,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
      elevation: 1,
    },
    cellHighSwitch: {
      borderWidth: 1,
      borderColor: c.quickSession + '66',
      borderStyle: 'dashed' as const,
    },
    fill: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    content: {
      ...StyleSheetAbsoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    durationLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: c.textSecondary,
    },
    switchBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 13,
      height: 13,
      borderRadius: 7,
      paddingHorizontal: 2,
      backgroundColor: c.quickSession,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2,
    },
    switchBadgeText: {
      fontSize: 8,
      fontWeight: '700',
      color: c.onAccent,
      lineHeight: 11,
    },
    pressed: {
      opacity: 0.75,
    },
  }));

  const fillPercent = Math.max(fillRatio * 100, hasUsage && fillRatio === 0 ? 8 : 0);
  const fillColor = categoryColor + (fillRatio > 0.5 ? 'BB' : '77');
  const durationMinutes = Math.round(slot.durationMs / 60_000);
  const showDurationLabel = durationMinutes > 0 && !displayLabel;

  const accessibilityLabel = hasUsage
    ? `${slot.hour}时，使用 ${formatDuration(slot.durationMs)}${isHighSwitch ? `，切换 ${switchCount} 次` : ''}${hasLongDwell ? '，有长时间停留' : ''}`
    : `${slot.hour}时，无使用记录`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.cell,
        hasLongDwell && styles.cellLongDwell,
        isHighSwitch && !hasLongDwell && styles.cellHighSwitch,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={accessibilityLabel}>
      {fillRatio > 0 ? (
        <View
          style={[
            styles.fill,
            {
              height: `${fillPercent}%` as `${number}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      ) : null}
      <View style={styles.content} pointerEvents="none">
        {displayLabel ? (
          <AppIconBadge packageName={displayPackage} appLabel={displayLabel} size={26} />
        ) : showDurationLabel ? (
          <Text style={styles.durationLabel}>{durationMinutes}分</Text>
        ) : null}
      </View>
      {isHighSwitch ? (
        <View style={styles.switchBadge}>
          <Text style={styles.switchBadgeText}>{switchCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

interface HourGridLegendProps {
  compact?: boolean;
}

export function HourGridLegend({ compact = false }: HourGridLegendProps) {
  const styles = useThemedStyles(({ colors: c }) => ({
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: compact ? 0 : spacing.md,
      paddingTop: compact ? spacing.sm : 0,
      borderTopWidth: compact ? 1 : 0,
      borderTopColor: c.borderLight,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    sampleCell: {
      width: 14,
      height: 14,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surfaceElevated,
      overflow: 'hidden',
    },
    sampleFill: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '60%',
      backgroundColor: c.accent + '88',
    },
    sampleGlow: {
      width: 14,
      height: 14,
      borderRadius: 3,
      borderWidth: 1,
      borderColor: c.warning + '55',
    },
    sampleBadge: {
      minWidth: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.quickSession,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sampleBadgeText: {
      fontSize: 7,
      fontWeight: '700',
      color: c.onAccent,
    },
    text: {
      ...typography.label,
      color: c.textMuted,
      fontSize: 11,
    },
  }));

  return (
    <View style={styles.legend}>
      <View style={styles.item}>
        <View style={styles.sampleCell}>
          <View style={styles.sampleFill} />
        </View>
        <Text style={styles.text}>底部填充 = 使用时长</Text>
      </View>
      <View style={styles.item}>
        <View style={styles.sampleBadge}>
          <Text style={styles.sampleBadgeText}>3</Text>
        </View>
        <Text style={styles.text}>角标 = 切换次数</Text>
      </View>
      <View style={styles.item}>
        <View style={styles.sampleGlow} />
        <Text style={styles.text}>金边 = 停留 ≥5 分</Text>
      </View>
    </View>
  );
}
