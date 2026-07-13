import { open } from '@op-engineering/op-sqlite';
import { CREATE_SETTINGS_TABLE, DB_NAME, SETTINGS_TABLE } from './schema';

const ONBOARDING_KEY = 'onboarding_completed';
const THEME_KEY = 'theme_mode';
const MONITOR_BANNER_DISMISS_KEY = 'monitor_banner_dismiss';
const AI_API_KEY = 'ai_api_key';
const AI_BASE_URL = 'ai_base_url';
const AI_MODEL = 'ai_model';
const AI_AUTO_DAILY_KEY = 'ai_auto_daily';
const AI_AUTO_DAILY_LAST_ATTEMPT_KEY = 'ai_auto_daily_last_attempt';
const ACHIEVEMENTS_SEEN_AT_KEY = 'achievements_seen_at';

export const DEFAULT_AI_BASE_URL = 'https://api.openai.com/v1';
export const DEFAULT_AI_MODEL = 'gpt-4o-mini';

let settingsDb: ReturnType<typeof open> | null = null;

function getSettingsDb() {
  if (!settingsDb) {
    settingsDb = open({ name: DB_NAME });
    settingsDb.executeSync(CREATE_SETTINGS_TABLE);
  }
  return settingsDb;
}

export async function getSetting(key: string): Promise<string | null> {
  const database = getSettingsDb();
  const result = await database.execute(`SELECT value FROM ${SETTINGS_TABLE} WHERE key = ?`, [key]);
  const row = result.rows?.[0] as { value: string } | undefined;
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = getSettingsDb();
  await database.execute(`INSERT OR REPLACE INTO ${SETTINGS_TABLE} (key, value) VALUES (?, ?)`, [
    key,
    value,
  ]);
}

import type { ThemeMode } from '../theme/types';

export async function getThemePreference(): Promise<ThemeMode> {
  const value = await getSetting(THEME_KEY);
  return value === 'dark' ? 'dark' : 'light';
}

export async function setThemePreference(mode: ThemeMode): Promise<void> {
  await setSetting(THEME_KEY, mode);
}

export async function isOnboardingCompleted(): Promise<boolean> {
  const value = await getSetting(ONBOARDING_KEY);
  return value === 'true';
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  await setSetting(ONBOARDING_KEY, completed ? 'true' : 'false');
}

export async function getMonitorBannerDismissKey(): Promise<string | null> {
  return getSetting(MONITOR_BANNER_DISMISS_KEY);
}

export async function setMonitorBannerDismissKey(key: string | null): Promise<void> {
  if (key === null) {
    await setSetting(MONITOR_BANNER_DISMISS_KEY, '');
    return;
  }
  await setSetting(MONITOR_BANNER_DISMISS_KEY, key);
}

export interface AiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export async function getAiConfig(): Promise<AiConfig> {
  const [apiKey, baseUrl, model] = await Promise.all([
    getSetting(AI_API_KEY),
    getSetting(AI_BASE_URL),
    getSetting(AI_MODEL),
  ]);
  return {
    apiKey: apiKey ?? '',
    baseUrl: baseUrl ?? DEFAULT_AI_BASE_URL,
    model: model ?? DEFAULT_AI_MODEL,
  };
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  await Promise.all([
    setSetting(AI_API_KEY, config.apiKey.trim()),
    setSetting(AI_BASE_URL, config.baseUrl.trim() || DEFAULT_AI_BASE_URL),
    setSetting(AI_MODEL, config.model.trim() || DEFAULT_AI_MODEL),
  ]);
}

export async function isAiConfigured(): Promise<boolean> {
  const config = await getAiConfig();
  return config.apiKey.length > 0;
}

/** 打开 App 时自动补写昨日 AI 日报 */
export async function getAiAutoDailyEnabled(): Promise<boolean> {
  const value = await getSetting(AI_AUTO_DAILY_KEY);
  return value === 'true';
}

export async function setAiAutoDailyEnabled(enabled: boolean): Promise<void> {
  await setSetting(AI_AUTO_DAILY_KEY, enabled ? 'true' : 'false');
}

export async function getAiAutoDailyLastAttempt(): Promise<string | null> {
  return getSetting(AI_AUTO_DAILY_LAST_ATTEMPT_KEY);
}

export async function setAiAutoDailyLastAttempt(date: string): Promise<void> {
  await setSetting(AI_AUTO_DAILY_LAST_ATTEMPT_KEY, date);
}

export async function getAchievementsSeenAt(): Promise<number> {
  const value = await getSetting(ACHIEVEMENTS_SEEN_AT_KEY);
  const parsed = value ? Number(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function setAchievementsSeenAt(timestamp: number): Promise<void> {
  await setSetting(ACHIEVEMENTS_SEEN_AT_KEY, String(timestamp));
}
