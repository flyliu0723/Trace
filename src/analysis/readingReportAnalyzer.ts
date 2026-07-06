import type { BehaviorEvent } from '../types/event';
import { READING_IMMERSION_THRESHOLD_MS } from '../constants';
import { addDays, getMondayOfWeek } from '../utils/dateUtils';
import {
  buildCategoryDwellBlocks,
  buildCategoryWeekDayStats,
  resolveCategoryPeakHour,
  sumCategoryWeekDuration,
  type CategoryWeekDayStat,
} from './categoryDwellAnalyzer';
import {
  buildAggregatedAppStats,
  type AppDwellBlock,
} from './pathAnalyzer';
import { formatDuration } from './sessionAnalyzer';

export interface ReadingReport {
  date: string;
  hasData: boolean;
  totalReadingMs: number;
  totalVisitCount: number;
  immersionCount: number;
  immersionBlocks: AppDwellBlock[];
  longestBlock: AppDwellBlock | null;
  peakHour: number | null;
  peakHourLabel: string | null;
  topApps: ReturnType<typeof buildAggregatedAppStats>;
  topBlocks: AppDwellBlock[];
  weekDays: CategoryWeekDayStat[];
  weekTotalMs: number;
  weekActiveDays: number;
  weekAvgMs: number;
  prevWeekTotalMs: number;
  weekTrendPercent: number | null;
  insight: string;
}

function buildImmersionStats(blocks: AppDwellBlock[]) {
  const immersionBlocks = blocks
    .filter((block) => block.durationMs >= READING_IMMERSION_THRESHOLD_MS)
    .sort((a, b) => b.durationMs - a.durationMs);

  return {
    immersionCount: immersionBlocks.length,
    immersionBlocks: immersionBlocks.slice(0, 5),
  };
}

function buildReadingInsight(
  totalReadingMs: number,
  immersionCount: number,
  longestBlock: AppDwellBlock | null,
): string {
  if (immersionCount > 0 && longestBlock) {
    return `今天有 ${immersionCount} 段沉浸式阅读，最长一段 ${formatDuration(longestBlock.durationMs)}，说明你能为自己留出专注块。`;
  }
  if (totalReadingMs >= 20 * 60_000) {
    return '阅读时长不错，但多段较短，可能是碎片式翻了几页。';
  }
  if (totalReadingMs > 0) {
    return '今天有短暂阅读，可以试着留出 15 分钟不被打断的时段。';
  }
  return '今天还没有阅读记录。';
}

/** 构建单日阅读专题报告 */
export function buildReadingReport(
  date: string,
  events: BehaviorEvent[],
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): ReadingReport {
  const blocks = buildCategoryDwellBlocks(events, 'reading');
  const topApps = buildAggregatedAppStats(blocks);
  const totalReadingMs = topApps.reduce((sum, app) => sum + app.durationMs, 0);
  const totalVisitCount = topApps.reduce((sum, app) => sum + app.visitCount, 0);
  const peak = resolveCategoryPeakHour(blocks);
  const longestBlock = blocks.length > 0
    ? [...blocks].sort((a, b) => b.durationMs - a.durationMs)[0]
    : null;
  const immersion = buildImmersionStats(blocks);

  const weekMonday = getMondayOfWeek(date);
  const prevWeekMonday = addDays(weekMonday, -7);
  const prevWeekSunday = addDays(prevWeekMonday, 6);
  const currentWeekPairs = weekDateEventPairs.filter(
    (pair) => pair.date >= weekMonday && pair.date <= addDays(weekMonday, 6),
  );
  const prevWeekPairs = weekDateEventPairs.filter(
    (pair) => pair.date >= prevWeekMonday && pair.date <= prevWeekSunday,
  );

  const weekDays = buildCategoryWeekDayStats('reading', currentWeekPairs);
  const weekTotalMs = sumCategoryWeekDuration(weekDays);
  const weekActiveDays = weekDays.filter((day) => day.durationMs > 0).length;
  const weekAvgMs = weekActiveDays > 0 ? weekTotalMs / weekActiveDays : 0;
  const prevWeekTotalMs = sumCategoryWeekDuration(
    buildCategoryWeekDayStats('reading', prevWeekPairs),
  );

  let weekTrendPercent: number | null = null;
  if (prevWeekTotalMs > 0 && weekTotalMs > 0) {
    weekTrendPercent = Math.round(((weekTotalMs - prevWeekTotalMs) / prevWeekTotalMs) * 100);
  }

  return {
    date,
    hasData: totalReadingMs > 0,
    totalReadingMs,
    totalVisitCount,
    immersionCount: immersion.immersionCount,
    immersionBlocks: immersion.immersionBlocks,
    longestBlock,
    peakHour: peak?.hour ?? null,
    peakHourLabel: peak?.label ?? null,
    topApps,
    topBlocks: [...blocks].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8),
    weekDays,
    weekTotalMs,
    weekActiveDays,
    weekAvgMs,
    prevWeekTotalMs,
    weekTrendPercent,
    insight: buildReadingInsight(totalReadingMs, immersion.immersionCount, longestBlock),
  };
}
