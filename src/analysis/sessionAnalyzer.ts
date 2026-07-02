import { QUICK_SESSION_THRESHOLD_MS } from '../constants';
import type { BehaviorEvent, DailySummary, PhoneSession } from '../types/event';
import { getTodayDateString } from '../utils/dateUtils';

const MEDIA_PLAY_TYPES = new Set<BehaviorEvent['type']>(['media_start']);
const MEDIA_END_TYPES = new Set<BehaviorEvent['type']>(['media_pause', 'media_stop']);

export function getTodayDate(): string {
  return getTodayDateString();
}

/** 从媒体事件计算实际播放时长（排除暂停时段） */
export function calculatePassiveMediaMs(events: BehaviorEvent[]): number {
  const mediaEvents = events
    .filter((e) => MEDIA_PLAY_TYPES.has(e.type) || MEDIA_END_TYPES.has(e.type))
    .sort((a, b) => a.timestamp - b.timestamp);

  let total = 0;
  let playStart: number | null = null;

  for (const event of mediaEvents) {
    if (event.type === 'media_start') {
      if (playStart === null) {
        playStart = event.timestamp;
      }
      continue;
    }

    if (playStart !== null) {
      total += Math.max(0, event.timestamp - playStart);
      playStart = null;
    }
  }

  if (playStart !== null) {
    const lastTimestamp = events[events.length - 1]?.timestamp ?? Date.now();
    total += Math.max(0, lastTimestamp - playStart);
  }

  return total;
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
  const endTime = events[events.length - 1]?.timestamp ?? startTime;
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

  let totalForegroundMs = 0;
  for (const session of sessions) {
    totalForegroundMs += session.durationMs;
  }

  const activeInteractionMs = Math.max(0, totalForegroundMs);

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
