import {
  FLOW_MIN_DURATION_MS,
  WANDERING_MIN_SWITCHES,
  WANDERING_SHORT_SESSION_MS,
  WANDERING_WINDOW_MS,
} from '../constants';
import type { PhoneSession } from '../types/event';
import { classifyApp, ENTERTAINMENT_CATEGORIES } from './appClassifier';
import { isLauncherApp } from './launcherFilter';
import { extractDisplayAppSequence } from './pathAnalyzer';
import type { SessionGoal } from './sessionGoalAnalyzer';

export type SessionMood = 'flow' | 'normal' | 'wandering';

export type WanderingReason =
  | 'rapid_switch'
  | 'aimless_browse'
  | 'idle_loop';

export interface SessionMoodResult {
  mood: SessionMood;
  switchCount: number;
  switchRate: number;
  dominantApp?: string;
  wanderingReason?: WanderingReason;
}

function countSwitchesInWindow(
  sequence: ReturnType<typeof extractDisplayAppSequence>,
  windowMs: number,
): number {
  let maxSwitches = 0;

  for (let i = 0; i < sequence.length; i += 1) {
    const windowStart = sequence[i].timestamp;
    let switches = 0;

    for (let j = i + 1; j < sequence.length; j += 1) {
      if (sequence[j].timestamp - windowStart > windowMs) {
        break;
      }
      switches += 1;
    }

    maxSwitches = Math.max(maxSwitches, switches);
  }

  return maxSwitches;
}

function hasRapidSwitching(sequence: ReturnType<typeof extractDisplayAppSequence>): boolean {
  return countSwitchesInWindow(sequence, WANDERING_WINDOW_MS) > WANDERING_MIN_SWITCHES;
}

function countEntertainmentApps(session: PhoneSession): number {
  const seen = new Set<string>();
  let count = 0;

  for (const event of session.events) {
    if (event.type !== 'app_foreground' || !event.packageName || !event.appLabel) {
      continue;
    }
    if (seen.has(event.packageName)) {
      continue;
    }
    if (isLauncherApp(event.packageName, event.appLabel)) {
      continue;
    }
    seen.add(event.packageName);
    const category = classifyApp(event.packageName, event.appLabel);
    if (ENTERTAINMENT_CATEGORIES.has(category)) {
      count += 1;
    }
  }

  return count;
}

/** 分析会话专注状态：心流 / 普通 / 游离 */
export function analyzeSessionMood(
  session: PhoneSession,
  goal?: SessionGoal,
): SessionMoodResult {
  const sequence = extractDisplayAppSequence(session.events);
  const switchCount = Math.max(0, sequence.length - 1);
  const durationMinutes = Math.max(session.durationMs / 60_000, 0.5);
  const switchRate = switchCount / durationMinutes;
  const uniqueApps = new Set(sequence.map((item) => item.packageName));

  const entertainmentCount = countEntertainmentApps(session);
  const isRapidSwitch = hasRapidSwitching(sequence);
  const isIdleLoop = goal?.goalType === 'idle' && switchCount >= 2;
  const isAimlessBrowse =
    entertainmentCount >= 3 && session.durationMs < WANDERING_SHORT_SESSION_MS;

  if (isRapidSwitch || isIdleLoop || isAimlessBrowse) {
    let wanderingReason: WanderingReason = 'rapid_switch';
    if (isIdleLoop) {
      wanderingReason = 'idle_loop';
    } else if (isAimlessBrowse && !isRapidSwitch) {
      wanderingReason = 'aimless_browse';
    }

    return {
      mood: 'wandering',
      switchCount,
      switchRate,
      wanderingReason,
    };
  }

  if (
    session.durationMs >= FLOW_MIN_DURATION_MS
    && uniqueApps.size <= 2
    && uniqueApps.size > 0
  ) {
    const dominantApp = sequence[0]?.appLabel;
    return {
      mood: 'flow',
      switchCount,
      switchRate,
      dominantApp,
    };
  }

  return {
    mood: 'normal',
    switchCount,
    switchRate,
  };
}

export function getSessionMoodLabel(mood: SessionMood): string {
  if (mood === 'flow') {
    return '心流';
  }
  if (mood === 'wandering') {
    return '游离';
  }
  return '普通';
}
