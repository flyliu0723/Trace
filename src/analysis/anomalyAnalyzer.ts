import type { BehaviorEvent } from '../types/event';
import { addDays } from '../utils/dateUtils';
import { formatTime } from './sessionAnalyzer';

export interface BehaviorAnomaly {
  id: string;
  label: string;
  description: string;
}

const LATE_NIGHT_HOUR = 23;
const MIN_APP_PRESENCE_DAYS = 3;
const MIN_APP_DAILY_OPENS = 2;

function getFirstUnlockTimestamp(events: BehaviorEvent[]): number | null {
  const unlocks = events.filter((e) => e.type === 'unlock');
  if (unlocks.length === 0) {
    return null;
  }
  return Math.min(...unlocks.map((e) => e.timestamp));
}

function getLastActivityTimestamp(events: BehaviorEvent[]): number | null {
  const activityTypes = new Set<BehaviorEvent['type']>([
    'unlock',
    'app_foreground',
    'screen_off',
    'media_start',
    'media_track_change',
  ]);
  const activities = events.filter((e) => activityTypes.has(e.type));
  if (activities.length === 0) {
    return null;
  }
  return Math.max(...activities.map((e) => e.timestamp));
}

function minutesOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return date.getHours() * 60 + date.getMinutes();
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMinuteDelta(deltaMinutes: number): string {
  const abs = Math.abs(deltaMinutes);
  if (abs < 60) {
    return `${abs} 分钟`;
  }
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes > 0 ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
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

function isLateNight(timestamp: number): boolean {
  const date = new Date(timestamp);
  return date.getHours() >= LATE_NIGHT_HOUR;
}

function isAfterMidnight(timestamp: number): boolean {
  const date = new Date(timestamp);
  return date.getHours() < 5;
}

/** 检测目标日相对历史的异常行为 */
export function analyzeBehaviorAnomalies(
  targetDate: string,
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  lookbackDays = 6,
): BehaviorAnomaly[] {
  const anomalies: BehaviorAnomaly[] = [];
  const sorted = [...dateEventPairs].sort((a, b) => a.date.localeCompare(b.date));
  const targetPair = sorted.find((pair) => pair.date === targetDate);
  if (!targetPair || targetPair.events.length === 0) {
    return anomalies;
  }

  const pastPairs = sorted
    .filter((pair) => pair.date < targetDate)
    .slice(-lookbackDays)
    .filter((pair) => pair.events.length > 0);

  const firstUnlock = getFirstUnlockTimestamp(targetPair.events);
  const lastActivity = getLastActivityTimestamp(targetPair.events);

  if (firstUnlock !== null && pastPairs.length > 0) {
    const pastFirstMinutes = pastPairs
      .map((pair) => getFirstUnlockTimestamp(pair.events))
      .filter((value): value is number => value !== null)
      .map(minutesOfDay);

    if (pastFirstMinutes.length > 0) {
      const todayMinutes = minutesOfDay(firstUnlock);
      const avgMinutes = average(pastFirstMinutes);
      const delta = Math.round(todayMinutes - avgMinutes);

      if (Math.abs(delta) >= 30) {
        anomalies.push({
          id: 'first-use-time',
          label: '首次使用手机',
          description:
            delta > 0
              ? `今天第一次使用手机在 ${formatTime(firstUnlock)}，比过去 ${pastFirstMinutes.length} 天平均晚 ${formatMinuteDelta(delta)}。`
              : `今天第一次使用手机在 ${formatTime(firstUnlock)}，比过去 ${pastFirstMinutes.length} 天平均早 ${formatMinuteDelta(delta)}。`,
        });
      }
    }
  }

  if (lastActivity !== null) {
    const lastTimeLabel = formatTime(lastActivity);

    if (isAfterMidnight(lastActivity)) {
      let streak = 1;
      let cursorDate = targetDate;
      while (true) {
        const prevDate = addDays(cursorDate, -1);
        const prevPair = sorted.find((pair) => pair.date === prevDate);
        if (!prevPair || prevPair.events.length === 0) {
          break;
        }
        const prevLast = getLastActivityTimestamp(prevPair.events);
        if (prevLast === null || !isAfterMidnight(prevLast)) {
          break;
        }
        streak += 1;
        cursorDate = prevDate;
      }

      if (streak >= 2) {
        anomalies.push({
          id: 'late-night-streak',
          label: '深夜使用',
          description: `睡前最后一次使用在 ${lastTimeLabel}，已连续 ${streak} 天超过 0 点。`,
        });
      } else {
        anomalies.push({
          id: 'late-night-use',
          label: '深夜使用',
          description: `睡前最后一次使用在 ${lastTimeLabel}，已超过 0 点。`,
        });
      }
    } else if (isLateNight(lastActivity) && pastPairs.length > 0) {
      const pastLateCount = pastPairs.filter((pair) => {
        const last = getLastActivityTimestamp(pair.events);
        return last !== null && isLateNight(last);
      }).length;

      if (pastLateCount <= 1) {
        anomalies.push({
          id: 'late-evening-use',
          label: '晚间使用偏晚',
          description: `睡前最后一次使用在 ${lastTimeLabel}，比你最近 ${pastPairs.length} 天的大多数日子更晚。`,
        });
      }
    }
  }

  if (pastPairs.length >= 3) {
    const todayApps = countForegroundByApp(targetPair.events);
    const appDayCounts = new Map<string, number>();

    for (const pair of pastPairs) {
      const apps = new Set(
        pair.events
          .filter((e) => e.type === 'app_foreground' && e.appLabel)
          .map((e) => e.appLabel as string),
      );
      for (const appLabel of apps) {
        appDayCounts.set(appLabel, (appDayCounts.get(appLabel) ?? 0) + 1);
      }
    }

    const absentApps = [...appDayCounts.entries()]
      .filter(([appLabel, dayCount]) => {
        if (dayCount < MIN_APP_PRESENCE_DAYS) {
          return false;
        }
        const todayCount = todayApps.get(appLabel) ?? 0;
        if (todayCount > 0) {
          return false;
        }
        const avgOpens =
          pastPairs.reduce((sum, pair) => sum + (countForegroundByApp(pair.events).get(appLabel) ?? 0), 0) /
          pastPairs.length;
        return avgOpens >= MIN_APP_DAILY_OPENS;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    for (const [appLabel, dayCount] of absentApps) {
      anomalies.push({
        id: `absent-${appLabel}`,
        label: '今天没出现的常用 App',
        description: `今天没有打开 ${appLabel}，但过去 ${dayCount} 天几乎每天都会用到。`,
      });
    }
  }

  return anomalies;
}

export function formatBehaviorAnomalies(anomalies: BehaviorAnomaly[]): string {
  if (anomalies.length === 0) {
    return '暂无';
  }
  return anomalies.map((item) => `- ${item.label}：${item.description}`).join('\n');
}
