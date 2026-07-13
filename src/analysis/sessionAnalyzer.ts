import { QUICK_SESSION_THRESHOLD_MS } from '../constants';
import type { BehaviorEvent, DailySummary, PhoneSession } from '../types/event';
import { getTodayDateString } from '../utils/dateUtils';
import {
  buildForegroundPeriods,
  resolveSessionForegroundEndTime,
} from './foregroundPeriodAnalyzer';
import { extractMediaSegments } from './mediaSceneAnalyzer';

export function getTodayDate(): string {
  return getTodayDateString();
}

/** 后台播放时长：与播客报告共用片段切分（含暂停合并、未闭合封顶、recovery 限制） */
export function calculatePassiveMediaMs(events: BehaviorEvent[]): number {
  return extractMediaSegments(events).reduce((sum, segment) => sum + segment.durationMs, 0);
}

/** 主动交互/亮屏：按 App 前台连续停留合计，不含解锁空档与放下后的虚高 */
export function calculateActiveInteractionMs(events: BehaviorEvent[]): number {
  return buildForegroundPeriods(events).reduce(
    (sum, period) => sum + Math.max(0, period.endTime - period.startTime),
    0,
  );
}

/** 将事件流切分为手机使用会话 */
export function buildSessions(events: BehaviorEvent[]): PhoneSession[] {
  const sessions: PhoneSession[] = [];
  let current: BehaviorEvent[] = [];
  let sessionStart = 0;

  for (const event of events) {
    if (event.type === 'unlock') {
      if (current.length > 0) {
        sessions.push(finalizeSession(current, sessionStart));
      }
      current = [event];
      sessionStart = event.timestamp;
      continue;
    }

    if (current.length === 0) {
      continue;
    }

    current.push(event);

    if (event.type === 'screen_off') {
      sessions.push(finalizeSession(current, sessionStart));
      current = [];
    }
  }

  if (current.length > 0) {
    sessions.push(finalizeSession(current, sessionStart));
  }

  return sessions;
}

function finalizeSession(events: BehaviorEvent[], startTime: number): PhoneSession {
  const endTime = resolveSessionForegroundEndTime(events, startTime);
  const durationMs = Math.max(0, endTime - startTime);
  const apps = [
    ...new Set(
      events
        .filter((e) => e.type === 'app_foreground' && e.packageName)
        .map((e) => e.packageName as string),
    ),
  ];

  return {
    id: `session-${startTime}`,
    startTime,
    endTime,
    durationMs,
    events,
    apps,
    isQuickSession: durationMs < QUICK_SESSION_THRESHOLD_MS,
  };
}

/** 从事件流计算每日概览 */
export function buildDailySummary(date: string, events: BehaviorEvent[]): DailySummary {
  const sessions = buildSessions(events);
  const unlockCount = events.filter((e) => e.type === 'unlock').length;
  const quickSessionCount = sessions.filter((s) => s.isQuickSession).length;
  const passiveMediaMs = calculatePassiveMediaMs(events);
  const activeInteractionMs = calculateActiveInteractionMs(events);

  let totalForegroundMs = 0;
  for (const session of sessions) {
    totalForegroundMs += session.durationMs;
  }

  return {
    date,
    unlockCount,
    sessionCount: sessions.length,
    quickSessionCount,
    totalForegroundMs,
    activeInteractionMs,
    passiveMediaMs,
  };
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function formatDuration(ms: number): string {
  if (ms < 60_000) {
    return `${Math.round(ms / 1000)}秒`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}分${seconds}秒` : `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  return remainMinutes > 0 ? `${hours}小时${remainMinutes}分` : `${hours}小时`;
}

export function formatMediaSubtitle(event: BehaviorEvent): string | null {
  const title = event.metadata?.title;
  const artist = event.metadata?.artist;
  if (title && artist) {
    return `${title} · ${artist}`;
  }
  return title ?? artist ?? null;
}
