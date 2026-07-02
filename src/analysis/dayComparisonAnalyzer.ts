import type { BehaviorEvent } from '../types/event';
import { extractAppSequence } from './pathAnalyzer';

export interface DayPathComparison {
  newTodayPaths: string[];
  absentTodayPaths: string[];
  recoveredPatterns: string[];
}

const MIN_PATH_LENGTH = 3;
const MAX_PATHS = 3;

function extractSessionPaths(events: BehaviorEvent[], pathLength = MIN_PATH_LENGTH): Set<string> {
  const sequence = extractAppSequence(events).map((item) => item.appLabel);
  const paths = new Set<string>();

  for (let i = 0; i <= sequence.length - pathLength; i += 1) {
    paths.add(sequence.slice(i, i + pathLength).join(' → '));
  }

  return paths;
}

function findRecoveredPatterns(
  todayEvents: BehaviorEvent[],
  yesterdayEvents: BehaviorEvent[],
): string[] {
  const todaySequence = extractAppSequence(todayEvents).map((item) => item.appLabel);
  const yesterdaySequence = extractAppSequence(yesterdayEvents).map((item) => item.appLabel);
  const recovered: string[] = [];

  for (let i = 0; i < todaySequence.length - 2; i += 1) {
    const anchor = todaySequence[i];
    const middle = todaySequence[i + 1];
    const end = todaySequence[i + 2];
    if (anchor === end && anchor !== middle) {
      const pattern = `${anchor} → ${middle} → ${end}`;
      const hadDistractionYesterday = yesterdaySequence.some((_, idx) => {
        if (idx > yesterdaySequence.length - 3) {
          return false;
        }
        return (
          yesterdaySequence[idx] === anchor &&
          yesterdaySequence[idx + 1] === middle &&
          yesterdaySequence[idx + 2] !== anchor
        );
      });
      if (hadDistractionYesterday && !recovered.includes(pattern)) {
        recovered.push(pattern);
      }
    }
  }

  return recovered.slice(0, MAX_PATHS);
}

/** 对比今天与昨天的行为路径差异 */
export function compareDayPaths(
  todayEvents: BehaviorEvent[],
  yesterdayEvents: BehaviorEvent[],
): DayPathComparison | null {
  if (todayEvents.length === 0) {
    return null;
  }

  const todayPaths = extractSessionPaths(todayEvents);
  const yesterdayPaths = yesterdayEvents.length > 0 ? extractSessionPaths(yesterdayEvents) : new Set<string>();

  const newTodayPaths = [...todayPaths]
    .filter((path) => !yesterdayPaths.has(path))
    .slice(0, MAX_PATHS);

  const absentTodayPaths = [...yesterdayPaths]
    .filter((path) => !todayPaths.has(path))
    .slice(0, MAX_PATHS);

  const recoveredPatterns =
    yesterdayEvents.length > 0 ? findRecoveredPatterns(todayEvents, yesterdayEvents) : [];

  if (newTodayPaths.length === 0 && absentTodayPaths.length === 0 && recoveredPatterns.length === 0) {
    return null;
  }

  return {
    newTodayPaths,
    absentTodayPaths,
    recoveredPatterns,
  };
}

export function formatDayPathComparison(comparison: DayPathComparison): string {
  const sections: string[] = [];

  if (comparison.newTodayPaths.length > 0) {
    sections.push(
      `今天新出现：\n${comparison.newTodayPaths.map((path) => `- ${path}`).join('\n')}`,
    );
  }

  if (comparison.absentTodayPaths.length > 0) {
    sections.push(
      `今天没再出现：\n${comparison.absentTodayPaths.map((path) => `- ${path}`).join('\n')}`,
    );
  }

  if (comparison.recoveredPatterns.length > 0) {
    sections.push(
      `打断后回归：\n${comparison.recoveredPatterns.map((path) => `- ${path}`).join('\n')}`,
    );
  }

  return sections.join('\n\n');
}
