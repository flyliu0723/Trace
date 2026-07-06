import type { BehaviorEvent } from '../types/event';
import { isLauncherApp } from './launcherFilter';
import { buildForegroundPeriods } from './foregroundPeriodAnalyzer';

/** 触发器分析默认时间窗口（毫秒） */
export const DEFAULT_TRIGGER_WINDOW_MS = 30_000;

export interface PathTrigger {
  fromPackage: string;
  fromLabel: string;
  toPackage: string;
  toLabel: string;
  count: number;
  percentage: number;
}

export interface AppTransition {
  fromLabel: string;
  toLabel: string;
  gapMs: number;
}

export interface ForegroundApp {
  packageName: string;
  appLabel: string;
  timestamp: number;
}

export interface AppDwellBlock {
  packageName: string;
  appLabel: string;
  durationMs: number;
  startTime: number;
}

export interface AggregatedAppStat {
  packageName: string;
  appLabel: string;
  durationMs: number;
  visitCount: number;
}

/** 提取去重后的前台 App 序列（含 Launcher，保留原始粒度） */
export function extractAppSequence(events: BehaviorEvent[]): ForegroundApp[] {
  const sequence: ForegroundApp[] = [];
  let lastPkg = '';

  const sorted = [...events]
    .filter((e) => e.type === 'app_foreground' && e.packageName && e.appLabel)
    .sort((a, b) => a.timestamp - b.timestamp);

  for (const event of sorted) {
    const pkg = event.packageName as string;
    if (pkg === lastPkg) {
      continue;
    }
    lastPkg = pkg;
    sequence.push({
      packageName: pkg,
      appLabel: event.appLabel as string,
      timestamp: event.timestamp,
    });
  }

  return sequence;
}

/** 提取展示用前台序列（过滤 Launcher 中间态） */
export function extractDisplayAppSequence(events: BehaviorEvent[]): ForegroundApp[] {
  return extractAppSequence(events).filter(
    (item) => !isLauncherApp(item.packageName, item.appLabel),
  );
}

/** 按时间顺序合并连续停留，计算各 App 段时长 */
export function buildChronologicalAppBlocks(
  events: BehaviorEvent[],
  sessionEndTime: number,
): AppDwellBlock[] {
  const sessionStart = events[0]?.timestamp ?? 0;
  const periods = buildForegroundPeriods(events).filter(
    (period) => period.endTime > sessionStart && period.startTime < sessionEndTime,
  );

  const blocks: AppDwellBlock[] = [];

  for (const period of periods) {
    const startTime = Math.max(period.startTime, sessionStart);
    const endTime = Math.min(period.endTime, sessionEndTime);
    const durationMs = Math.max(0, endTime - startTime);
    if (durationMs <= 0) {
      continue;
    }

    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && lastBlock.packageName === period.packageName) {
      lastBlock.durationMs += durationMs;
      continue;
    }

    blocks.push({
      packageName: period.packageName,
      appLabel: period.appLabel,
      durationMs,
      startTime,
    });
  }

  return blocks;
}

/** 按 App 聚合停留时长与进入次数 */
export function buildAggregatedAppStats(blocks: AppDwellBlock[]): AggregatedAppStat[] {
  const statMap = new Map<string, AggregatedAppStat>();

  for (const block of blocks) {
    const existing = statMap.get(block.packageName);
    if (existing) {
      existing.durationMs += block.durationMs;
      existing.visitCount += 1;
      continue;
    }
    statMap.set(block.packageName, {
      packageName: block.packageName,
      appLabel: block.appLabel,
      durationMs: block.durationMs,
      visitCount: 1,
    });
  }

  return [...statMap.values()].sort((a, b) => b.durationMs - a.durationMs);
}

/** 分析 App 跳转触发器（A 打开后 N 秒内打开 B） */
export function analyzePathTriggers(
  events: BehaviorEvent[],
  windowMs = DEFAULT_TRIGGER_WINDOW_MS,
): PathTrigger[] {
  const sequence = extractDisplayAppSequence(events);
  const transitionCounts = new Map<string, number>();
  const toAppTotals = new Map<string, number>();

  for (let i = 0; i < sequence.length - 1; i += 1) {
    const from = sequence[i];
    const to = sequence[i + 1];
    const gapMs = to.timestamp - from.timestamp;

    if (gapMs > windowMs || from.packageName === to.packageName) {
      continue;
    }

    const key = `${from.packageName}→${to.packageName}`;
    transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + 1);
    toAppTotals.set(to.packageName, (toAppTotals.get(to.packageName) ?? 0) + 1);
  }

  const triggers: PathTrigger[] = [];
  for (const [key, count] of transitionCounts) {
    const [fromPkg, toPkg] = key.split('→');
    const fromApp = sequence.find((a) => a.packageName === fromPkg);
    const toApp = sequence.find((a) => a.packageName === toPkg);
    if (!fromApp || !toApp) {
      continue;
    }

    const toTotal = toAppTotals.get(toPkg) ?? count;
    triggers.push({
      fromPackage: fromPkg,
      fromLabel: fromApp.appLabel,
      toPackage: toPkg,
      toLabel: toApp.appLabel,
      count,
      percentage: Math.round((count / toTotal) * 100),
    });
  }

  return triggers.sort((a, b) => b.count - a.count);
}

/** 获取 Top N 跳转路径的文字描述 */
export function formatPathTrigger(trigger: PathTrigger, windowSec = 30): string {
  return `${trigger.percentage}% 的「${trigger.toLabel}」来自「${trigger.fromLabel}」后的 ${windowSec} 秒内（${trigger.count} 次）`;
}
