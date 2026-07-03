import type { PhoneSession } from '../types/event';
import {
  classifyApp,
  ENTERTAINMENT_CATEGORIES,
  PRODUCTIVE_CATEGORIES,
} from './appClassifier';
import { formatDuration, formatTime } from './sessionAnalyzer';

export type SessionGoalType =
  | 'productive'
  | 'entertainment'
  | 'quick_glance'
  | 'mixed'
  | 'passive_media'
  | 'idle';

export interface SessionGoal {
  sessionId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  goalType: SessionGoalType;
  summary: string;
  taskCount: number;
  appLabels: string[];
}

const GOAL_TYPE_LABELS: Record<SessionGoalType, string> = {
  productive: '完成任务',
  entertainment: '娱乐浏览',
  quick_glance: '快速查看',
  mixed: '混合使用',
  passive_media: '后台陪伴',
  idle: '无明确目标',
};

export function getGoalTypeLabel(type: SessionGoalType): string {
  return GOAL_TYPE_LABELS[type];
}

function getSessionApps(session: PhoneSession): Array<{
  label: string;
  packageName: string;
  category: ReturnType<typeof classifyApp>;
}> {
  const seen = new Set<string>();
  const apps: Array<{ label: string; packageName: string; category: ReturnType<typeof classifyApp> }> = [];

  for (const event of session.events) {
    if (event.type !== 'app_foreground' || !event.appLabel || !event.packageName) {
      continue;
    }
    if (seen.has(event.packageName)) {
      continue;
    }
    seen.add(event.packageName);
    apps.push({
      label: event.appLabel,
      packageName: event.packageName,
      category: classifyApp(event.packageName, event.appLabel),
    });
  }
  return apps;
}

function hasMediaOnly(session: PhoneSession): boolean {
  const hasMedia = session.events.some(
    (e) => e.type === 'media_start' || e.type === 'media_track_change',
  );
  const foregroundApps = session.events.filter((e) => e.type === 'app_foreground');
  return hasMedia && foregroundApps.length <= 1;
}

export function analyzeSessionGoal(session: PhoneSession): SessionGoal {
  const apps = getSessionApps(session);
  const appLabels = apps.map((a) => a.label);
  const hasMedia = hasMediaOnly(session);

  if (session.isQuickSession) {
    return {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.durationMs,
      goalType: 'quick_glance',
      summary: `快速查看手机（${formatDuration(session.durationMs)}）`,
      taskCount: 0,
      appLabels,
    };
  }

  if (hasMedia && apps.length <= 1) {
    const mediaApp = apps[0]?.label ?? '音频应用';
    return {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.durationMs,
      goalType: 'passive_media',
      summary: `打开 ${mediaApp} 后开始播放，手机放下陪伴`,
      taskCount: 0,
      appLabels,
    };
  }

  const productiveApps = apps.filter((a) => PRODUCTIVE_CATEGORIES.has(a.category));
  const entertainmentApps = apps.filter((a) => ENTERTAINMENT_CATEGORIES.has(a.category));

  if (apps.length === 0) {
    return {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.durationMs,
      goalType: 'idle',
      summary: '解锁后没有打开任何应用',
      taskCount: 0,
      appLabels: [],
    };
  }

  if (productiveApps.length > 0 && entertainmentApps.length === 0) {
    const names = productiveApps.map((a) => a.label).join('、');
    const summary =
      productiveApps.length === 1
        ? `在 ${names} 上专注处理事务`
        : `在 ${names} 上专注处理多项事务`;
    return {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.durationMs,
      goalType: 'productive',
      summary,
      taskCount: productiveApps.length,
      appLabels,
    };
  }

  if (entertainmentApps.length > 0 && productiveApps.length === 0) {
    const uniqueEntertainment = new Set(entertainmentApps.map((a) => a.packageName));
    if (uniqueEntertainment.size === 1 && session.durationMs > 120_000) {
      return {
        sessionId: session.id,
        startTime: session.startTime,
        endTime: session.endTime,
        durationMs: session.durationMs,
        goalType: 'entertainment',
        summary: `在 ${entertainmentApps[0].label} 上沉浸浏览`,
        taskCount: 0,
        appLabels,
      };
    }
  }

  if (productiveApps.length > 0 && entertainmentApps.length > 0) {
    return {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.durationMs,
      goalType: 'mixed',
      summary: `混合使用：${appLabels.join(' → ')}`,
      taskCount: productiveApps.length,
      appLabels,
    };
  }

  if (entertainmentApps.length > 0) {
    return {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.durationMs,
      goalType: 'entertainment',
      summary: `浏览了 ${appLabels.join('、')}`,
      taskCount: 0,
      appLabels,
    };
  }

  return {
    sessionId: session.id,
    startTime: session.startTime,
    endTime: session.endTime,
    durationMs: session.durationMs,
    goalType: 'idle',
    summary: `使用了 ${appLabels.join('、')}`,
    taskCount: 0,
    appLabels,
  };
}

export function analyzeSessionGoals(sessions: PhoneSession[]): SessionGoal[] {
  return sessions.map(analyzeSessionGoal);
}

export function summarizeSessionGoals(goals: SessionGoal[]): {
  productiveCount: number;
  entertainmentCount: number;
  quickGlanceCount: number;
  totalTasks: number;
} {
  return {
    productiveCount: goals.filter((g) => g.goalType === 'productive').length,
    entertainmentCount: goals.filter((g) => g.goalType === 'entertainment').length,
    quickGlanceCount: goals.filter((g) => g.goalType === 'quick_glance').length,
    totalTasks: goals.reduce((sum, g) => sum + g.taskCount, 0),
  };
}

export function formatSessionGoalLine(goal: SessionGoal): string {
  return `${formatTime(goal.startTime)} ${goal.summary}`;
}
