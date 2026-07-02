import type { BehaviorEvent, PhoneSession } from '../types/event';
import { buildSessions } from './sessionAnalyzer';
import { extractAppSequence } from './pathAnalyzer';

export interface BehaviorPattern {
  path: string[];
  pathLabel: string;
  occurrenceDays: number;
  totalCount: number;
}

const MIN_PATTERN_LENGTH = 3;
const MIN_OCCURRENCE_DAYS = 2;

/** 从 App 序列中提取固定长度的子路径 */
function extractSubPaths(labels: string[], length: number): string[] {
  if (labels.length < length) {
    return [];
  }
  const paths: string[] = [];
  for (let i = 0; i <= labels.length - length; i += 1) {
    paths.push(labels.slice(i, i + length).join('→'));
  }
  return paths;
}

/** 分析多日重复的行为路径模式 */
export function analyzeBehaviorPatterns(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  patternLength = MIN_PATTERN_LENGTH,
): BehaviorPattern[] {
  const pathDaySet = new Map<string, Set<string>>();
  const pathTotalCount = new Map<string, number>();
  const pathLabels = new Map<string, string[]>();

  for (const { date, events } of dateEventPairs) {
    const sessions = buildSessions(events);
    const dayPaths = new Set<string>();

    for (const session of sessions) {
      const apps = extractAppSequence(session.events).map((a) => a.appLabel);
      const subPaths = extractSubPaths(apps, patternLength);
      for (const pathKey of subPaths) {
        dayPaths.add(pathKey);
        pathTotalCount.set(pathKey, (pathTotalCount.get(pathKey) ?? 0) + 1);
        if (!pathLabels.has(pathKey)) {
          pathLabels.set(pathKey, pathKey.split('→'));
        }
      }
    }

    for (const pathKey of dayPaths) {
      const days = pathDaySet.get(pathKey) ?? new Set();
      days.add(date);
      pathDaySet.set(pathKey, days);
    }
  }

  const patterns: BehaviorPattern[] = [];
  for (const [pathKey, days] of pathDaySet) {
    if (days.size < MIN_OCCURRENCE_DAYS) {
      continue;
    }
    patterns.push({
      path: pathLabels.get(pathKey) ?? pathKey.split('→'),
      pathLabel: pathKey.replace(/→/g, ' → '),
      occurrenceDays: days.size,
      totalCount: pathTotalCount.get(pathKey) ?? 0,
    });
  }

  return patterns.sort((a, b) => b.occurrenceDays - a.occurrenceDays || b.totalCount - a.totalCount);
}

/** 分析某时段的频繁解锁（分心时段） */
export function analyzeDistractionHours(
  events: BehaviorEvent[],
  threshold = 5,
): Array<{ hour: number; unlockCount: number }> {
  const hourly = new Array(24).fill(0) as number[];
  for (const event of events) {
    if (event.type === 'unlock') {
      hourly[new Date(event.timestamp).getHours()] += 1;
    }
  }
  return hourly
    .map((unlockCount, hour) => ({ hour, unlockCount }))
    .filter((cell) => cell.unlockCount >= threshold)
    .sort((a, b) => b.unlockCount - a.unlockCount);
}

/** 检测下班后的行为链（18:00 后首个长会话的路径） */
export function analyzeAfterWorkPattern(events: BehaviorEvent[]): string[] | null {
  const sessions = buildSessions(events);
  const eveningSession = sessions.find((s) => {
    const hour = new Date(s.startTime).getHours();
    return hour >= 18 && s.apps.length >= 2 && s.durationMs > 60_000;
  });
  if (!eveningSession) {
    return null;
  }
  return extractAppSequence(eveningSession.events).map((a) => a.appLabel);
}
