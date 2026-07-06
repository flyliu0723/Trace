import type { BehaviorEvent, PhoneSession } from '../types/event';
import {
  buildChronologicalAppBlocks,
  extractDisplayAppSequence,
  type AppDwellBlock,
} from './pathAnalyzer';
import { analyzeSessionGoal, type SessionGoal } from './sessionGoalAnalyzer';
import { analyzeSessionMood, type SessionMoodResult } from './sessionMoodAnalyzer';
import { buildSessions } from './sessionAnalyzer';

export interface DiarySessionEntry {
  session: PhoneSession;
  goal: SessionGoal;
  mood: SessionMoodResult;
  /** 展示用跳转路径（已过滤 Launcher） */
  appPath: Array<{ packageName: string; appLabel: string }>;
  /** 按时间顺序的行为块（时长 + App） */
  appBlocks: AppDwellBlock[];
  /** @deprecated 使用 mood.mood === 'wandering' */
  isFragmented: boolean;
}

/** 从事件流构建日记时间线所需的会话视图模型 */
export function buildDiarySessions(events: BehaviorEvent[]): DiarySessionEntry[] {
  const sessions = buildSessions(events);

  return sessions.map((session) => {
    const appPath = extractDisplayAppSequence(session.events).map((item) => ({
      packageName: item.packageName,
      appLabel: item.appLabel,
    }));
    const appBlocks = buildChronologicalAppBlocks(session.events, session.endTime);
    const goal = analyzeSessionGoal(session);
    const mood = analyzeSessionMood(session, goal);

    return {
      session,
      goal,
      mood,
      appPath,
      appBlocks,
      isFragmented: mood.mood === 'wandering',
    };
  });
}
