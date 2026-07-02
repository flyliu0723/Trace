import { WANDERING_REPEAT_MIN_PATH_LENGTH } from '../constants';
import type { BehaviorEvent } from '../types/event';
import { buildDiarySessions } from './diarySessionBuilder';

/** 将会话 App 路径编码为可比较键 */
export function buildWanderingPathKey(
  apps: Array<{ packageName: string }>,
): string {
  if (apps.length < WANDERING_REPEAT_MIN_PATH_LENGTH) {
    return '';
  }
  return apps.map((app) => app.packageName).join('→');
}

function collectWanderingPathKeys(events: BehaviorEvent[]): Set<string> {
  const keys = new Set<string>();

  for (const entry of buildDiarySessions(events)) {
    if (entry.mood.mood !== 'wandering') {
      continue;
    }
    const key = buildWanderingPathKey(entry.appPath);
    if (key) {
      keys.add(key);
    }
  }

  return keys;
}

/** 找出今日游离会话中，路径在昨日也出现过的 sessionId */
export function findRepeatedWanderingSessionIds(
  todayEvents: BehaviorEvent[],
  yesterdayEvents: BehaviorEvent[],
): Set<string> {
  const yesterdayPaths = collectWanderingPathKeys(yesterdayEvents);
  if (yesterdayPaths.size === 0) {
    return new Set();
  }

  const repeated = new Set<string>();

  for (const entry of buildDiarySessions(todayEvents)) {
    if (entry.mood.mood !== 'wandering') {
      continue;
    }
    const key = buildWanderingPathKey(entry.appPath);
    if (key && yesterdayPaths.has(key)) {
      repeated.add(entry.session.id);
    }
  }

  return repeated;
}
