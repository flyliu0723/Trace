import type { BehaviorEvent } from '../types/event';
import { classifyApp, type AppCategory } from './appClassifier';
import {
  analyzePathTriggers,
  buildAggregatedAppStats,
  buildChronologicalAppBlocks,
  extractDisplayAppSequence,
  type AppDwellBlock,
  type PathTrigger,
} from './pathAnalyzer';
import { buildSessions, formatTime } from './sessionAnalyzer';

export interface CategoryWeekDayStat {
  date: string;
  durationMs: number;
  visitCount: number;
}

/** 提取某分类在单日内的前台停留块 */
export function buildCategoryDwellBlocks(
  events: BehaviorEvent[],
  category: AppCategory,
): AppDwellBlock[] {
  const sessions = buildSessions(events);
  const blocks: AppDwellBlock[] = [];

  for (const session of sessions) {
    const sessionBlocks = buildChronologicalAppBlocks(session.events, session.endTime);
    for (const block of sessionBlocks) {
      if (classifyApp(block.packageName, block.appLabel) === category) {
        blocks.push(block);
      }
    }
  }

  return blocks.sort((a, b) => b.startTime - a.startTime);
}

export function resolveCategoryPeakHour(
  blocks: AppDwellBlock[],
): { hour: number; label: string } | null {
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

export function buildCategoryWeekDayStats(
  category: AppCategory,
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): CategoryWeekDayStat[] {
  return dateEventPairs.map(({ date, events }) => {
    const blocks = buildCategoryDwellBlocks(events, category);
    const apps = buildAggregatedAppStats(blocks);
    return {
      date,
      durationMs: apps.reduce((sum, app) => sum + app.durationMs, 0),
      visitCount: apps.reduce((sum, app) => sum + app.visitCount, 0),
    };
  });
}

export function sumCategoryWeekDuration(days: CategoryWeekDayStat[]): number {
  return days.reduce((sum, day) => sum + day.durationMs, 0);
}

export function buildCategoryCompareTriggers(
  events: BehaviorEvent[],
  category: AppCategory,
  windowMs = 60_000,
): PathTrigger[] {
  return analyzePathTriggers(events, windowMs)
    .filter(
      (trigger) =>
        classifyApp(trigger.fromPackage, trigger.fromLabel) === category
        && classifyApp(trigger.toPackage, trigger.toLabel) === category,
    )
    .slice(0, 5);
}

export function countCategoryAppSwitches(
  events: BehaviorEvent[],
  category: AppCategory,
): number {
  const sequence = extractDisplayAppSequence(events);
  let count = 0;
  for (let i = 0; i < sequence.length - 1; i += 1) {
    const from = sequence[i];
    const to = sequence[i + 1];
    const fromMatch = classifyApp(from.packageName, from.appLabel) === category;
    const toMatch = classifyApp(to.packageName, to.appLabel) === category;
    if (fromMatch || toMatch) {
      count += 1;
    }
  }
  return count;
}

export function formatPeakHourLabel(peak: { label: string } | null): string | null {
  return peak?.label ?? null;
}

export function formatBlockStartLine(block: AppDwellBlock): string {
  return `${formatTime(block.startTime)} 开始`;
}
