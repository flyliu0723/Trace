import type { BehaviorEvent } from '../types/event';
import { SHOPPING_DECISION_THRESHOLD_MS } from '../constants';
import { addDays, getMondayOfWeek } from '../utils/dateUtils';
import {
  buildCategoryCompareTriggers,
  buildCategoryDwellBlocks,
  buildCategoryWeekDayStats,
  countCategoryAppSwitches,
  resolveCategoryPeakHour,
  sumCategoryWeekDuration,
  type CategoryWeekDayStat,
} from './categoryDwellAnalyzer';
import {
  buildAggregatedAppStats,
  type AppDwellBlock,
  type PathTrigger,
} from './pathAnalyzer';
import { formatDuration } from './sessionAnalyzer';

export interface ShoppingReport {
  date: string;
  hasData: boolean;
  totalBrowseMs: number;
  totalVisitCount: number;
  decisionSessionCount: number;
  decisionBlocks: AppDwellBlock[];
  compareSwitchCount: number;
  compareTriggers: PathTrigger[];
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

function buildDecisionStats(blocks: AppDwellBlock[]) {
  const decisionBlocks = blocks
    .filter((block) => block.durationMs >= SHOPPING_DECISION_THRESHOLD_MS)
    .sort((a, b) => b.durationMs - a.durationMs);

  return {
    decisionSessionCount: decisionBlocks.length,
    decisionBlocks: decisionBlocks.slice(0, 5),
  };
}

function buildShoppingInsight(
  totalBrowseMs: number,
  decisionSessionCount: number,
  compareSwitchCount: number,
  compareTriggers: PathTrigger[],
): string {
  if (compareTriggers.length > 0) {
    const top = compareTriggers[0];
    return `你在「${top.fromLabel}」和「${top.toLabel}」之间来回对比了 ${top.count} 次，决策成本不低。`;
  }
  if (decisionSessionCount >= 2) {
    return `今天有 ${decisionSessionCount} 次超过 5 分钟的逛店，像是在认真挑东西。`;
  }
  if (compareSwitchCount >= 4) {
    return '购物 App 切换频繁，可能还在犹豫要不要下单。';
  }
  if (totalBrowseMs > 0) {
    return '今天的购物浏览比较轻量，没有明显的长时间纠结。';
  }
  return '今天还没有购物类 App 使用记录。';
}

/** 构建单日购物专题报告 */
export function buildShoppingReport(
  date: string,
  events: BehaviorEvent[],
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): ShoppingReport {
  const blocks = buildCategoryDwellBlocks(events, 'shopping');
  const topApps = buildAggregatedAppStats(blocks);
  const totalBrowseMs = topApps.reduce((sum, app) => sum + app.durationMs, 0);
  const totalVisitCount = topApps.reduce((sum, app) => sum + app.visitCount, 0);
  const peak = resolveCategoryPeakHour(blocks);
  const longestBlock = blocks.length > 0
    ? [...blocks].sort((a, b) => b.durationMs - a.durationMs)[0]
    : null;
  const decision = buildDecisionStats(blocks);
  const compareTriggers = buildCategoryCompareTriggers(events, 'shopping');
  const compareSwitchCount = countCategoryAppSwitches(events, 'shopping');

  const weekMonday = getMondayOfWeek(date);
  const prevWeekMonday = addDays(weekMonday, -7);
  const prevWeekSunday = addDays(prevWeekMonday, 6);
  const currentWeekPairs = weekDateEventPairs.filter(
    (pair) => pair.date >= weekMonday && pair.date <= addDays(weekMonday, 6),
  );
  const prevWeekPairs = weekDateEventPairs.filter(
    (pair) => pair.date >= prevWeekMonday && pair.date <= prevWeekSunday,
  );

  const weekDays = buildCategoryWeekDayStats('shopping', currentWeekPairs);
  const weekTotalMs = sumCategoryWeekDuration(weekDays);
  const weekActiveDays = weekDays.filter((day) => day.durationMs > 0).length;
  const weekAvgMs = weekActiveDays > 0 ? weekTotalMs / weekActiveDays : 0;
  const prevWeekTotalMs = sumCategoryWeekDuration(
    buildCategoryWeekDayStats('shopping', prevWeekPairs),
  );

  let weekTrendPercent: number | null = null;
  if (prevWeekTotalMs > 0 && weekTotalMs > 0) {
    weekTrendPercent = Math.round(((weekTotalMs - prevWeekTotalMs) / prevWeekTotalMs) * 100);
  }

  return {
    date,
    hasData: totalBrowseMs > 0,
    totalBrowseMs,
    totalVisitCount,
    decisionSessionCount: decision.decisionSessionCount,
    decisionBlocks: decision.decisionBlocks,
    compareSwitchCount,
    compareTriggers,
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
    insight: buildShoppingInsight(
      totalBrowseMs,
      decision.decisionSessionCount,
      compareSwitchCount,
      compareTriggers,
    ),
  };
}
