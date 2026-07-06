import type { BehaviorEvent } from '../types/event';
import {
  ENTERTAINMENT_DEEP_BROWSE_THRESHOLD_MS,
  ENTERTAINMENT_IMPULSIVE_BROWSE_MAX_MS,
} from '../constants';
import { addDays, formatDisplayDate, formatMonthRangeLabel, formatWeekRangeLabel, getMondayOfWeek } from '../utils/dateUtils';
import { classifyApp } from './appClassifier';
import { buildDiarySessions } from './diarySessionBuilder';
import {
  analyzePathTriggers,
  buildAggregatedAppStats,
  buildChronologicalAppBlocks,
  extractDisplayAppSequence,
  type AppDwellBlock,
  type PathTrigger,
} from './pathAnalyzer';
import { formatDuration, formatTime, buildSessions } from './sessionAnalyzer';

export interface EntertainmentWeekDayStat {
  date: string;
  browseMs: number;
  visitCount: number;
  wanderingMs: number;
}

export interface EntertainmentWanderingStat {
  sessionCount: number;
  totalMs: number;
  totalSwitchCount: number;
  longestSessionMs: number;
}

export interface EntertainmentReport {
  date: string;
  hasData: boolean;
  totalBrowseMs: number;
  totalVisitCount: number;
  totalSwitchCount: number;
  deepBrowseCount: number;
  impulsiveOpenCount: number;
  deepBrowseBlocks: AppDwellBlock[];
  longestBlock: AppDwellBlock | null;
  peakHour: number | null;
  peakHourLabel: string | null;
  topApps: ReturnType<typeof buildAggregatedAppStats>;
  topBlocks: AppDwellBlock[];
  topTriggers: PathTrigger[];
  lostPathTriggers: PathTrigger[];
  wandering: EntertainmentWanderingStat;
  weekDays: EntertainmentWeekDayStat[];
  weekTotalMs: number;
  weekActiveDays: number;
  weekAvgMs: number;
  prevWeekTotalMs: number;
  weekTrendPercent: number | null;
}

function isScrollApp(packageName?: string, appLabel?: string): boolean {
  return classifyApp(packageName, appLabel) === 'entertainment';
}

function buildDayEntertainmentBlocks(events: BehaviorEvent[]): AppDwellBlock[] {
  const sessions = buildSessions(events);
  const blocks: AppDwellBlock[] = [];

  for (const session of sessions) {
    const sessionBlocks = buildChronologicalAppBlocks(session.events, session.endTime);
    for (const block of sessionBlocks) {
      if (isScrollApp(block.packageName, block.appLabel)) {
        blocks.push(block);
      }
    }
  }

  return blocks.sort((a, b) => b.startTime - a.startTime);
}

function countEntertainmentSwitches(events: BehaviorEvent[]): number {
  const sequence = extractDisplayAppSequence(events);
  let count = 0;
  for (let i = 0; i < sequence.length - 1; i += 1) {
    const from = sequence[i];
    const to = sequence[i + 1];
    if (isScrollApp(from.packageName, from.appLabel) || isScrollApp(to.packageName, to.appLabel)) {
      count += 1;
    }
  }
  return count;
}

function resolvePeakHour(blocks: AppDwellBlock[]): { hour: number; label: string } | null {
  if (blocks.length === 0) {
    return null;
  }

  const hourMs = new Array(24).fill(0) as number[];
  for (const block of blocks) {
    const hour = new Date(block.startTime).getHours();
    hourMs[hour] += block.durationMs;
  }

  let peakHour = 0;
  let peakMs = 0;
  for (let hour = 0; hour < 24; hour += 1) {
    if (hourMs[hour] > peakMs) {
      peakMs = hourMs[hour];
      peakHour = hour;
    }
  }

  if (peakMs === 0) {
    return null;
  }

  return {
    hour: peakHour,
    label: `${String(peakHour).padStart(2, '0')}:00–${String((peakHour + 1) % 24).padStart(2, '0')}:00`,
  };
}

