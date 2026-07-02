import type { BehaviorEvent, PhoneSession } from '../types/event';
import { extractAppSequence } from './pathAnalyzer';
import { analyzeSessionGoal, type SessionGoal } from './sessionGoalAnalyzer';
import { analyzeSessionMood, type SessionMoodResult } from './sessionMoodAnalyzer';
import { buildSessions } from './sessionAnalyzer';

export interface DiarySessionEntry {
  session: PhoneSession;
  goal: SessionGoal;
  mood: SessionMoodResult;
  appPath: Array<{ packageName: string; appLabel: string }>;
  /** @deprecated 使用 mood.mood === 'wandering' */
  isFragmented: boolean;
}

/** 从事件流构建日记时间线所需的会话视图模型 */
export function buildDiarySessions(events: BehaviorEvent[]): DiarySessionEntry[] {
  const sessions = buildSessions(events);

  return sessions.map((session) => {
    const appPath = extractAppSequence(session.events).map((item) => ({
      packageName: item.packageName,
      appLabel: item.appLabel,
    }));
    const goal = analyzeSessionGoal(session);
    const mood = analyzeSessionMood(session, goal);

    return {
      session,
      goal,
      mood,
      appPath,
      isFragmented: mood.mood === 'wandering',
    };
  });
}
