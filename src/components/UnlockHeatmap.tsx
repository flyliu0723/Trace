import React from 'react';
import { Text, View } from 'react-native';
import { buildHourlyUnlockHeatmap, type DailyUnlockCell } from '../analysis/heatmapAnalyzer';
import { GhostSection } from './GhostSection';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { BehaviorEvent } from '../types/event';
import { formatDisplayDate } from '../utils/dateUtils';
import { radius, spacing, tabularNums } from '../theme';

interface UnlockHeatmapProps {
  events: BehaviorEvent[];
  weekData?: DailyUnlockCell[];
}

const RING_SIZE = 148;
const RING_GUIDE_INSET = 18;
const BASE_DOT = 3;

export function UnlockHeatmap({ events, weekData = [] }: UnlockHeatmapProps) {
  const { colors } = useTheme();
  const hourlyCells = buildHourlyUnlockHeatmap(events);
  const totalUnlocks = hourlyCells.reduce((sum, cell) => sum + cell.count, 0);
  const maxHourly = Math.max(...hourlyCells.map((cell) => cell.count), 1);
  const maxDaily = Math.max(...weekData.map((cell) => cell.count), 1);

  const styles = useThemedStyles(({ colors: c }) => ({
    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      gap: spacing.sm,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.xs,
    },
    weekCell: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.sm,
    },
    capsuleTrack: {
      width: '100%',
      height: 36,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    capsule: {
      width: 6,
      borderRadius: 3,
      minHeight: 4,
    },
    weekLabel: {
      fontSize: 10,
      color: c.labelSecondary,
      fontWeight: '500',
    },
    ringWrap: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignSelf: 'center',
      position: 'relative',
      marginBottom: spacing.md,
    },
    ringGuide: {
      position: 'absolute',
      top: RING_GUIDE_INSET,
      left: RING_GUIDE_INSET,
      width: RING_SIZE - RING_GUIDE_INSET * 2,
      height: RING_SIZE - RING_GUIDE_INSET * 2,
      borderRadius: (RING_SIZE - RING_GUIDE_INSET * 2) / 2,
      borderWidth: 1,
      borderColor: c.ghostBorder,
      borderStyle: 'dashed',
    },
    ringCenter: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringValue: {
      fontSize: 28,
      fontWeight: '800',
      color: c.statInk,
      letterSpacing: -0.8,
      ...tabularNums,
    },
    ringUnit: {
      fontSize: 11,
      fontWeight: '500',
      color: c.labelSecondary,
      marginTop: 2,
      letterSpacing: 1,
    },
    ringDot: {
      position: 'absolute',
    },
    ringLegend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
    },
    legendText: {
      fontSize: 10,
      color: c.labelSecondary,
      fontWeight: '500',
      ...tabularNums,
    },
  }));

  const orbitRadius = RING_SIZE / 2 - RING_GUIDE_INSET - 2;

  return (
    <GhostSection title="解锁节律" subtitle="24 小时注意力触点">
      {weekData.length > 0 ? (
        <View style={styles.weekRow}>
          {weekData.map((cell) => {
            const ratio = maxDaily > 0 ? cell.count / maxDaily : 0;
            const barHeight = Math.max(4, ratio * 32);
            const active = cell.count > 0;
            return (
              <View key={cell.date} style={styles.weekCell}>
                <View style={styles.capsuleTrack}>
                  <View
                    style={[
                      styles.capsule,
                      {
                        height: barHeight,
                        backgroundColor: active ? colors.morandiUnlock : colors.heatEmpty,
                        opacity: active ? 0.72 + ratio * 0.28 : 1,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.weekLabel} numberOfLines={1}>
                  {formatDisplayDate(cell.date).replace(/今天\s/, '').slice(-2)}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.ringWrap}>
        <View style={styles.ringGuide} />
        <View style={styles.ringCenter}>
          <Text style={styles.ringValue}>{totalUnlocks}</Text>
          <Text style={styles.ringUnit}>次</Text>
        </View>
        {hourlyCells.map((cell) => {
          const angle = (cell.hour / 24) * 2 * Math.PI - Math.PI / 2;
          const dotSize = BASE_DOT + (cell.count / maxHourly) * 3;
          const x = Math.cos(angle) * orbitRadius + RING_SIZE / 2 - dotSize / 2;
          const y = Math.sin(angle) * orbitRadius + RING_SIZE / 2 - dotSize / 2;
          const active = cell.count > 0;

          return (
            <View
              key={cell.hour}
              style={[
                styles.ringDot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  left: x,
                  top: y,
                  backgroundColor: active ? colors.morandiUnlock : colors.heatEmpty,
                  opacity: active ? 0.55 + (cell.count / maxHourly) * 0.45 : 1,
                },
              ]}
            />
          );
        })}
      </View>

      <View style={styles.ringLegend}>
        <Text style={styles.legendText}>0</Text>
        <Text style={styles.legendText}>6</Text>
        <Text style={styles.legendText}>12</Text>
        <Text style={styles.legendText}>18</Text>
      </View>
    </GhostSection>
  );
}