function buildWanderingStat(events: BehaviorEvent[]): EntertainmentWanderingStat {
  const wanderingEntries = buildDiarySessions(events).filter(
    (entry) => entry.mood.mood === 'wandering',
  );

  const entertainmentWandering = wanderingEntries.filter((entry) =>
    entry.appBlocks.some((block) => isScrollApp(block.packageName, block.appLabel)),
  );

  if (entertainmentWandering.length === 0) {
    return {
      sessionCount: 0,
      totalMs: 0,
      totalSwitchCount: 0,
      longestSessionMs: 0,
    };
  }

  return {
    sessionCount: entertainmentWandering.length,
    totalMs: entertainmentWandering.reduce((sum, entry) => sum + entry.session.durationMs, 0),
    totalSwitchCount: entertainmentWandering.reduce(
      (sum, entry) => sum + entry.mood.switchCount,
      0,
    ),
    longestSessionMs: Math.max(
      ...entertainmentWandering.map((entry) => entry.session.durationMs),
    ),
  };
}

function buildEntertainmentTriggers(events: BehaviorEvent[]): PathTrigger[] {
  return analyzePathTriggers(events)
    .filter(
      (trigger) =>
        isScrollApp(trigger.fromPackage, trigger.fromLabel)
        || isScrollApp(trigger.toPackage, trigger.toLabel),
    )
    .slice(0, 6);
}

function buildLostPathTriggers(events: BehaviorEvent[]): PathTrigger[] {
  return analyzePathTriggers(events, 60_000)
    .filter((trigger) => isScrollApp(trigger.toPackage, trigger.toLabel))
    .filter((trigger) => {
      const fromCategory = classifyApp(trigger.fromPackage, trigger.fromLabel);
      return fromCategory === 'social' || isScrollApp(trigger.fromPackage, trigger.fromLabel);
    })
    .slice(0, 5);
}

function buildDeepBrowseStats(blocks: AppDwellBlock[]) {
  const deepBrowseBlocks = blocks
    .filter((block) => block.durationMs >= ENTERTAINMENT_DEEP_BROWSE_THRESHOLD_MS)
    .sort((a, b) => b.durationMs - a.durationMs);
  const impulsiveOpenCount = blocks.filter(
    (block) => block.durationMs < ENTERTAINMENT_IMPULSIVE_BROWSE_MAX_MS,
  ).length;

  return {
    deepBrowseCount: deepBrowseBlocks.length,
    deepBrowseBlocks: deepBrowseBlocks.slice(0, 5),
    impulsiveOpenCount,
  };
}

function buildWeekDayStats(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): EntertainmentWeekDayStat[] {
  return dateEventPairs.map(({ date, events }) => {
    const blocks = buildDayEntertainmentBlocks(events);
    const apps = buildAggregatedAppStats(blocks);
    const wandering = buildWanderingStat(events);
    return {
      date,
      browseMs: apps.reduce((sum, app) => sum + app.durationMs, 0),
      visitCount: apps.reduce((sum, app) => sum + app.visitCount, 0),
      wanderingMs: wandering.totalMs,
    };
  });
}

function sumWeekBrowse(days: EntertainmentWeekDayStat[]): number {
  return days.reduce((sum, day) => sum + day.browseMs, 0);
}

