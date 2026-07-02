import type { ThemeColors } from '../theme/types';
import type { BehaviorEvent } from '../types/event';

export interface HourlyUnlockCell {
  hour: number;
  count: number;
}

export interface DailyUnlockCell {
  date: string;
  count: number;
}

/** 单日 24 小时解锁分布 */
export function buildHourlyUnlockHeatmap(events: BehaviorEvent[]): HourlyUnlockCell[] {
  const counts = new Array(24).fill(0) as number[];

  for (const event of events) {
    if (event.type !== 'unlock') {
      continue;
    }
    const hour = new Date(event.timestamp).getHours();
    counts[hour] += 1;
  }

  return counts.map((count, hour) => ({ hour, count }));
}

/** 多日解锁汇总（用于周视图） */
export function buildDailyUnlockCounts(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): DailyUnlockCell[] {
  return dateEventPairs.map(({ date, events }) => ({
    date,
    count: events.filter((e) => e.type === 'unlock').length,
  }));
}

export function getHeatmapColor(count: number, maxCount: number, themeColors: ThemeColors): string {
  if (count === 0 || maxCount === 0) {
    return themeColors.heatEmpty;
  }
  const ratio = count / maxCount;
  if (ratio < 0.25) {
    return themeColors.heatLow;
  }
  if (ratio < 0.5) {
    return themeColors.heatMid;
  }
  if (ratio < 0.75) {
    return themeColors.heatHigh;
  }
  return themeColors.heatPeak;
}

export function getHeatmapOpacity(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) {
    return 0.15;
  }
  return 0.35 + (count / maxCount) * 0.65;
}
