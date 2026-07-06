import { FOREGROUND_IDLE_CAP_MS } from '../constants';
import type { BehaviorEvent } from '../types/event';

export interface ForegroundPeriod {
  packageName: string;
  appLabel: string;
  startTime: number;
  endTime: number;
}

interface ActiveForeground {
  packageName: string;
  appLabel: string;
  startTime: number;
}

function resolvePackageName(event: BehaviorEvent): string | null {
  if (!event.appLabel) {
    return null;
  }
  return event.packageName ?? event.appLabel;
}

/** 从事件流重建 App 前台连续停留时段（含 app_background 与空闲上限） */
export function buildForegroundPeriods(events: BehaviorEvent[]): ForegroundPeriod[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const periods: ForegroundPeriod[] = [];
  let active: ActiveForeground | null = null;
  let lastActiveTime = 0;

  const closeActive = (endTime: number) => {
    if (!active || endTime <= active.startTime) {
      active = null;
      lastActiveTime = 0;
      return;
    }
    periods.push({
      packageName: active.packageName,
      appLabel: active.appLabel,
      startTime: active.startTime,
      endTime,
    });
    active = null;
    lastActiveTime = 0;
  };

  const closeWithIdleCap = (boundaryTime: number) => {
    if (!active) {
      return;
    }
    closeActive(Math.min(boundaryTime, lastActiveTime + FOREGROUND_IDLE_CAP_MS));
  };

  for (const event of sorted) {
    if (event.type === 'unlock' || event.type === 'screen_off') {
      closeWithIdleCap(event.timestamp);
      continue;
    }

    if (event.type === 'app_background') {
      const packageName = event.packageName;
      if (packageName && active && active.packageName === packageName) {
        closeActive(event.timestamp);
      }
      continue;
    }

    if (event.type !== 'app_foreground') {
      continue;
    }

    const packageName = resolvePackageName(event);
    if (!packageName) {
      continue;
    }

    if (active && active.packageName === packageName) {
      lastActiveTime = event.timestamp;
      continue;
    }

    if (active) {
      closeWithIdleCap(event.timestamp);
    }

    active = {
      packageName,
      appLabel: event.appLabel as string,
      startTime: event.timestamp,
    };
    lastActiveTime = event.timestamp;
  }

  if (active) {
    const trailing = active;
    const lastScreenOff = [...sorted]
      .reverse()
      .find((event) => event.type === 'screen_off' && event.timestamp > trailing.startTime);
    const naturalEnd = lastScreenOff?.timestamp ?? lastActiveTime + FOREGROUND_IDLE_CAP_MS;
    closeActive(Math.min(naturalEnd, lastActiveTime + FOREGROUND_IDLE_CAP_MS));
  }

  return periods;
}

/** 计算会话内前台停留的合理结束时间 */
export function resolveSessionForegroundEndTime(events: BehaviorEvent[], sessionStart: number): number {
  const screenOffEvent = [...events].reverse().find((event) => event.type === 'screen_off');
  if (screenOffEvent) {
    return screenOffEvent.timestamp;
  }

  const periods = buildForegroundPeriods(events).filter((period) => period.endTime > sessionStart);
  if (periods.length > 0) {
    return Math.max(...periods.map((period) => period.endTime));
  }

  return events[events.length - 1]?.timestamp ?? sessionStart;
}