/** 构建单日娱乐刷屏专题报告（含近 7 日对比） */
export function buildEntertainmentReport(
  date: string,
  events: BehaviorEvent[],
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): EntertainmentReport {
  const blocks = buildDayEntertainmentBlocks(events);
  const topApps = buildAggregatedAppStats(blocks);
  const totalBrowseMs = topApps.reduce((sum, app) => sum + app.durationMs, 0);
  const totalVisitCount = topApps.reduce((sum, app) => sum + app.visitCount, 0);
  const peak = resolvePeakHour(blocks);
  const longestBlock = blocks.length > 0
    ? [...blocks].sort((a, b) => b.durationMs - a.durationMs)[0]
    : null;

  const weekMonday = getMondayOfWeek(date);
  const prevWeekMonday = addDays(weekMonday, -7);
  const prevWeekSunday = addDays(prevWeekMonday, 6);
  const currentWeekPairs = weekDateEventPairs.filter(
    (pair) => pair.date >= weekMonday && pair.date <= addDays(weekMonday, 6),
  );
  const prevWeekPairs = weekDateEventPairs.filter(
    (pair) => pair.date >= prevWeekMonday && pair.date <= prevWeekSunday,
  );

  const weekDays = buildWeekDayStats(currentWeekPairs);
  const weekTotalMs = sumWeekBrowse(weekDays);
  const weekActiveDays = weekDays.filter((day) => day.browseMs > 0).length;
  const weekAvgMs = weekActiveDays > 0 ? weekTotalMs / weekActiveDays : 0;
  const prevWeekTotalMs = sumWeekBrowse(buildWeekDayStats(prevWeekPairs));

  let weekTrendPercent: number | null = null;
  if (prevWeekTotalMs > 0 && weekTotalMs > 0) {
    weekTrendPercent = Math.round(((weekTotalMs - prevWeekTotalMs) / prevWeekTotalMs) * 100);
  }

  const deepBrowse = buildDeepBrowseStats(blocks);
  const lostPathTriggers = buildLostPathTriggers(events);

  return {
    date,
    hasData: totalBrowseMs > 0 || buildWanderingStat(events).sessionCount > 0,
    totalBrowseMs,
    totalVisitCount,
    totalSwitchCount: countEntertainmentSwitches(events),
    deepBrowseCount: deepBrowse.deepBrowseCount,
    impulsiveOpenCount: deepBrowse.impulsiveOpenCount,
    deepBrowseBlocks: deepBrowse.deepBrowseBlocks,
    longestBlock,
    peakHour: peak?.hour ?? null,
    peakHourLabel: peak?.label ?? null,
    topApps,
    topBlocks: [...blocks].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8),
    topTriggers: buildEntertainmentTriggers(events),
    lostPathTriggers,
    wandering: buildWanderingStat(events),
    weekDays,
    weekTotalMs,
    weekActiveDays,
    weekAvgMs,
    prevWeekTotalMs,
    weekTrendPercent,
  };
}

/** 构建周/月聚合报告（用于 AI 解读） */
export function buildEntertainmentPeriodReport(
  anchorDate: string,
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  comparePairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): EntertainmentReport {
  const allEvents = dateEventPairs.flatMap((pair) => pair.events);
  const blocks = buildDayEntertainmentBlocks(allEvents);
  const topApps = buildAggregatedAppStats(blocks);
  const totalBrowseMs = topApps.reduce((sum, app) => sum + app.durationMs, 0);
  const totalVisitCount = topApps.reduce((sum, app) => sum + app.visitCount, 0);
  const peak = resolvePeakHour(blocks);
  const longestBlock = blocks.length > 0
    ? [...blocks].sort((a, b) => b.durationMs - a.durationMs)[0]
    : null;

  const dayStats = buildWeekDayStats(dateEventPairs);
  const periodTotalMs = sumWeekBrowse(dayStats);
  const activeDays = dayStats.filter((day) => day.browseMs > 0).length;
  const avgMs = activeDays > 0 ? periodTotalMs / activeDays : 0;
  const compareTotalMs = sumWeekBrowse(buildWeekDayStats(comparePairs));

  let weekTrendPercent: number | null = null;
  if (compareTotalMs > 0 && periodTotalMs > 0) {
    weekTrendPercent = Math.round(((periodTotalMs - compareTotalMs) / compareTotalMs) * 100);
  }

  const deepBrowse = buildDeepBrowseStats(blocks);
  const lostPathTriggers = buildLostPathTriggers(allEvents);

  return {
    date: anchorDate,
    hasData: totalBrowseMs > 0 || buildWanderingStat(allEvents).sessionCount > 0,
    totalBrowseMs,
    totalVisitCount,
    totalSwitchCount: countEntertainmentSwitches(allEvents),
    deepBrowseCount: deepBrowse.deepBrowseCount,
    impulsiveOpenCount: deepBrowse.impulsiveOpenCount,
    deepBrowseBlocks: deepBrowse.deepBrowseBlocks,
    longestBlock,
    peakHour: peak?.hour ?? null,
    peakHourLabel: peak?.label ?? null,
    topApps,
    topBlocks: [...blocks].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10),
    topTriggers: buildEntertainmentTriggers(allEvents),
    lostPathTriggers,
    wandering: buildWanderingStat(allEvents),
    weekDays: dayStats,
    weekTotalMs: periodTotalMs,
    weekActiveDays: activeDays,
    weekAvgMs: avgMs,
    prevWeekTotalMs: compareTotalMs,
    weekTrendPercent,
  };
}

