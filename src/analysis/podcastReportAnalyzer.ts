import type { BehaviorEvent } from '../types/event';
import { addDays, formatDisplayDate, formatMonthRangeLabel, formatWeekRangeLabel, getMondayOfWeek } from '../utils/dateUtils';
import {
  analyzeContextMedia,
  type ContextMediaBucket,
  type ContextMediaSegment,
  type DailyContextMediaReport,
} from './contextMediaAnalyzer';
import {
  analyzeDailyMediaScenes,
  analyzeMediaSceneHabits,
  formatMediaSegmentCountLabel,
  sumMediaPauseCount,
  type DailyMediaSceneReport,
} from './mediaSceneAnalyzer';
import { classifyApp } from './appClassifier';
import { PODCAST_ESTIMATED_ACTIVE_OPEN_MS } from '../constants';
import { formatDuration, formatTime } from './sessionAnalyzer';

export interface PodcastCompanionInsight {
  companionRatePercent: number;
  contextualMs: number;
  passiveMs: number;
  estimatedActiveMs: number;
  insight: string;
}

export interface PodcastTitleStat {
  title: string;
  appLabel: string;
  durationMs: number;
  playCount: number;
}

export interface PodcastAppStat {
  appLabel: string;
  packageName?: string;
  durationMs: number;
  segmentCount: number;
}

export interface PodcastWeekDayStat {
  date: string;
  listeningMs: number;
  segmentCount: number;
}

export interface PodcastReport {
  date: string;
  hasData: boolean;
  hasActivityData: boolean;
  totalListeningMs: number;
  segmentCount: number;
  totalPauseCount: number;
  trackCount: number;
  foregroundOpenCount: number;
  peakHour: number | null;
  peakHourLabel: string | null;
  contextMedia: DailyContextMediaReport | null;
  mediaScenes: DailyMediaSceneReport | null;
  topSegments: ContextMediaSegment[];
  topTitles: PodcastTitleStat[];
  topApps: PodcastAppStat[];
  weekDays: PodcastWeekDayStat[];
  weekTotalMs: number;
  weekActiveDays: number;
  weekAvgMs: number;
  prevWeekTotalMs: number;
  weekTrendPercent: number | null;
  sceneHabits: string[];
  companion: PodcastCompanionInsight | null;
}

const MEDIA_CATEGORY = new Set(['media']);

function isMediaApp(packageName?: string, appLabel?: string): boolean {
  return MEDIA_CATEGORY.has(classifyApp(packageName, appLabel));
}

function countForegroundOpensDuringListening(
  events: BehaviorEvent[],
  segments: ContextMediaSegment[],
): number {
  if (segments.length === 0) {
    return 0;
  }

  let count = 0;
  for (const event of events) {
    if (event.type !== 'app_foreground') {
      continue;
    }
    if (!isMediaApp(event.packageName, event.appLabel)) {
      continue;
    }
    const inSegment = segments.some(
      (segment) =>
        event.timestamp >= segment.startTime
        && event.timestamp < segment.endTime
        && (event.appLabel === segment.appLabel
          || (event.packageName && event.packageName === segment.packageName)),
    );
    if (inSegment) {
      count += 1;
    }
  }
  return count;
}

