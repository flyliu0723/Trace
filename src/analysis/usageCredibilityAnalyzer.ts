import { buildDailySummary, formatDuration } from '../analysis/sessionAnalyzer';
import {
  CREDIBILITY_FAIR_RATIO,
  CREDIBILITY_GOOD_RATIO,
} from '../constants';
import { BehaviorMonitor } from '../native/BehaviorMonitor';
import type { BehaviorEvent } from '../types/event';

export type CredibilityLevel = 'good' | 'fair' | 'poor' | 'unknown';

export interface DayCredibility {
  date: string;
  collectedMs: number;
  systemMs: number;
  ratio: number | null;
  level: CredibilityLevel;
  summary: string;
}

export interface DayDurationMetrics {
  collectedMs: number;
  systemMs: number;
  ratio: number | null;
  level: CredibilityLevel;
}

/** 首页亮屏卡片：采集时长 + 系统参考 */
export function formatDualDurationHint(metrics: DayDurationMetrics): string | undefined {
  if (metrics.systemMs <= 0) {
    return undefined;
  }
  const percent = metrics.ratio !== null ? Math.round(metrics.ratio * 100) : null;
  const systemText = `系统 ${formatDuration(metrics.systemMs)}`;
  if (percent === null) {
    return systemText;
  }
  return `${systemText} · 覆盖 ${percent}%`;
}

export function getCredibilityBannerKey(credibility: DayCredibility | null): string | null {
  if (
    !credibility ||
    (credibility.level !== 'fair' && credibility.level !== 'poor')
  ) {
    return null;
  }
  const percent = credibility.ratio !== null ? Math.round(credibility.ratio * 100) : 0;
  return `credibility:${credibility.date}:${credibility.level}:${percent}`;
}

export function getCredibilityBannerMessage(credibility: DayCredibility | null): string | null {
  if (
    !credibility ||
    (credibility.level !== 'fair' && credibility.level !== 'poor')
  ) {
    return null;
  }
  const percent = credibility.ratio !== null ? Math.round(credibility.ratio * 100) : 0;
  if (credibility.level === 'poor') {
    return `今日数据完整度偏低（${percent}%），建议检查权限或执行历史对账`;
  }
  return `今日数据完整度一般（${percent}%），可在设置中执行历史对账`;
}

export function buildDayDurationMetrics(credibility: DayCredibility): DayDurationMetrics {
  return {
    collectedMs: credibility.collectedMs,
    systemMs: credibility.systemMs,
    ratio: credibility.ratio,
    level: credibility.level,
  };
}

export function getCredibilityLevel(ratio: number | null): CredibilityLevel {
  if (ratio === null) {
    return 'unknown';
  }
  if (ratio >= CREDIBILITY_GOOD_RATIO) {
    return 'good';
  }
  if (ratio >= CREDIBILITY_FAIR_RATIO) {
    return 'fair';
  }
  return 'poor';
}

export function formatCredibilitySummary(
  collectedMs: number,
  systemMs: number,
  ratio: number | null,
  level: CredibilityLevel,
): string {
  if (level === 'unknown') {
    if (systemMs <= 0) {
      return '系统用量数据不可用';
    }
    return '无法计算可信度';
  }
  const percent = Math.round(ratio! * 100);
  return `采集 ${formatDuration(collectedMs)} / 系统 ${formatDuration(systemMs)}（${percent}%）`;
}

export async function buildDayCredibility(
  date: string,
  events: BehaviorEvent[],
  hasUsageAccess: boolean,
): Promise<DayCredibility> {
  const collectedMs = buildDailySummary(date, events).totalForegroundMs;

  if (!hasUsageAccess) {
    return {
      date,
      collectedMs,
      systemMs: 0,
      ratio: null,
      level: 'unknown',
      summary: '需开启使用情况访问',
    };
  }

  const systemMs = await BehaviorMonitor.getDaySystemForegroundMs(date);
  if (systemMs <= 0) {
    return {
      date,
      collectedMs,
      systemMs: 0,
      ratio: null,
      level: 'unknown',
      summary: collectedMs > 0 ? '系统暂无前台用量记录' : '今日暂无使用记录',
    };
  }

  const ratio = collectedMs / systemMs;
  const level = getCredibilityLevel(ratio);
  return {
    date,
    collectedMs,
    systemMs,
    ratio,
    level,
    summary: formatCredibilitySummary(collectedMs, systemMs, ratio, level),
  };
}