/** 构建娱乐本周 AI prompt */
export function formatEntertainmentWeeklyPayload(
  weekMonday: string,
  report: EntertainmentReport,
): string {
  if (!report.hasData) {
    return `统计区间：${formatWeekRangeLabel(weekMonday)}\n本周无娱乐 App 浏览记录。`;
  }
  return formatEntertainmentPeriodPayload('本周', formatWeekRangeLabel(weekMonday), report, '上周');
}

/** 构建娱乐本月 AI prompt */
export function formatEntertainmentMonthlyPayload(
  monthAnchor: string,
  report: EntertainmentReport,
): string {
  if (!report.hasData) {
    return `统计区间：${formatMonthRangeLabel(monthAnchor)}\n本月无娱乐 App 浏览记录。`;
  }
  return formatEntertainmentPeriodPayload('本月', formatMonthRangeLabel(monthAnchor), report, '上月');
}

function formatEntertainmentPeriodPayload(
  periodLabel: string,
  rangeLabel: string,
  report: EntertainmentReport,
  compareLabel: string,
): string {
  const appLines = report.topApps
    .map(
      (app) =>
        `- ${app.appLabel}：${formatDuration(app.durationMs)}，进入 ${app.visitCount} 次`,
    )
    .join('\n');

  const dayLines = report.weekDays
    .filter((day) => day.browseMs > 0)
    .map(
      (day) =>
        `- ${formatDisplayDate(day.date)}：浏览 ${formatDuration(day.browseMs)}，进入 ${day.visitCount} 次${day.wanderingMs > 0 ? `，游离 ${formatDuration(day.wanderingMs)}` : ''}`,
    )
    .join('\n');

  const triggerLines = (report.lostPathTriggers.length > 0 ? report.lostPathTriggers : report.topTriggers)
    .map(
      (trigger) =>
        `- ${trigger.fromLabel} → ${trigger.toLabel}：${trigger.count} 次（${trigger.percentage}%）`,
    )
    .join('\n');

  const trendLine = report.weekTrendPercent !== null
    ? `较${compareLabel}总量变化约 ${report.weekTrendPercent > 0 ? '+' : ''}${report.weekTrendPercent}%`
    : `暂无足够${compareLabel}数据做对比`;

  const longestLine = report.longestBlock
    ? `${report.longestBlock.appLabel} ${formatDuration(report.longestBlock.durationMs)}（${formatTime(report.longestBlock.startTime)} 开始）`
    : '暂无';

  return `统计区间：${rangeLabel}

## ${periodLabel}娱乐浏览概览
- 总浏览：${formatDuration(report.totalBrowseMs)}
- 进入次数：${report.totalVisitCount} 次
- 相关切换：${report.totalSwitchCount} 次
- 单次沉迷（>30 分钟）：${report.deepBrowseCount} 次
- 无意识快闪（<2 分钟）：${report.impulsiveOpenCount} 次
- 最长连续浏览：${longestLine}
- 高峰时段：${report.peakHourLabel ?? '暂无'}
- 有浏览的天数：${report.weekActiveDays}/${report.weekDays.length}
- 日均（有浏览日）：${formatDuration(report.weekAvgMs)}
- ${trendLine}

## 各 App 使用
${appLines || '暂无'}

## 迷失链路
${triggerLines || '暂无'}

## 游离刷屏
- 游离段数：${report.wandering.sessionCount}
- 合计时长：${formatDuration(report.wandering.totalMs)}
- 切换次数：${report.wandering.totalSwitchCount}

## 逐日分布
${dayLines || '暂无'}`;
}

