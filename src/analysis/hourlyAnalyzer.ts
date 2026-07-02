import { LONG_DWELL_THRESHOLD_MS } from '../constants';
import type { BehaviorEvent } from '../types/event';
import { formatTime } from './sessionAnalyzer';

export interface HourlyLongDwell {
  packageName: string;
  appLabel: string;
  durationMs: number;
  startTime: number;
  endTime: number;
}

export interface HourlyAppSlot {
  hour: number;
  packageName?: string;
  appLabel?: string;
  openCount: number;
  durationMs: number;
  longDwells: HourlyLongDwell[];
}

interface ForegroundPeriod {
  packageName: string;
  appLabel: string;
  startTime: number;
  endTime: number;
}

interface HourAppStats {
  label: string;
  openCount: number;
  durationMs: number;
}

/** 从事件流重建 App 前台连续停留时段 */
function buildForegroundPeriods(events: BehaviorEvent[]): ForegroundPeriod[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const periods: ForegroundPeriod[] = [];
  let current: { packageName: string; appLabel: string; startTime: number } | null = null;

  const closeCurrent = (endTime: number) => {
    if (!current || endTime <= current.startTime) {
      current = null;
      return;
    }
    periods.push({
      packageName: current.packageName,
      appLabel: current.appLabel,
      startTime: current.startTime,
      endTime,
    });
    current = null;
  };

  for (const event of sorted) {
    if (event.type === 'unlock' || event.type === 'screen_off') {
      closeCurrent(event.timestamp);
      continue;
    }

    if (event.type !== 'app_foreground' || !event.appLabel) {
      continue;
    }

    const packageName = event.packageName ?? event.appLabel;
    if (current?.packageName === packageName) {
      continue;
    }

    closeCurrent(event.timestamp);
    current = {
      packageName,
      appLabel: event.appLabel,
      startTime: event.timestamp,
    };
  }

  if (current) {
    const fallbackEnd = sorted[sorted.length - 1]?.timestamp ?? current.startTime;
    closeCurrent(fallbackEnd);
  }

  return periods;
}

function getHourBounds(referenceTimestamp: number, hour: number): { start: number; end: number } {
  const date = new Date(referenceTimestamp);
  date.setMinutes(0, 0, 0);
  date.setHours(hour);
  const start = date.getTime();
  return { start, end: start + 60 * 60_000 };
}

function clipPeriodToHour(
  period: ForegroundPeriod,
  hourStart: number,
  hourEnd: number,
): { durationMs: number } | null {
  const overlapStart = Math.max(period.startTime, hourStart);
  const overlapEnd = Math.min(period.endTime, hourEnd);
  if (overlapEnd <= overlapStart) {
    return null;
  }
  return { durationMs: overlapEnd - overlapStart };
}

function formatDwellRange(startTime: number, endTime: number): string {
  return `${formatTime(startTime)}–${formatTime(endTime)}`;
}

export function formatLongDwellLine(dwell: HourlyLongDwell): string {
  const minutes = Math.max(1, Math.round(dwell.durationMs / 60_000));
  return `${dwell.appLabel} ${formatDwellRange(dwell.startTime, dwell.endTime)}（${minutes} 分钟）`;
}

/** 按小时统计 App 使用时长、打开次数与长时间停留 */
export function buildHourlyTopApps(events: BehaviorEvent[]): HourlyAppSlot[] {
  const referenceTimestamp = events[0]?.timestamp ?? Date.now();
  const periods = buildForegroundPeriods(events);

  const openCountMap = new Map<number, Map<string, HourAppStats>>();

  for (const event of events) {
    if (event.type !== 'app_foreground' || !event.appLabel) {
      continue;
    }
    const hour = new Date(event.timestamp).getHours();
    const pkg = event.packageName ?? event.appLabel;
    const hourApps = openCountMap.get(hour) ?? new Map<string, HourAppStats>();
    const existing = hourApps.get(pkg) ?? {
      label: event.appLabel,
      openCount: 0,
      durationMs: 0,
    };
    existing.openCount += 1;
    hourApps.set(pkg, existing);
    openCountMap.set(hour, hourApps);
  }

  for (let hour = 0; hour < 24; hour += 1) {
    const { start: hourStart, end: hourEnd } = getHourBounds(referenceTimestamp, hour);
    const hourApps = openCountMap.get(hour) ?? new Map<string, HourAppStats>();

    for (const period of periods) {
      const clipped = clipPeriodToHour(period, hourStart, hourEnd);
      if (!clipped) {
        continue;
      }
      const existing = hourApps.get(period.packageName) ?? {
        label: period.appLabel,
        openCount: 0,
        durationMs: 0,
      };
      existing.durationMs += clipped.durationMs;
      hourApps.set(period.packageName, existing);
    }

    openCountMap.set(hour, hourApps);
  }

  const result: HourlyAppSlot[] = [];

  for (let hour = 0; hour < 24; hour += 1) {
    const { start: hourStart, end: hourEnd } = getHourBounds(referenceTimestamp, hour);
    const hourApps = openCountMap.get(hour);

    const longDwells: HourlyLongDwell[] = [];
    for (const period of periods) {
      const periodDuration = period.endTime - period.startTime;
      if (periodDuration < LONG_DWELL_THRESHOLD_MS) {
        continue;
      }
      const clipped = clipPeriodToHour(period, hourStart, hourEnd);
      if (!clipped) {
        continue;
      }
      longDwells.push({
        packageName: period.packageName,
        appLabel: period.appLabel,
        durationMs: periodDuration,
        startTime: period.startTime,
        endTime: period.endTime,
      });
    }

    longDwells.sort((a, b) => b.durationMs - a.durationMs);

    if (!hourApps || hourApps.size === 0) {
      result.push({ hour, openCount: 0, durationMs: 0, longDwells: [] });
      continue;
    }

    let topPkg = '';
    let topLabel = '';
    let topOpenCount = 0;
    let topDurationMs = 0;

    for (const [pkg, stats] of hourApps) {
      if (stats.durationMs > topDurationMs || (stats.durationMs === topDurationMs && stats.openCount > topOpenCount)) {
        topPkg = pkg;
        topLabel = stats.label;
        topOpenCount = stats.openCount;
        topDurationMs = stats.durationMs;
      }
    }

    result.push({
      hour,
      packageName: topPkg,
      appLabel: topLabel,
      openCount: topOpenCount,
      durationMs: topDurationMs,
      longDwells,
    });
  }

  return result;
}

export function formatHourlyUsageLine(openCount: number, durationMs: number): string {
  const parts: string[] = [];
  if (openCount > 0) {
    parts.push(`打开 ${openCount} 次`);
  }
  if (durationMs >= 60_000) {
    const minutes = Math.max(1, Math.round(durationMs / 60_000));
    parts.push(`共 ${minutes} 分钟`);
  } else if (openCount > 0) {
    parts.push('共不足 1 分钟');
  }
  return parts.join(' · ');
}
