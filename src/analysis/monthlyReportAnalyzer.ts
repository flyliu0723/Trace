import type { BehaviorEvent } from '../types/event';
import type { BehaviorProfile } from './behaviorProfileAnalyzer';
import { formatBehaviorProfile } from './behaviorProfileAnalyzer';
import { buildDailySummary } from './sessionAnalyzer';
import { analyzePathTriggers } from './pathAnalyzer';
import { analyzeBehaviorPatterns } from './patternAnalyzer';
import { analyzeSessionGoals, summarizeSessionGoals } from './sessionGoalAnalyzer';
import { buildSessions, formatDuration } from './sessionAnalyzer';
import { formatDisplayDate } from '../utils/dateUtils';
import { analyzeMediaSceneHabits } from './mediaSceneAnalyzer';

export interface MonthlyWeekStat {
  weekIndex: number;
  startDate: string;
  endDate: string;
  unlockCount: number;
  quickSessionCount: number;
  productiveSessions: number;
  entertainmentSessions: number;
  passiveMediaMs: number;
}

export interface MonthlyReport {
  startDate: string;
  endDate: string;
  activeDays: number;
  totalUnlocks: number;
  avgUnlocksPerDay: number;
  totalProductiveSessions: number;
  totalEntertainmentSessions: number;
  totalPassiveMediaMs: number;
  weeks: MonthlyWeekStat[];
  topTriggers: ReturnType<typeof analyzePathTriggers>;
  topPatterns: ReturnType<typeof analyzeBehaviorPatterns>;
}

function chunkIntoWeeks(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): Array<Array<{ date: string; events: BehaviorEvent[] }>> {
  const weeks: Array<Array<{ date: string; events: BehaviorEvent[] }>> = [];
  for (let i = 0; i < dateEventPairs.length; i += 7) {
    weeks.push(dateEventPairs.slice(i, i + 7));
  }
  return weeks;
}

export function buildMonthlyReport(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): MonthlyReport {
  const sorted = [...dateEventPairs].sort((a, b) => a.date.localeCompare(b.date));
  const activePairs = sorted.filter((pair) => pair.events.length > 0);
  const allEvents = sorted.flatMap((pair) => pair.events);

  let totalProductiveSessions = 0;
  let totalEntertainmentSessions = 0;
  let totalUnlocks = 0;
  let totalPassiveMediaMs = 0;

  for (const { events } of sorted) {
    const summary = buildDailySummary('', events);
    totalUnlocks += summary.unlockCount;
    totalPassiveMediaMs += summary.passiveMediaMs;
    const sessions = buildSessions(events);
    const goalSummary = summarizeSessionGoals(analyzeSessionGoals(sessions));
    totalProductiveSessions += goalSummary.productiveCount;
    totalEntertainmentSessions += goalSummary.entertainmentCount;
  }

  const weeks = chunkIntoWeeks(sorted).map((weekPairs, index) => {
    let unlockCount = 0;
    let quickSessionCount = 0;
    let productiveSessions = 0;
    let entertainmentSessions = 0;
    let passiveMediaMs = 0;

    for (const { events } of weekPairs) {
      const summary = buildDailySummary('', events);
      unlockCount += summary.unlockCount;
      quickSessionCount += summary.quickSessionCount;
      passiveMediaMs += summary.passiveMediaMs;
      const sessions = buildSessions(events);
      const goalSummary = summarizeSessionGoals(analyzeSessionGoals(sessions));
      productiveSessions += goalSummary.productiveCount;
      entertainmentSessions += goalSummary.entertainmentCount;
    }

    return {
      weekIndex: index + 1,
      startDate: weekPairs[0]?.date ?? '',
      endDate: weekPairs[weekPairs.length - 1]?.date ?? '',
      unlockCount,
      quickSessionCount,
      productiveSessions,
      entertainmentSessions,
      passiveMediaMs,
    };
  });

  return {
    startDate: sorted[0]?.date ?? '',
    endDate: sorted[sorted.length - 1]?.date ?? '',
    activeDays: activePairs.length,
    totalUnlocks,
    avgUnlocksPerDay: Math.round(totalUnlocks / (activePairs.length || 1)),
    totalProductiveSessions,
    totalEntertainmentSessions,
    totalPassiveMediaMs,
    weeks,
    topTriggers: analyzePathTriggers(allEvents).slice(0, 5),
    topPatterns: analyzeBehaviorPatterns(sorted).slice(0, 5),
  };
}

export function formatMonthlyTrends(report: MonthlyReport): string {
  const activeWeeks = report.weeks.filter(
    (week) => week.unlockCount > 0 || week.productiveSessions > 0 || week.entertainmentSessions > 0,
  );
  if (activeWeeks.length < 2) {
    return '暂无';
  }

  const firstWeek = activeWeeks[0];
  const lastWeek = activeWeeks[activeWeeks.length - 1];
  const unlockTrend =
    lastWeek.unlockCount === firstWeek.unlockCount
      ? '月内解锁次数前后持平'
      : lastWeek.unlockCount > firstWeek.unlockCount
        ? `月内解锁逐周走高（第 ${firstWeek.weekIndex} 周 ${firstWeek.unlockCount} 次 → 第 ${lastWeek.weekIndex} 周 ${lastWeek.unlockCount} 次）`
        : `月内解锁逐周走低（第 ${firstWeek.weekIndex} 周 ${firstWeek.unlockCount} 次 → 第 ${lastWeek.weekIndex} 周 ${lastWeek.unlockCount} 次）`;

  const busiestWeek = [...activeWeeks].sort((a, b) => b.unlockCount - a.unlockCount)[0];
  const quietestWeek = [...activeWeeks].sort((a, b) => a.unlockCount - b.unlockCount)[0];

  return `- ${unlockTrend}
- 解锁最多的一周：第 ${busiestWeek.weekIndex} 周（${formatDisplayDate(busiestWeek.startDate)}—${formatDisplayDate(busiestWeek.endDate)}，${busiestWeek.unlockCount} 次）
- 解锁最少的一周：第 ${quietestWeek.weekIndex} 周（${quietestWeek.unlockCount} 次）
- 月内后台播放累计：${formatDuration(report.totalPassiveMediaMs)}`;
}

