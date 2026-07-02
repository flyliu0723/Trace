import { clearAllEvents, getLastEventTimestamp, insertEvents } from '../db/eventRepository';
import { getSetting, setSetting } from '../db/settingsRepository';
import { deleteCachedSummary, saveCachedSummary } from '../db/summaryRepository';
import {
  DEMO_DAILY_AI_SUMMARY,
  DEMO_MONTHLY_AI_SUMMARY,
  DEMO_WEEKLY_AI_SUMMARY,
  generateDemoEvents,
} from '../demo/generateDemoData';
import { getTodayDateString } from '../utils/dateUtils';

const DEMO_DATA_KEY = 'demo_data_loaded';

export async function isDemoDataLoaded(): Promise<boolean> {
  const value = await getSetting(DEMO_DATA_KEY);
  return value === 'true';
}

async function setDemoDataLoaded(loaded: boolean): Promise<void> {
  await setSetting(DEMO_DATA_KEY, loaded ? 'true' : 'false');
}

/** 加载演示数据（覆盖现有事件） */
export async function loadDemoData(): Promise<number> {
  await clearAllEvents();

  const events = generateDemoEvents();
  const inserted = await insertEvents(events);

  const today = getTodayDateString();
  await saveCachedSummary(today, 'daily', DEMO_DAILY_AI_SUMMARY);
  await saveCachedSummary(today, 'weekly', DEMO_WEEKLY_AI_SUMMARY);
  await saveCachedSummary(today, 'monthly', DEMO_MONTHLY_AI_SUMMARY);

  await setDemoDataLoaded(true);
  return inserted;
}

/** 清除所有数据（含演示） */
export async function clearDemoData(): Promise<void> {
  await clearAllEvents();
  const today = getTodayDateString();
  await deleteCachedSummary(today, 'daily');
  await deleteCachedSummary(today, 'weekly');
  await deleteCachedSummary(today, 'monthly');
  await setDemoDataLoaded(false);
}

/** 开发模式下数据库为空时自动加载 */
export async function ensureDemoDataInDev(): Promise<boolean> {
  if (!__DEV__) {
    return false;
  }
  const lastTimestamp = await getLastEventTimestamp();
  if (lastTimestamp > 0) {
    return false;
  }
  await loadDemoData();
  return true;
}