function resolvePeakHour(segments: ContextMediaSegment[]): { hour: number; label: string } | null {
  if (segments.length === 0) {
    return null;
  }

  const hourMs = new Array(24).fill(0) as number[];
  for (const segment of segments) {
    const startHour = new Date(segment.startTime).getHours();
    hourMs[startHour] += segment.durationMs;
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

/** 计算播客伴随率：总收听中「非主动盯着播放器」的占比 */
export function buildPodcastCompanionInsight(
  contextMedia: DailyContextMediaReport | null,
  totalListeningMs: number,
  foregroundOpenCount: number,
): PodcastCompanionInsight | null {
  if (!contextMedia || totalListeningMs <= 0) {
    return null;
  }

  const vehicleMs =
    contextMedia.buckets.find((bucket) => bucket.context === 'in_vehicle')?.totalDurationMs ?? 0;
  const walkingMs =
    contextMedia.buckets.find((bucket) => bucket.context === 'walking')?.totalDurationMs ?? 0;
  const passiveMs =
    contextMedia.buckets.find((bucket) => bucket.context === 'passive')?.totalDurationMs ?? 0;
  const contextualMs = vehicleMs + walkingMs;
  const estimatedActiveMs = Math.min(
    foregroundOpenCount * PODCAST_ESTIMATED_ACTIVE_OPEN_MS,
    totalListeningMs,
  );
  const companionRatePercent = Math.max(
    0,
    Math.min(100, Math.round(((totalListeningMs - estimatedActiveMs) / totalListeningMs) * 100)),
  );

  let insight = '收听以陪伴为主，手机更多是在身边响着。';
  if (contextualMs >= totalListeningMs * 0.35) {
    const parts: string[] = [];
    if (vehicleMs > 0) {
      parts.push(`行进 ${formatDuration(vehicleMs)}`);
    }
    if (walkingMs > 0) {
      parts.push(`步行 ${formatDuration(walkingMs)}`);
    }
    insight = `超过三分之一的收听伴随在生活移动中（${parts.join('、')}）。`;
  } else if (passiveMs >= totalListeningMs * 0.6) {
    insight = '多数收听发生在后台陪伴，不必一直盯着屏幕。';
  } else if (foregroundOpenCount >= 3) {
    insight = '今天有几次主动打开播放器，其余时间更像数字陪伴。';
  }

  return {
    companionRatePercent,
    contextualMs,
    passiveMs,
    estimatedActiveMs,
    insight,
  };
}

export function buildPodcastCompanionFromEvents(
  events: BehaviorEvent[],
  contextMedia: DailyContextMediaReport | null | undefined,
): PodcastCompanionInsight | null {
  const segments = contextMedia?.segments ?? [];
  const totalListeningMs = contextMedia?.totalBackgroundMs ?? 0;
  if (totalListeningMs <= 0) {
    return null;
  }
  return buildPodcastCompanionInsight(
    contextMedia ?? null,
    totalListeningMs,
    countForegroundOpensDuringListening(events, segments),
  );
}

function buildTopTitles(segments: ContextMediaSegment[]): PodcastTitleStat[] {
  const map = new Map<string, PodcastTitleStat>();

  for (const segment of segments) {
    const title = segment.title?.trim() || '未知节目';
    const key = `${segment.appLabel}::${title}`;
    const existing = map.get(key);
    if (existing) {
      existing.durationMs += segment.durationMs;
      existing.playCount += 1;
      continue;
    }
    map.set(key, {
      title,
      appLabel: segment.appLabel,
      durationMs: segment.durationMs,
      playCount: 1,
    });
  }

  return [...map.values()].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8);
}

function buildTopApps(segments: ContextMediaSegment[]): PodcastAppStat[] {
  const map = new Map<string, PodcastAppStat>();

  for (const segment of segments) {
    const key = segment.packageName ?? segment.appLabel;
    const existing = map.get(key);
    if (existing) {
      existing.durationMs += segment.durationMs;
      existing.segmentCount += 1;
      continue;
    }
    map.set(key, {
      appLabel: segment.appLabel,
      packageName: segment.packageName,
      durationMs: segment.durationMs,
      segmentCount: 1,
    });
  }

  return [...map.values()].sort((a, b) => b.durationMs - a.durationMs);
}

function buildWeekDayStats(
  date: string,
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): PodcastWeekDayStat[] {
  return dateEventPairs.map(({ date: day, events }) => {
    const report = analyzeContextMedia(events);
    return {
      date: day,
      listeningMs: report?.totalBackgroundMs ?? 0,
      segmentCount: report?.segments.length ?? 0,
    };
  });
}

function sumWeekListening(days: PodcastWeekDayStat[]): number {
  return days.reduce((sum, day) => sum + day.listeningMs, 0);
}

/** 构建单日播客收听专题报告（含近 7 日对比） */
export function buildPodcastReport(
  date: string,
  events: BehaviorEvent[],
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): PodcastReport {
  const contextMedia = analyzeContextMedia(events);
  const mediaScenes = analyzeDailyMediaScenes(events);
  const segments = contextMedia?.segments ?? [];
  const peak = resolvePeakHour(segments);

  const weekMonday = getMondayOfWeek(date);
  const prevWeekMonday = addDays(weekMonday, -7);
  const prevWeekSunday = addDays(prevWeekMonday, 6);
  const currentWeekPairs = weekDateEventPairs.filter(
    (pair) => pair.date >= weekMonday && pair.date <= addDays(weekMonday, 6),
  );
  const prevWeekPairs = weekDateEventPairs.filter(
    (pair) => pair.date >= prevWeekMonday && pair.date <= prevWeekSunday,
  );

  const weekDays = buildWeekDayStats(date, currentWeekPairs);
  const weekTotalMs = sumWeekListening(weekDays);
  const weekActiveDays = weekDays.filter((day) => day.listeningMs > 0).length;
  const weekAvgMs = weekActiveDays > 0 ? weekTotalMs / weekActiveDays : 0;
  const prevWeekTotalMs = sumWeekListening(buildWeekDayStats(date, prevWeekPairs));

  let weekTrendPercent: number | null = null;
  if (prevWeekTotalMs > 0 && weekTotalMs > 0) {
    weekTrendPercent = Math.round(((weekTotalMs - prevWeekTotalMs) / prevWeekTotalMs) * 100);
  }

  const trackCount = contextMedia?.buckets.reduce((sum, bucket) => sum + bucket.trackCount, 0) ?? 0;
  const totalListeningMs = contextMedia?.totalBackgroundMs ?? mediaScenes?.totalDurationMs ?? 0;
  const foregroundOpenCount = countForegroundOpensDuringListening(events, segments);

  return {
    date,
    hasData: segments.length > 0,
    hasActivityData: contextMedia?.hasActivityData ?? false,
    totalListeningMs,
    segmentCount: segments.length,
    totalPauseCount: sumMediaPauseCount(segments),
    trackCount,
    foregroundOpenCount,
    peakHour: peak?.hour ?? null,
    peakHourLabel: peak?.label ?? null,
    contextMedia,
    mediaScenes,
    topSegments: segments.slice(0, 8),
    topTitles: buildTopTitles(segments),
    topApps: buildTopApps(segments),
    weekDays,
    weekTotalMs,
    weekActiveDays,
    weekAvgMs,
    prevWeekTotalMs,
    weekTrendPercent,
    sceneHabits: analyzeMediaSceneHabits(currentWeekPairs),
    companion: buildPodcastCompanionInsight(contextMedia, totalListeningMs, foregroundOpenCount),
  };
}

/** 构建周/月聚合报告（用于 AI 解读） */
export function buildPodcastPeriodReport(
  anchorDate: string,
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  comparePairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): PodcastReport {
  const allEvents = dateEventPairs.flatMap((pair) => pair.events);
  const contextMedia = analyzeContextMedia(allEvents);
  const mediaScenes = analyzeDailyMediaScenes(allEvents);
  const segments = contextMedia?.segments ?? [];
  const peak = resolvePeakHour(segments);
  const dayStats = buildWeekDayStats(anchorDate, dateEventPairs);
  const periodTotalMs = sumWeekListening(dayStats);
  const activeDays = dayStats.filter((day) => day.listeningMs > 0).length;
  const avgMs = activeDays > 0 ? periodTotalMs / activeDays : 0;
  const compareTotalMs = sumWeekListening(buildWeekDayStats(anchorDate, comparePairs));

  let weekTrendPercent: number | null = null;
  if (compareTotalMs > 0 && periodTotalMs > 0) {
    weekTrendPercent = Math.round(((periodTotalMs - compareTotalMs) / compareTotalMs) * 100);
  }

  const trackCount = contextMedia?.buckets.reduce((sum, bucket) => sum + bucket.trackCount, 0) ?? 0;
  const totalListeningMs = contextMedia?.totalBackgroundMs ?? mediaScenes?.totalDurationMs ?? 0;
  const foregroundOpenCount = countForegroundOpensDuringListening(allEvents, segments);

  return {
    date: anchorDate,
    hasData: segments.length > 0,
    hasActivityData: contextMedia?.hasActivityData ?? false,
    totalListeningMs,
    segmentCount: segments.length,
    totalPauseCount: sumMediaPauseCount(segments),
    trackCount,
    foregroundOpenCount,
    peakHour: peak?.hour ?? null,
    peakHourLabel: peak?.label ?? null,
    contextMedia,
    mediaScenes,
    topSegments: segments.slice(0, 10),
    topTitles: buildTopTitles(segments),
    topApps: buildTopApps(segments),
    weekDays: dayStats,
    weekTotalMs: periodTotalMs,
    weekActiveDays: activeDays,
    weekAvgMs: avgMs,
    prevWeekTotalMs: compareTotalMs,
    weekTrendPercent,
    sceneHabits: analyzeMediaSceneHabits(dateEventPairs),
    companion: buildPodcastCompanionInsight(contextMedia, totalListeningMs, foregroundOpenCount),
  };
}

export function formatContextBucketLine(bucket: ContextMediaBucket): string {
  return `- ${bucket.label}：${formatDuration(bucket.totalDurationMs)}，${formatMediaSegmentCountLabel(bucket.segmentCount, bucket.totalPauseCount)}，${bucket.trackCount} 集（${bucket.apps.join('、')}）`;
}

/** 构建播客本周 AI prompt */
export function formatPodcastWeeklyPayload(
  weekMonday: string,
  report: PodcastReport,
): string {
  if (!report.hasData) {
    return `统计区间：${formatWeekRangeLabel(weekMonday)}\n本周无播客/音乐收听记录。`;
  }
  return formatPodcastPeriodPayload('本周', formatWeekRangeLabel(weekMonday), report, '上周');
}

/** 构建播客本月 AI prompt */
export function formatPodcastMonthlyPayload(
  monthAnchor: string,
  report: PodcastReport,
): string {
  if (!report.hasData) {
    return `统计区间：${formatMonthRangeLabel(monthAnchor)}\n本月无播客/音乐收听记录。`;
  }
  return formatPodcastPeriodPayload('本月', formatMonthRangeLabel(monthAnchor), report, '上月');
}

function formatPodcastPeriodPayload(
  periodLabel: string,
  rangeLabel: string,
  report: PodcastReport,
  compareLabel: string,
): string {
  const contextLines = report.contextMedia?.buckets
    .slice(0, 3)
    .map((bucket) => `${bucket.label} ${formatDuration(bucket.totalDurationMs)}(${bucket.segmentCount}段/${bucket.trackCount}集)`)
    .join('，') ?? '暂无';

  const sceneLines = report.mediaScenes?.scenes
    .slice(0, 4)
    .map((scene) => `${scene.label} ${formatDuration(scene.durationMs)}`)
    .join('，') ?? '暂无';

  const titleLines = report.topTitles
    .slice(0, 5)
    .map((item) => `${item.appLabel}《${item.title}》${formatDuration(item.durationMs)}`)
    .join('，');

  const dayLines = report.weekDays
    .filter((day) => day.listeningMs > 0)
    .map((day) => `${formatDisplayDate(day.date)} ${formatDuration(day.listeningMs)}`)
    .join('，');

  const trendLine = report.weekTrendPercent !== null
    ? `较${compareLabel}${report.weekTrendPercent > 0 ? '+' : ''}${report.weekTrendPercent}%`
    : `无${compareLabel}对比`;

  const habitLines = report.sceneHabits.length > 0
    ? report.sceneHabits.slice(0, 2).join('；')
    : '样本不足';

  return `区间：${rangeLabel}
总收听 ${formatDuration(report.totalListeningMs)}｜${report.segmentCount}段 约${report.trackCount}集｜伴随率${report.companion?.companionRatePercent ?? '—'}%｜主动打开${report.foregroundOpenCount}次｜高峰${report.peakHourLabel ?? '无'}｜${report.weekActiveDays}/${report.weekDays.length}天｜${trendLine}
场景：${contextLines}
时段：${sceneLines}
节目：${titleLines || '无标题'}
逐日：${dayLines || '无'}
习惯：${habitLines}`;
}

/** @deprecated 仅保留兼容，AI 已改用周/月 payload */
export function formatPodcastReportPayload(report: PodcastReport): string {
  if (!report.hasData) {
    return `日期：${formatDisplayDate(report.date)}\n今日无播客/音乐收听记录。`;
  }

  const contextLines = report.contextMedia?.buckets.map(formatContextBucketLine).join('\n') ?? '暂无';
  const sceneLines = report.mediaScenes?.scenes
    .map((scene) => `- ${scene.label}：${formatDuration(scene.durationMs)}（${scene.apps.join('、')}）`)
    .join('\n') ?? '暂无';

  const segmentLines = report.topSegments
    .slice(0, 6)
    .map((segment) => {
      const title = segment.title ? `「${segment.title}」` : '';
      return `- ${formatTime(segment.startTime)} ${segment.appLabel}${title}：${formatDuration(segment.durationMs)}`;
    })
    .join('\n');

  const titleLines = report.topTitles
    .slice(0, 5)
    .map((item) => `- ${item.appLabel} ${item.title}：${formatDuration(item.durationMs)}（${item.playCount} 次）`)
    .join('\n');

  const weekLines = report.weekDays
    .filter((day) => day.listeningMs > 0)
    .map((day) => `- ${formatDisplayDate(day.date)}：${formatDuration(day.listeningMs)}，${day.segmentCount} 段`)
    .join('\n');

  const trendLine = report.weekTrendPercent !== null
    ? `较近 7 日总量变化约 ${report.weekTrendPercent > 0 ? '+' : ''}${report.weekTrendPercent}%`
    : '暂无足够上周数据做对比';

  const habitLines = report.sceneHabits.length > 0
    ? report.sceneHabits.map((habit) => `- ${habit}`).join('\n')
    : '样本不足';

  return `日期：${formatDisplayDate(report.date)}

## 今日收听概览
- 总收听：${formatDuration(report.totalListeningMs)}
- 播放段数：${formatMediaSegmentCountLabel(report.segmentCount, report.totalPauseCount)}，约 ${report.trackCount} 集
- 伴随率：${report.companion?.companionRatePercent ?? '—'}%
- 主动打开播放器：约 ${report.foregroundOpenCount} 次
- 高峰时段：${report.peakHourLabel ?? '暂无'}
- 有无身体活动数据：${report.hasActivityData ? '有' : '无'}

## 收听场景（行进/步行/陪伴）
${contextLines}

## 生活时段分布
${sceneLines}

## 主要节目
${titleLines || '暂无标题信息'}

## 播放片段
${segmentLines}

## 近 7 日收听
- 有收听的天数：${report.weekActiveDays}/7
- 7 日合计：${formatDuration(report.weekTotalMs)}
- 有收听日均：${formatDuration(report.weekAvgMs)}
- ${trendLine}

${weekLines || '近 7 日无收听'}

## 长期场景习惯（规则推断）
${habitLines}`;
}