export function compareMonthHalves(report: MonthlyReport): string[] {
  if (report.weeks.length < 2) {
    return [];
  }

  const midpoint = Math.ceil(report.weeks.length / 2);
  const firstHalf = report.weeks.slice(0, midpoint);
  const secondHalf = report.weeks.slice(midpoint);

  const avg = (weeks: MonthlyWeekStat[], key: keyof MonthlyWeekStat) => {
    if (weeks.length === 0) {
      return 0;
    }
    const total = weeks.reduce((sum, week) => sum + Number(week[key] ?? 0), 0);
    return Math.round(total / weeks.length);
  };

  const deviations: string[] = [];
  const firstUnlock = avg(firstHalf, 'unlockCount');
  const secondUnlock = avg(secondHalf, 'unlockCount');
  if (Math.abs(secondUnlock - firstUnlock) >= 3) {
    deviations.push(
      secondUnlock > firstUnlock
        ? `下半月周均解锁 ${secondUnlock} 次，高于上半月的 ${firstUnlock} 次。`
        : `下半月周均解锁 ${secondUnlock} 次，低于上半月的 ${firstUnlock} 次。`,
    );
  }

  const firstQuick = avg(firstHalf, 'quickSessionCount');
  const secondQuick = avg(secondHalf, 'quickSessionCount');
  if (Math.abs(secondQuick - firstQuick) >= 2) {
    deviations.push(
      secondQuick > firstQuick
        ? `下半月快速查看增多（周均 ${firstQuick} → ${secondQuick} 次）。`
        : `下半月快速查看减少（周均 ${firstQuick} → ${secondQuick} 次）。`,
    );
  }

  const firstEntertainment = avg(firstHalf, 'entertainmentSessions');
  const secondEntertainment = avg(secondHalf, 'entertainmentSessions');
  if (Math.abs(secondEntertainment - firstEntertainment) >= 2) {
    deviations.push(
      secondEntertainment > firstEntertainment
        ? `下半月娱乐会话增多（周均 ${firstEntertainment} → ${secondEntertainment} 次）。`
        : `下半月娱乐会话减少（周均 ${firstEntertainment} → ${secondEntertainment} 次）。`,
    );
  }

  return deviations.slice(0, 3);
}

export function formatMonthHalfDeviations(report: MonthlyReport): string {
  const deviations = compareMonthHalves(report);
  if (deviations.length === 0) {
    return '月内前后半段较平稳';
  }
  return deviations.map((item) => `- ${item}`).join('\n');
}

export function buildMonthlyPromptPayload(
  report: MonthlyReport,
  profile: BehaviorProfile | null,
  monthDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): string {
  const weekLines = report.weeks
    .filter((week) => week.unlockCount > 0 || week.productiveSessions > 0)
    .map(
      (week) =>
        `- 第 ${week.weekIndex} 周（${week.startDate}—${week.endDate}）：解锁 ${week.unlockCount} 次，高效 ${week.productiveSessions} 次，娱乐 ${week.entertainmentSessions} 次，快速查看 ${week.quickSessionCount} 次`,
    )
    .join('\n');

  const triggerLines = report.topTriggers
    .map((t) => `- ${t.fromLabel} → ${t.toLabel}：${t.count}次`)
    .join('\n');

  const patternLines = report.topPatterns
    .map((p) => `- ${p.pathLabel}：${p.occurrenceDays}天出现，共${p.totalCount}次`)
    .join('\n');

  const trendLines = formatMonthlyTrends(report);
  const mediaHabits = analyzeMediaSceneHabits(monthDateEventPairs);
  const mediaLines = mediaHabits.length > 0 ? mediaHabits.map((h) => `- ${h}`).join('\n') : '暂无';

  const profileSection = profile
    ? formatBehaviorProfile(profile)
    : '暂无足够历史数据建立长期画像';

  const deviationSection = formatMonthHalfDeviations(report);

  return `统计区间：${report.startDate} 至 ${report.endDate}

## 一月概览
- 有数据天数：${report.activeDays} 天
- 总解锁：${report.totalUnlocks} 次
- 日均解锁：${report.avgUnlocksPerDay} 次
- 高效会话：${report.totalProductiveSessions} 次
- 娱乐会话：${report.totalEntertainmentSessions} 次
- 后台播放：${formatDuration(report.totalPassiveMediaMs)}

## 长期行为画像（基于近 30 天）
${profileSection}

## 月内前后半段差异
${deviationSection}

## 月内趋势
${trendLines}

## 媒体场景习惯
${mediaLines}

## 分周数据
${weekLines || '暂无'}

## 热门跳转路径（请重点解释这些路径出现的场景和可能原因）
${triggerLines || '暂无'}

## 重复行为路径
${patternLines || '暂无'}`;
}
