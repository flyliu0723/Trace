export { buildDedupeKey } from './dedupeKey';
export type { AppUsageRecord } from './eventRepository';
export {
  clearAllEvents,
  fixMislabeledAppEvents,
  getEventsByDate,
  getEventsForDates,
  getEventsInRange,
  getLastEventTimestamp,
  getOpenMediaPackageNames,
  getDistinctAppUsage,
  getMislabeledPackageNames,
  getRecentEvents,
  getUnlockCountByDate,
  insertEvent,
  insertEvents,
} from './eventRepository';
export {
  isOnboardingCompleted,
  setOnboardingCompleted,
  getAiConfig,
  saveAiConfig,
  isAiConfigured,
  getAiAutoDailyEnabled,
  setAiAutoDailyEnabled,
  getAiAutoDailyLastAttempt,
  setAiAutoDailyLastAttempt,
  getAchievementsSeenAt,
  setAchievementsSeenAt,
  getSetting,
  setSetting,
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  getMonitorBannerDismissKey,
  setMonitorBannerDismissKey,
} from './settingsRepository';
export type { AiConfig } from './settingsRepository';
export {
  getCachedSummary,
  getCachedWeeklySummary,
  getCachedMonthlySummary,
  saveCachedSummary,
  deleteCachedSummary,
} from './summaryRepository';
export type { SummaryType } from './summaryRepository';
export type { SyncLogEntry, SyncLogKind } from './syncLogRepository';
export { getLastSyncLog, getRecentSyncLogs, saveSyncLog } from './syncLogRepository';
export {
  getUnlockedAchievements,
  getLatestByRule,
  getFirstByRule,
  getUnlockCountByRule,
  hasUnlockedRule,
  hasUnlockedRuleOnDate,
  recordUnlock,
  getLatestUnlockPerRule,
} from './achievementRepository';
export type { StoredAchievement } from './achievementRepository';
