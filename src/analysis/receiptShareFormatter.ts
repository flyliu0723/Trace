import {
  RECEIPT_SHARE_MIN_DURATION_MS,
  RECEIPT_SHARE_MIN_VISIT_COUNT,
  RECEIPT_SHARE_TOP_N,
  RECEIPT_SHARE_WEEKLY_TOP_N,
} from '../constants';
import type { BehaviorEvent, DailySummary } from '../types/event';
import {
  formatDisplayDate,
  formatWeekRangeLabel,
  getMondayOfWeek,
} from '../utils/dateUtils';
import {
  classifyApp,
  getCategoryLabel,
  type AppCategory,
} from './appClassifier';
import { isLauncherApp } from './launcherFilter';
import {
  buildAggregatedAppStats,
  buildChronologicalAppBlocks,
  type AggregatedAppStat,
} from './pathAnalyzer';
import { buildDailySummary, buildSessions } from './sessionAnalyzer';

const RECEIPT_LINE = '━━━━━━━━━━━━━━━━━━━━';
const RECEIPT_DIVIDER = '────────────────────';
const RECEIPT_CATEGORY_ORDER: AppCategory[] = [
  'entertainment',
  'social',
  'media',
  'reading',
  'shopping',
  'work',
  'utility',
  'navigation',
  'other',
];

export type ReceiptKind = 'daily' | 'weekly';

export interface ReceiptAppLine {
  packageName: string;
  appLabel: string;
  durationMs: number;
  visitCount: number;
  category: AppCategory;
}

export interface ReceiptOthersLine {
  appCount: number;
  durationMs: number;
  visitCount: number;
}

export interface ReceiptCategorySection {
  category: AppCategory;
  label: string;
  lines: ReceiptAppLine[];
}

export interface ReceiptWeekDayStat {
  date: string;
  dayLabel: string;
  durationMs: number;
}

export interface ShareReceipt {
  kind: ReceiptKind;
  periodLabel: string;
  hasData: boolean;
  activeInteractionMs: number;
  unlockCount: number;
  sessionCount: number;
  quickSessionCount: number;
  passiveMediaMs: number;
  activeDays: number;
  avgActiveInteractionMs: number;
  weekDays: ReceiptWeekDayStat[];
  weekTrendPercent: number | null;
  sections: ReceiptCategorySection[];
  others: ReceiptOthersLine | null;
  topAppLabel: string | null;
}

/** @deprecated 使用 ShareReceipt */
export type DailyReceipt = ShareReceipt;

function qualifiesForReceiptLine(stat: AggregatedAppStat): boolean {
  return (
    stat.durationMs >= RECEIPT_SHARE_MIN_DURATION_MS
    || stat.visitCount >= RECEIPT_SHARE_MIN_VISIT_COUNT
  );
}

function buildDayAggregatedAppStats(events: BehaviorEvent[]): AggregatedAppStat[] {
  const sessions = buildSessions(events);
  const blocks = [];

  for (const session of sessions) {
    blocks.push(...buildChronologicalAppBlocks(session.events, session.endTime));
  }

  const filteredBlocks = blocks.filter(
    (block) => !isLauncherApp(block.packageName, block.appLabel),
  );

  return buildAggregatedAppStats(filteredBlocks);
}

function mergeAggregatedAppStats(statsList: AggregatedAppStat[][]): AggregatedAppStat[] {
  const statMap = new Map<string, AggregatedAppStat>();

  for (const stats of statsList) {
    for (const stat of stats) {
      const existing = statMap.get(stat.packageName);
      if (existing) {
        existing.durationMs += stat.durationMs;
        existing.visitCount += stat.visitCount;
        if (!existing.appLabel && stat.appLabel) {
          existing.appLabel = stat.appLabel;
        }
        continue;
      }
      statMap.set(stat.packageName, { ...stat });
    }
  }

  return [...statMap.values()].sort((a, b) => b.durationMs - a.durationMs);
}

function toReceiptLine(stat: AggregatedAppStat): ReceiptAppLine {
  return {
    packageName: stat.packageName,
    appLabel: stat.appLabel,
    durationMs: stat.durationMs,
    visitCount: stat.visitCount,
    category: classifyApp(stat.packageName, stat.appLabel),
  };
}

function groupFeaturedLines(lines: ReceiptAppLine[]): ReceiptCategorySection[] {
  const sectionMap = new Map<AppCategory, ReceiptAppLine[]>();

  for (const line of lines) {
    const existing = sectionMap.get(line.category) ?? [];
    existing.push(line);
    sectionMap.set(line.category, existing);
  }

  return RECEIPT_CATEGORY_ORDER
    .map((category) => {
      const categoryLines = sectionMap.get(category);
      if (!categoryLines || categoryLines.length === 0) {
        return null;
      }
      return {
        category,
        label: getCategoryLabel(category),
        lines: [...categoryLines].sort((a, b) => b.durationMs - a.durationMs),
      };
    })
    .filter((section): section is ReceiptCategorySection => section !== null);
}

