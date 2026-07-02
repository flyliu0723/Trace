import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  getContributionColor,
  getMoodLabel,
  type ContributionDayCell,
  type DayMood,
} from '../analysis/contributionAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { addDays, getTodayDateString } from '../utils/dateUtils';
import { radius, spacing, typography } from '../theme';

type RangeMode = 'week' | 'month';

interface ContributionHeatmapProps {
  cells: ContributionDayCell[];
  onDayPress?: (date: string) => void;
}

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const LEGEND_ITEMS: DayMood[] = ['productive', 'entertainment', 'mixed', 'empty'];

export function ContributionHeatmap({ cells, onDayPress }: ContributionHeatmapProps) {
  const { palettes } = useTheme();
  const [rangeMode, setRangeMode] = useState<RangeMode>('week');

  const styles = useThemedStyles(({ colors: c }) => ({
    container: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
    },
    modeSwitch: {
      flexDirection: 'row',
      backgroundColor: c.surfaceElevated,
      borderRadius: radius.pill,
      padding: 3,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    modeButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radius.pill,
    },
    modeButtonActive: {
      backgroundColor: c.background,
    },
    modeText: {
      ...typography.label,
      color: c.textMuted,
    },
    modeTextActive: {
      color: c.textPrimary,
      fontWeight: '600',
    },
    rangeLabel: {
      ...typography.label,
      color: c.textMuted,
      marginBottom: spacing.md,
      ...typography.mono,
    },
    weekGrid: {
      gap: spacing.sm,
    },
    weekdayRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      ...typography.label,
      color: c.textMuted,
    },
    weekCells: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    monthGrid: {
      gap: spacing.xs,
    },
    monthRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    cell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.sm,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 28,
      maxHeight: 44,
    },
    cellEmpty: {
      backgroundColor: c.heatEmpty,
      borderColor: c.border,
      opacity: 0.35,
    },
    cellPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.95 }],
    },
    cellDay: {
      ...typography.label,
      color: c.textPrimary,
      fontWeight: '600',
      opacity: 0.85,
      ...typography.mono,
    },
    legend: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendSwatch: {
      width: 12,
      height: 12,
      borderRadius: 3,
    },
    legendText: {
      ...typography.label,
      color: c.textSecondary,
    },
  }));

  const weekCells = useMemo(() => cells.slice(-7), [cells]);
  const monthGrid = useMemo(() => buildMonthGrid(cells), [cells]);

  const rangeLabel =
    rangeMode === 'week'
      ? formatRangeLabel(weekCells[0]?.date, weekCells[weekCells.length - 1]?.date)
      : formatRangeLabel(monthGrid[0]?.[0]?.date, monthGrid[monthGrid.length - 1]?.[6]?.date);

  const renderCell = (cell: ContributionDayCell | undefined, key: string) => {
    if (!cell) {
      return <View key={key} style={[styles.cell, styles.cellEmpty]} />;
    }

    const color = getContributionColor(cell.mood, cell.intensity, palettes);
    const dayNum = new Date(`${cell.date}T12:00:00`).getDate();

    return (
      <Pressable
        key={key}
        style={({ pressed }) => [
          styles.cell,
          { backgroundColor: color, borderColor: color + 'AA' },
          pressed && styles.cellPressed,
        ]}
        onPress={() => onDayPress?.(cell.date)}>
        <Text style={styles.cellDay}>{dayNum}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>习惯</Text>
        <View style={styles.modeSwitch}>
          <Pressable
            style={[styles.modeButton, rangeMode === 'week' && styles.modeButtonActive]}
            onPress={() => setRangeMode('week')}>
            <Text style={[styles.modeText, rangeMode === 'week' && styles.modeTextActive]}>周</Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, rangeMode === 'month' && styles.modeButtonActive]}
            onPress={() => setRangeMode('month')}>
            <Text style={[styles.modeText, rangeMode === 'month' && styles.modeTextActive]}>月</Text>
          </Pressable>
        </View>
      </View>

      <Text style={styles.rangeLabel}>{rangeLabel}</Text>

      {rangeMode === 'week' ? (
        <View style={styles.weekGrid}>
          <View style={styles.weekdayRow}>
            {weekCells.map((cell) => (
              <Text key={`label-${cell.date}`} style={styles.weekdayLabel}>
                {WEEKDAY_LABELS[(new Date(`${cell.date}T12:00:00`).getDay() + 6) % 7]}
              </Text>
            ))}
          </View>
          <View style={styles.weekCells}>
            {weekCells.map((cell) => renderCell(cell, cell.date))}
          </View>
        </View>
      ) : (
        <View style={styles.monthGrid}>
          <View style={styles.weekdayRow}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.weekdayLabel}>
                {label}
              </Text>
            ))}
          </View>
          {monthGrid.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.monthRow}>
              {week.map((cell, dayIndex) =>
                renderCell(cell, cell?.date ?? `empty-${weekIndex}-${dayIndex}`),
              )}
            </View>
          ))}
        </View>
      )}

      <View style={styles.legend}>
        {LEGEND_ITEMS.map((mood) => (
          <View key={mood} style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                {
                  backgroundColor: getContributionColor(
                    mood,
                    mood === 'empty' ? 0 : 0.85,
                    palettes,
                  ),
                },
              ]}
            />
            <Text style={styles.legendText}>{getMoodLabel(mood)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildMonthGrid(cells: ContributionDayCell[]): Array<Array<ContributionDayCell | undefined>> {
  if (cells.length === 0) {
    return [];
  }

  const today = getTodayDateString();
  const monthDates: string[] = [];
  for (let i = 34; i >= 0; i -= 1) {
    monthDates.push(addDays(today, -i));
  }

  const cellMap = new Map(cells.map((cell) => [cell.date, cell]));
  const alignedDates: Array<string | undefined> = [];

  const firstDate = new Date(`${monthDates[0]}T12:00:00`);
  const mondayOffset = (firstDate.getDay() + 6) % 7;
  for (let i = 0; i < mondayOffset; i += 1) {
    alignedDates.push(undefined);
  }
  monthDates.forEach((date) => alignedDates.push(date));

  while (alignedDates.length % 7 !== 0) {
    alignedDates.push(undefined);
  }

  const weeks: Array<Array<ContributionDayCell | undefined>> = [];
  for (let i = 0; i < alignedDates.length; i += 7) {
    weeks.push(
      alignedDates.slice(i, i + 7).map((date) => (date ? cellMap.get(date) : undefined)),
    );
  }

  return weeks;
}

function formatRangeLabel(startDate?: string, endDate?: string): string {
  if (!startDate || !endDate) {
    return '';
  }
  return `${formatMonthDay(startDate)} — ${formatMonthDay(endDate)}`;
}

function formatMonthDay(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}
