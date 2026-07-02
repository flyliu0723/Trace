import { open } from '@op-engineering/op-sqlite';
import { CREATE_SETTINGS_TABLE, DB_NAME, SETTINGS_TABLE } from './schema';

const ONBOARDING_KEY = 'onboarding_completed';
const THEME_KEY = 'theme_mode';
const AI_API_KEY = 'ai_api_key';
const AI_BASE_URL = 'ai_base_url';
const AI_MODEL = 'ai_model';

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