function buildOthersLine(stats: AggregatedAppStat[]): ReceiptOthersLine | null {
  if (stats.length === 0) {
    return null;
  }

  return {
    appCount: stats.length,
    durationMs: stats.reduce((sum, stat) => sum + stat.durationMs, 0),
    visitCount: stats.reduce((sum, stat) => sum + stat.visitCount, 0),
  };
}

function buildReceiptSections(
  allStats: AggregatedAppStat[],
  topN: number,
): Pick<ShareReceipt, 'sections' | 'others'> {
  const qualified = allStats.filter(qualifiesForReceiptLine);
  const featuredStats = qualified.slice(0, topN);
  const featuredPackages = new Set(featuredStats.map((stat) => stat.packageName));
  const remainderStats = allStats.filter((stat) => !featuredPackages.has(stat.packageName));
  const featuredLines = featuredStats.map(toReceiptLine);

  return {
    sections: groupFeaturedLines(featuredLines),
    others: buildOthersLine(remainderStats),
  };
}

function sumDailySummaries(summaries: DailySummary[]): Pick<
  ShareReceipt,
  | 'activeInteractionMs'
  | 'unlockCount'
  | 'sessionCount'
  | 'quickSessionCount'
  | 'passiveMediaMs'
  | 'activeDays'
  | 'avgActiveInteractionMs'
> {
  const activeInteractionMs = summaries.reduce((sum, item) => sum + item.activeInteractionMs, 0);
  const activeDays = summaries.filter(
    (item) => item.activeInteractionMs > 0 || item.unlockCount > 0,
  ).length;

  return {
    activeInteractionMs,
    unlockCount: summaries.reduce((sum, item) => sum + item.unlockCount, 0),
    sessionCount: summaries.reduce((sum, item) => sum + item.sessionCount, 0),
    quickSessionCount: summaries.reduce((sum, item) => sum + item.quickSessionCount, 0),
    passiveMediaMs: summaries.reduce((sum, item) => sum + item.passiveMediaMs, 0),
    activeDays,
    avgActiveInteractionMs: activeDays > 0 ? activeInteractionMs / activeDays : 0,
  };
}

function buildWeekDayStats(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): ReceiptWeekDayStat[] {
  return dateEventPairs.map(({ date, events }) => {
    const summary = buildDailySummary(date, events);
    const dateLabel = formatDisplayDate(date).replace(/今天\s/, '');
    return {
      date,
      dayLabel: dateLabel.slice(-3) || dateLabel,
      durationMs: summary.activeInteractionMs,
    };
  });
}

function buildWeekTrendPercent(
  currentMs: number,
  prevWeekPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): number | null {
  const prevSummaries = prevWeekPairs.map(({ date, events }) => buildDailySummary(date, events));
  const prevTotalMs = prevSummaries.reduce((sum, item) => sum + item.activeInteractionMs, 0);
  if (prevTotalMs <= 0 || currentMs <= 0) {
    return null;
  }
  return Math.round(((currentMs - prevTotalMs) / prevTotalMs) * 100);
}

/** 构建当日分享小票数据 */
export function buildDailyReceipt(
  date: string,
  events: BehaviorEvent[],
  summary?: DailySummary | null,
): ShareReceipt {
  const daySummary = summary ?? buildDailySummary(date, events);
  const allStats = buildDayAggregatedAppStats(events);
  const { sections, others } = buildReceiptSections(allStats, RECEIPT_SHARE_TOP_N);
  const hasData =
    daySummary.activeInteractionMs > 0
    || daySummary.unlockCount > 0
    || allStats.length > 0;

  return {
    kind: 'daily',
    periodLabel: formatDisplayDate(date),
    hasData,
    activeInteractionMs: daySummary.activeInteractionMs,
    unlockCount: daySummary.unlockCount,
    sessionCount: daySummary.sessionCount,
    quickSessionCount: daySummary.quickSessionCount,
    passiveMediaMs: daySummary.passiveMediaMs,
    activeDays: hasData ? 1 : 0,
    avgActiveInteractionMs: daySummary.activeInteractionMs,
    weekDays: [],
    weekTrendPercent: null,
    sections,
    others,
    topAppLabel: allStats[0]?.appLabel ?? null,
  };
}

/** 构建本周（周一至周日）分享小票数据 */
export function buildWeeklyReceipt(
  anchorDate: string,
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  prevWeekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): ShareReceipt {
  const weekMonday = getMondayOfWeek(anchorDate);
  const summaries = weekDateEventPairs.map(({ date, events }) => buildDailySummary(date, events));
  const totals = sumDailySummaries(summaries);
  const dayStatsList = weekDateEventPairs.map(({ events }) => buildDayAggregatedAppStats(events));
  const allStats = mergeAggregatedAppStats(dayStatsList);
  const { sections, others } = buildReceiptSections(allStats, RECEIPT_SHARE_WEEKLY_TOP_N);
  const hasData =
    totals.activeInteractionMs > 0
    || totals.unlockCount > 0
    || allStats.length > 0;

  return {
    kind: 'weekly',
    periodLabel: formatWeekRangeLabel(weekMonday),
    hasData,
    ...totals,
    weekDays: buildWeekDayStats(weekDateEventPairs),
    weekTrendPercent: buildWeekTrendPercent(totals.activeInteractionMs, prevWeekDateEventPairs),
    sections,
    others,
    topAppLabel: allStats[0]?.appLabel ?? null,
  };
}

