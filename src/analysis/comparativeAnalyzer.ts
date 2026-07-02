import type { BehaviorEvent } from '../types/event';
import {
  ENTERTAINMENT_CATEGORIES,
  PRODUCTIVE_CATEGORIES,
  classifyApp,
  type AppCategory,
} from './appClassifier';
import { buildDailySummary, buildSessions } from './sessionAnalyzer';
import { analyzeSessionGoals, summarizeSessionGoals } from './sessionGoalAnalyzer';

export interface MetricComparison {
  label: string;
  today: number;
  avgPastDays: number;
  changeLabel: string;
}

export interface AppUsageComparison {
  appLabel: string;
  todayCount: number;
  avgPastCount: number;
  changeLabel: string;
}

export interface DailyComparisonReport {
  baselineDays: number;
  metrics: MetricComparison[];
  categoryChanges: MetricComparison[];
  topAppChanges: AppUsageComparison[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatChangeLabel(today: number, avg: number): string {
  if (avg === 0 && today === 0) {
    return '持平';
  }
  if (avg === 0) {
    return '新增';
  }
  const pct = Math.round(((today - avg) / avg) * 100);
  if (pct === 0) {
    return '持平';
  }
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countForegroundByCategory(events: BehaviorEvent[], categories: Set<AppCategory>): number {
  const seen = new Set<string>();
  let count = 0;

  for (const event of events) {
    if (event.type !== 'app_foreground' || !event.packageName) {
      continue;
    }
    const key = `${event.timestamp}-${event.packageName}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const category = classifyApp(event.packageName, event.appLabel);
    if (categories.has(category)) {
      count += 1;
    }
  }

  return count;
}

function countForegroundByApp(events: BehaviorEvent[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const event of events) {
    if (event.type !== 'app_foreground' || !event.appLabel) {
      continue;
    }
    counts.set(event.appLabel, (counts.get(event.appLabel) ?? 0) + 1);
  }

  return counts;
}

function getLongestSessionMs(events: BehaviorEvent[]): number {
  const sessions = buildSessions(events);
  return sessions.reduce((max, session) => Math.max(max, session.durationMs), 0);
}

function buildDayMetrics(events: BehaviorEvent[]) {
  const summary = buildDailySummary('', events);
  const sessions = buildSessions(events);
  const goalSummary = summarizeSessionGoals(analyzeSessionGoals(sessions));

  return {
    unlockCount: summary.unlockCount,
    quickSessionCount: summary.quickSessionCount,
    sessionCount: summary.sessionCount,
    activeInteractionMinutes: round1(summary.activeInteractionMs / 60_000),
    productiveSessions: goalSummary.productiveCount,
    entertainmentSessions: goalSummary.entertainmentCount,
    longestSessionMinutes: round1(getLongestSessionMs(events) / 60_000),
    productiveAppOpens: countForegroundByCategory(events, PRODUCTIVE_CATEGORIES),
    entertainmentAppOpens: countForegroundByCategory(events, ENTERTAINMENT_CATEGORIES),
  };
}

function buildMetricComparison(
  label: string,
  today: number,
  pastValues: number[],
): MetricComparison {
  const avgPastDays = round1(average(pastValues));
  return {
    label,
    today,
    avgPastDays,
    changeLabel: formatChangeLabel(today, avgPastDays),
  };
}

/** 对比目标日与过去若干天的行为指标 */
export function analyzeDailyComparison(
  targetDate: string,
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  lookbackDays = 6,
): DailyComparisonReport | null {
  const sorted = [...dateEventPairs].sort((a, b) => a.date.localeCompare(b.date));
  const targetPair = sorted.find((pair) => pair.date === targetDate);
  if (!targetPair) {
    return null;
  }

  const pastPairs = sorted
    .filter((pair) => pair.date < targetDate)
    .slice(-lookbackDays)
    .filter((pair) => pair.events.length > 0);

  if (pastPairs.length === 0) {
    return null;
  }

  const todayMetrics = buildDayMetrics(targetPair.events);
  const pastMetrics = pastPairs.map((pair) => buildDayMetrics(pair.events));

  const metrics: MetricComparison[] = [
    buildMetricComparison(
      '解锁次数',
      todayMetrics.unlockCount,
      pastMetrics.map((m) => m.unlockCount),
    ),
    buildMetricComparison(
      '快速查看',
      todayMetrics.quickSessionCount,
      pastMetrics.map((m) => m.quickSessionCount),
    ),
    buildMetricComparison(
      '高效会话',
      todayMetrics.productiveSessions,
      pastMetrics.map((m) => m.productiveSessions),
    ),
    buildMetricComparison(
      '娱乐会话',
      todayMetrics.entertainmentSessions,
      pastMetrics.map((m) => m.entertainmentSessions),
    ),
    buildMetricComparison(
      '最长专注（分钟）',
      todayMetrics.longestSessionMinutes,
      pastMetrics.map((m) => m.longestSessionMinutes),
    ),
  ];

  const categoryChanges: MetricComparison[] = [
    buildMetricComparison(
      '学习/工具类打开',
      todayMetrics.productiveAppOpens,
      pastMetrics.map((m) => m.productiveAppOpens),
    ),
    buildMetricComparison(
      '娱乐/社交类打开',
      todayMetrics.entertainmentAppOpens,
      pastMetrics.map((m) => m.entertainmentAppOpens),
    ),
  ];

  const todayApps = countForegroundByApp(targetPair.events);
  const pastAppTotals = new Map<string, number[]>();

  for (const pair of pastPairs) {
    const appCounts = countForegroundByApp(pair.events);
    const labels = new Set([...todayApps.keys(), ...appCounts.keys()]);
    for (const label of labels) {
      const values = pastAppTotals.get(label) ?? [];
      values.push(appCounts.get(label) ?? 0);
      pastAppTotals.set(label, values);
    }
  }

  const topAppChanges: AppUsageComparison[] = [...pastAppTotals.entries()]
    .map(([appLabel, values]) => {
      const todayCount = todayApps.get(appLabel) ?? 0;
      const avgPastCount = round1(average(values));
      return {
        appLabel,
        todayCount,
        avgPastCount,
        changeLabel: formatChangeLabel(todayCount, avgPastCount),
      };
    })
    .filter((item) => item.todayCount > 0 || item.avgPastCount >= 1)
    .sort((a, b) => {
      const deltaA = Math.abs(a.todayCount - a.avgPastCount);
      const deltaB = Math.abs(b.todayCount - b.avgPastCount);
      return deltaB - deltaA;
    })
    .slice(0, 5);

  return {
    baselineDays: pastPairs.length,
    metrics,
    categoryChanges,
    topAppChanges,
  };
}

export function formatDailyComparisonReport(report: DailyComparisonReport): string {
  const metricLines = report.metrics
    .map((m) => `- ${m.label}：今日 ${m.today}，近${report.baselineDays}日均 ${m.avgPastDays}（${m.changeLabel}）`)
    .join('\n');

  const categoryLines = report.categoryChanges
    .map((m) => `- ${m.label}：今日 ${m.today}，近${report.baselineDays}日均 ${m.avgPastDays}（${m.changeLabel}）`)
    .join('\n');

  const appLines = report.topAppChanges
    .map(
      (item) =>
        `- ${item.appLabel}：今日 ${item.todayCount} 次，近${report.baselineDays}日均 ${item.avgPastCount} 次（${item.changeLabel}）`,
    )
    .join('\n');

  return `## 相比过去 ${report.baselineDays} 天
${metricLines}

## 类别变化
${categoryLines}

## 变化明显的 App
${appLines || '暂无'}`;
}

export function formatMinutesLabel(minutes: number): string {
  if (minutes < 1) {
    return '不足 1 分钟';
  }
  return `${minutes} 分钟`;
}
