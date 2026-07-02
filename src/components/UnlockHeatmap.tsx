import React from 'react';
import { Text, View } from 'react-native';
import {
  buildHourlyUnlockHeatmap,
  getHeatmapColor,
  getHeatmapOpacity,
  type DailyUnlockCell,
} from '../analysis/heatmapAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { BehaviorEvent } from '../types/event';
import { formatDisplayDate } from '../utils/dateUtils';
import { radius, spacing, typography } from '../theme';

interface UnlockHeatmapProps {
  events: BehaviorEvent[];
  weekData?: DailyUnlockCell[];
}

const RING_SIZE = 180;
const RING_DOT = 10;

export function UnlockHeatmap({ events, weekData = [] }: UnlockHeatmapProps) {
  const { colors } = useTheme();
  const hourlyCells = buildHourlyUnlockHeatmap(events);
  const maxHourly = Math.max(...hourlyCells.map((c) => c.count), 1);
  const maxDaily = Math.max(...weekData.map((c) => c.count), 1);

  const styles = useThemedStyles(({ colors: c }) => ({
    container: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    title: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    weekSection: {
      marginBottom: spacing.lg,
    },
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    weekCellWrap: {
      flex: 1,
      alignItems: 'center',
    },
    starField: {
      width: 36,
      height: 28,
      position: 'relative',
      marginBottom: spacing.xs,
    },
    star: {
      position: 'absolute',
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    weekLabel: {
      color: c.textMuted,
      fontSize: 10,
    },
    weekCount: {
      ...typography.label,
      color: c.textSecondary,
      marginTop: 2,
    },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignSelf: 'center',
      position: 'relative',
      marginVertical: spacing.md,
    },
    ringCenter: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: [{ translateX: -40 }, { translateY: -28 }],
      width: 80,
      alignItems: 'center',
    },
    ringCenterValue: {
      ...typography.statHero,
      fontSize: 36,
      color: c.textPrimary,
    },
    ringCenterLabel: {
      ...typography.label,
      color: c.textMuted,
    },
    ringDot: {
      position: 'absolute',
    },
    ringLegend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
    },
    legendText: {
      ...typography.label,
      color: c.textMuted,
      ...typography.mono,
    },
  }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>解锁</Text>

      {weekData.length > 0 ? (
        <View style={styles.weekSection}>
          <View style={styles.weekRow}>
            {weekData.map((cell) => {
              const starCount = Math.min(cell.count, 5);
              return (
                <View key={cell.date} style={styles.weekCellWrap}>
                  <View style={styles.starField}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.star,
                          {
                            backgroundColor: getHeatmapColor(cell.count, maxDaily, colors),
                            opacity: i < starCount ? getHeatmapOpacity(cell.count, maxDaily) : 0.08,
                            top: (i % 3) * 6 + 2,
                            left: (i % 2) * 8 + 4,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={styles.weekLabel} numberOfLines={1}>
                    {formatDisplayDate(cell.date).replace(/今天\s/, '').slice(0, 4)}
                  </Text>
                  <Text style={styles.weekCount}>{cell.count}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.ringWrap}>
        <View style={styles.ringCenter}>
          <Text style={styles.ringCenterValue}>
            {hourlyCells.reduce((sum, c) => sum + c.count, 0)}
          </Text>
          <Text style={styles.ringCenterLabel}>次</Text>
        </View>
        {hourlyCells.map((cell) => {
          const angle = (cell.hour / 24) * 2 * Math.PI - Math.PI / 2;
          const radiusPx = RING_SIZE / 2 - RING_DOT;
          const x = Math.cos(angle) * radiusPx + RING_SIZE / 2 - RING_DOT / 2;
          const y = Math.sin(angle) * radiusPx + RING_SIZE / 2 - RING_DOT / 2;
          const size = RING_DOT + (cell.count / maxHourly) * 6;
          const heatColor = getHeatmapColor(cell.count, maxHourly, colors);

          return (
            <View
              key={cell.hour}
              style={[
                styles.ringDot,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  left: x,
                  top: y,
                  backgroundColor: heatColor,
                  opacity: getHeatmapOpacity(cell.count, maxHourly),
                  ...(cell.count > 0
                    ? { shadowColor: heatColor, shadowOpacity: 0.6, shadowRadius: 4 }
                    : {}),
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.ringLegend}>
        <Text style={styles.legendText}>0时</Text>
        <Text style={styles.legendText}>6时</Text>
        <Text style={styles.legendText}>12时</Text>
        <Text style={styles.legendText}>18时</Text>
      </View>
    </View>
  );
}
