import type { BehaviorEvent } from '../types/event';
import type { BehaviorProfile } from './behaviorProfileAnalyzer';
import {
  comparePeriodAgainstProfile,
  formatBehaviorProfile,
  formatProfileDeviations,
} from './behaviorProfileAnalyzer';
import { buildDailySummary } from './sessionAnalyzer';
import { analyzePathTriggers } from './pathAnalyzer';
import { analyzeBehaviorPatterns } from './patternAnalyzer';
import { analyzeSessionGoals, summarizeSessionGoals } from './sessionGoalAnalyzer';
import { buildSessions } from './sessionAnalyzer';
import { formatDisplayDate } from '../utils/dateUtils';

export interface WeeklyDayStat {
  date: string;
  unlockCount: number;
  sessionCount: number;
  quickSessionCount: number;
  activeInteractionMs: number;
  passiveMediaMs: number;
}

export interface WeeklyReport {
  startDate: string;
  endDate: string;
  days: WeeklyDayStat[];
  totalUnlocks: number;
  avgUnlocksPerDay: number;
  totalProductiveSessions: number;
  totalEntertainmentSessions: number;
  topTriggers: ReturnType<typeof analyzePathTriggers>;
  topPatterns: ReturnType<typeof analyzeBehaviorPatterns>;
}

export function buildWeeklyReport(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): WeeklyReport {
  const nonEmpty = dateEventPairs.filter((p) => p.events.length > 0);
  const days: WeeklyDayStat[] = dateEventPairs.map(({ date, events }) => {
    const summary = buildDailySummary(date, events);
    return {
      date,
      unlockCount: summary.unlockCount,
      sessionCount: summary.sessionCount,
      quickSessionCount: summary.quickSessionCount,
      activeInteractionMs: summary.activeInteractionMs,
      passiveMediaMs: summary.passiveMediaMs,
    };
  });

  let totalProductiveSessions = 0;
  let totalEntertainmentSessions = 0;
  const allEvents: BehaviorEvent[] = [];

  for (const { events } of dateEventPairs) {
    allEvents.push(...events);
    const sessions = buildSessions(events);
    const goals = analyzeSessionGoals(sessions);
    const goalSummary = summarizeSessionGoals(goals);
    totalProductiveSessions += goalSummary.productiveCount;
    totalEntertainmentSessions += goalSummary.entertainmentCount;
  }

  const totalUnlocks = days.reduce((sum, d) => sum + d.unlockCount, 0);
  const daysWithData = nonEmpty.length || 1;

  return {
    startDate: dateEventPairs[0]?.date ?? '',
    endDate: dateEventPairs[dateEventPairs.length - 1]?.date ?? '',
    days,
    totalUnlocks,
    avgUnlocksPerDay: Math.round(totalUnlocks / daysWithData),
    totalProductiveSessions,
    totalEntertainmentSessions,
    topTriggers: analyzePathTriggers(allEvents).slice(0, 5),
    topPatterns: analyzeBehaviorPatterns(dateEventPairs).slice(0, 3),
  };
}

export function formatWeeklyTrends(report: WeeklyReport): string {
  const activeDays = report.days.filter((day) => day.unlockCount > 0 || day.sessionCount > 0);
  if (activeDays.length < 2) {
    return '暂无';
  }

  const midpoint = Math.ceil(activeDays.length / 2);
  const firstHalf = activeDays.slice(0, midpoint);
  const secondHalf = activeDays.slice(midpoint);

  const avg = (values: number[]) =>
    values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

  const firstUnlockAvg = avg(firstHalf.map((day) => day.unlockCount));
  const secondUnlockAvg = avg(secondHalf.map((day) => day.unlockCount));
  const unlockTrend =
    secondUnlockAvg === firstUnlockAvg
      ? '解锁次数周中前后持平'
      : secondUnlockAvg > firstUnlockAvg
        ? `解锁次数后半周高于前半周（${firstUnlockAvg} → ${secondUnlockAvg} 次/天）`
        : `解锁次数后半周低于前半周（${firstUnlockAvg} → ${secondUnlockAvg} 次/天）`;

  const busiest = [...activeDays].sort((a, b) => b.unlockCount - a.unlockCount)[0];
  const quietest = [...activeDays].sort((a, b) => a.unlockCount - b.unlockCount)[0];

  const firstQuickAvg = avg(firstHalf.map((day) => day.quickSessionCount));
  const secondQuickAvg = avg(secondHalf.map((day) => day.quickSessionCount));
  const quickTrend =
    secondQuickAvg === firstQuickAvg
      ? '快速查看周中前后持平'
      : secondQuickAvg > firstQuickAvg
        ? `快速查看后半周增多（${firstQuickAvg} → ${secondQuickAvg} 次/天）`
        : `快速查看后半周减少（${firstQuickAvg} → ${secondQuickAvg} 次/天）`;

  return `- ${unlockTrend}
- ${quickTrend}
- 解锁最多：${formatDisplayDate(busiest.date)}（${busiest.unlockCount} 次）
- 解锁最少：${formatDisplayDate(quietest.date)}（${quietest.unlockCount} 次）`;
}

export function buildWeeklyPromptPayload(
  report: WeeklyReport,
  profile: BehaviorProfile | null = null,
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): string {
  const dayLines = report.days
    .filter((d) => d.unlockCount > 0 || d.sessionCount > 0)
    .map(
      (d) =>
        `- ${formatDisplayDate(d.date)}：解锁${d.unlockCount}次，${d.sessionCount}会话，快速查看${d.quickSessionCount}次`,
    )
    .join('\n');

  const triggerLines = report.topTriggers
    .map((t) => `- ${t.fromLabel} → ${t.toLabel}：${t.count}次`)
    .join('\n');

  const patternLines = report.topPatterns
    .map((p) => `- ${p.pathLabel}：${p.occurrenceDays}天出现`)
    .join('\n');

  const trendLines = formatWeeklyTrends(report);

  const profileSection = profile
    ? formatBehaviorProfile(profile)
    : '暂无足够历史数据建立长期画像';

  const deviationSection =
    profile && weekDateEventPairs.length > 0
      ? formatProfileDeviations(comparePeriodAgainstProfile(profile, weekDateEventPairs))
      : '暂无';

  return `统计区间：${report.startDate} 至 ${report.endDate}

## 一周概览
- 总解锁：${report.totalUnlocks} 次
- 日均解锁：${report.avgUnlocksPerDay} 次
- 高效会话：${report.totalProductiveSessions} 次
- 娱乐会话：${report.totalEntertainmentSessions} 次

## 长期行为画像（基于近 30 天）
${profileSection}

## 本周与长期画像的差异
${deviationSection}

## 周中趋势
${trendLines}

## 每日数据
${dayLines || '暂无'}

## 热门跳转路径（请重点解释这些路径出现的场景和可能原因）
${triggerLines || '暂无'}

## 重复行为路径
${patternLines || '暂无'}`;
}