/** @deprecated 仅保留兼容，AI 已改用周/月 payload */
export function formatEntertainmentReportPayload(report: EntertainmentReport): string {
  if (!report.hasData) {
    return `日期：${formatDisplayDate(report.date)}\n今日无娱乐 App 使用记录。`;
  }

  const appLines = report.topApps
    .map(
      (app) =>
        `- ${app.appLabel}：${formatDuration(app.durationMs)}，进入 ${app.visitCount} 次`,
    )
    .join('\n');

  const blockLines = report.topBlocks
    .slice(0, 6)
    .map(
      (block) =>
        `- ${formatTime(block.startTime)} ${block.appLabel}：${formatDuration(block.durationMs)}`,
    )
    .join('\n');

  const triggerLines = (report.lostPathTriggers.length > 0 ? report.lostPathTriggers : report.topTriggers)
    .map(
      (trigger) =>
        `- ${trigger.fromLabel} → ${trigger.toLabel}：${trigger.count} 次（${trigger.percentage}%）`,
    )
    .join('\n');

  const weekLines = report.weekDays
    .filter((day) => day.browseMs > 0)
    .map(
      (day) =>
        `- ${formatDisplayDate(day.date)}：浏览 ${formatDuration(day.browseMs)}，进入 ${day.visitCount} 次${day.wanderingMs > 0 ? `，游离 ${formatDuration(day.wanderingMs)}` : ''}`,
    )
    .join('\n');

  const trendLine = report.weekTrendPercent !== null
    ? `较近 7 日总量变化约 ${report.weekTrendPercent > 0 ? '+' : ''}${report.weekTrendPercent}%`
    : '暂无足够上周数据做对比';

  const longestLine = report.longestBlock
    ? `${report.longestBlock.appLabel} ${formatDuration(report.longestBlock.durationMs)}（${formatTime(report.longestBlock.startTime)} 开始）`
    : '暂无';

  return `日期：${formatDisplayDate(report.date)}

## 今日娱乐浏览概览
- 总浏览：${formatDuration(report.totalBrowseMs)}
- 进入次数：${report.totalVisitCount} 次
- App 间切换：${report.totalSwitchCount} 次
- 最长连续浏览：${longestLine}
- 高峰时段：${report.peakHourLabel ?? '暂无'}

## 各 App 使用
${appLines || '暂无'}

## 主要浏览片段
${blockLines || '暂无'}

## 高频跳转（含通往娱乐 App）
${triggerLines || '暂无'}

## 游离刷屏（含娱乐 App 的碎片会话）
- 游离段数：${report.wandering.sessionCount}
- 合计时长：${formatDuration(report.wandering.totalMs)}
- 切换次数：${report.wandering.totalSwitchCount}
- 最长一段：${formatDuration(report.wandering.longestSessionMs)}

## 近 7 日
- 有浏览的天数：${report.weekActiveDays}/7
- 7 日合计：${formatDuration(report.weekTotalMs)}
- 有浏览日均：${formatDuration(report.weekAvgMs)}
- ${trendLine}

${weekLines || '近 7 日无娱乐浏览'}`;
}

/** 轨迹页预览用一行摘要 */
export function formatEntertainmentPreviewLine(report: EntertainmentReport): string | null {
  if (!report.hasData) {
    return null;
  }

  const topApp = report.topApps[0];
  const parts = [formatDuration(report.totalBrowseMs)];
  if (topApp) {
    parts.push(`主要在 ${topApp.appLabel}`);
  }
  if (report.wandering.sessionCount > 0) {
    parts.push(`${report.wandering.sessionCount} 段游离`);
  }
  return parts.join(' · ');
}
