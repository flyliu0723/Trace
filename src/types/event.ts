/** 行为事件类型 */
export type EventType =
  | 'unlock'
  | 'screen_off'
  | 'app_foreground'
  | 'app_background'
  | 'media_start'
  | 'media_stop'
  | 'media_pause'
  | 'media_track_change'
  | 'activity_change'
  | 'posture_change'
  | 'service_start'
  | 'service_stop';

/** 事件来源 */
export type EventSource =
  | 'native'
  | 'usage_stats'
  | 'media_session'
  | 'reconcile'
  | 'recovery'
  | 'audio_playback'
  | 'service'
  | 'demo';

/** 原始行为事件（事件流最小单元） */
export interface BehaviorEvent {
  id?: number;
  type: EventType;
  timestamp: number;
  packageName?: string;
  appLabel?: string;
  metadata?: Record<string, string>;
  source: EventSource;
}

/** 一次手机使用会话 */
export interface PhoneSession {
  id: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  events: BehaviorEvent[];
  apps: string[];
  isQuickSession: boolean;
}

/** 按小时聚合的 App 使用 */
export interface HourlyAppUsage {
  hour: number;
  packageName: string;
  appLabel: string;
  durationMs: number;
}

/** 每日概览统计 */
export interface DailySummary {
  date: string;
  unlockCount: number;
  sessionCount: number;
  quickSessionCount: number;
  totalForegroundMs: number;
  activeInteractionMs: number;
  passiveMediaMs: number;
}