/** 小票展示用时长格式 */
export function formatReceiptDuration(ms: number): string {
  if (ms < 60_000) {
    return `${Math.max(1, Math.round(ms / 1000))}秒`;
  }
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes > 0 ? `${hours}小时${remainMinutes}分` : `${hours}小时`;
}

function truncateAppLabel(label: string, maxLength = 8): string {
  if (label.length <= maxLength) {
    return label;
  }
  return `${label.slice(0, maxLength - 1)}…`;
}

function formatAppLine(line: ReceiptAppLine): string {
  const name = truncateAppLabel(line.appLabel).padEnd(8, ' ');
  return `${name}${formatReceiptDuration(line.durationMs).padStart(8, ' ')}  ·  ${line.visitCount}次`;
}

function formatMetricLine(label: string, value: string): string {
  return `${label.padEnd(6, ' ')}${value}`;
}

function getReceiptTitle(kind: ReceiptKind): string {
  return kind === 'weekly' ? '周结小票' : '日结小票';
}

/** 将分享小票格式化为可分享纯文本 */
export function formatShareReceiptText(receipt: ShareReceipt): string {
  const title = getReceiptTitle(receipt.kind);
  const lines: string[] = [
    RECEIPT_LINE,
    `   SpendWhere · ${title}`,
    RECEIPT_LINE,
    receipt.periodLabel,
    '',
    '▎概览',
    formatMetricLine('亮屏', formatReceiptDuration(receipt.activeInteractionMs)),
    formatMetricLine('解锁', `${receipt.unlockCount} 次`),
    formatMetricLine('会话', `${receipt.sessionCount} 次`),
  ];

  if (receipt.kind === 'weekly') {
    lines.push(
      formatMetricLine('有记录', `${receipt.activeDays} 天`),
      formatMetricLine('日均', formatReceiptDuration(receipt.avgActiveInteractionMs)),
    );
    if (receipt.weekTrendPercent !== null) {
      const sign = receipt.weekTrendPercent > 0 ? '+' : '';
      lines.push(formatMetricLine('较上周', `${sign}${receipt.weekTrendPercent}%`));
    }
  }

  if (receipt.quickSessionCount > 0) {
    lines.push(formatMetricLine('快看', `${receipt.quickSessionCount} 次`));
  }
  if (receipt.passiveMediaMs > 0) {
    lines.push(formatMetricLine('后台', formatReceiptDuration(receipt.passiveMediaMs)));
  }

  if (receipt.sections.length === 0 && !receipt.others) {
    const emptyHint = receipt.kind === 'weekly' ? '本周还没有可分享的使用记录。' : '今天还没有可分享的使用记录。';
    lines.push('', emptyHint, RECEIPT_LINE);
    return lines.join('\n');
  }

  if (receipt.kind === 'weekly' && receipt.weekDays.some((day) => day.durationMs > 0)) {
    lines.push('', '▎每日亮屏');
    for (const day of receipt.weekDays) {
      if (day.durationMs <= 0) {
        continue;
      }
      lines.push(formatMetricLine(day.dayLabel, formatReceiptDuration(day.durationMs)));
    }
  }

  for (const section of receipt.sections) {
    lines.push('', `▎${section.label}`);
    for (const appLine of section.lines) {
      lines.push(formatAppLine(appLine));
    }
  }

  if (receipt.others && receipt.others.appCount > 0) {
    lines.push(
      '',
      RECEIPT_DIVIDER,
      `其他(${receipt.others.appCount}个App)  ${formatReceiptDuration(receipt.others.durationMs)} · ${receipt.others.visitCount}次`,
      RECEIPT_DIVIDER,
    );
  }

  if (receipt.topAppLabel) {
    lines.push('', `${receipt.kind === 'weekly' ? '本周' : '今日'}最常：${receipt.topAppLabel}`);
  }

  lines.push(RECEIPT_LINE);
  return lines.join('\n');
}

/** @deprecated 使用 formatShareReceiptText */
export function formatDailyReceiptText(receipt: ShareReceipt): string {
  return formatShareReceiptText(receipt);
}

/** 构建并格式化当日分享文本 */
export function buildDailyReceiptShareText(
  date: string,
  events: BehaviorEvent[],
  summary?: DailySummary | null,
): string {
  return formatShareReceiptText(buildDailyReceipt(date, events, summary));
}

/** 构建并格式化本周分享文本 */
export function buildWeeklyReceiptShareText(
  anchorDate: string,
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  prevWeekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): string {
  return formatShareReceiptText(
    buildWeeklyReceipt(anchorDate, weekDateEventPairs, prevWeekDateEventPairs),
  );
}
