import {
  getAiAutoDailyEnabled,
  getAiAutoDailyLastAttempt,
  getAiConfig,
  getCachedSummary,
  getEventsByDate,
  getEventsForDates,
  isAiConfigured,
  saveCachedSummary,
  setAiAutoDailyLastAttempt,
} from '../db';
import { addDays, getTodayDateString, getWeekDatesMondayToSunday, getMondayOfWeek } from '../utils/dateUtils';
import { generateDailyAiSummary } from './aiSummaryService';
import { buildDayInsights } from '../analysis/insightEngine';

export type AutoDailyResult = 'skipped' | 'generated' | 'failed';

let inFlight: Promise<AutoDailyResult> | null = null;

/**
 * 打开 App / 回前台时：若开启自动日报且昨日尚无缓存，则补写昨日 AI 日报。
 * 无后台定时任务依赖，仅在进程活跃时触发。
 */
export async function maybeAutoGenerateYesterdayDailySummary(): Promise<AutoDailyResult> {
  if (inFlight) {
    return inFlight;
  }
  inFlight = runAutoGenerate().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runAutoGenerate(): Promise<AutoDailyResult> {
  try {
    if (!(await getAiAutoDailyEnabled())) {
      return 'skipped';
    }
    if (!(await isAiConfigured())) {
      return 'skipped';
    }

    const yesterday = addDays(getTodayDateString(), -1);
    const lastAttempt = await getAiAutoDailyLastAttempt();
    if (lastAttempt === yesterday) {
      return 'skipped';
    }

    const cached = await getCachedSummary(yesterday, 'daily');
    if (cached?.trim()) {
      await setAiAutoDailyLastAttempt(yesterday);
      return 'skipped';
    }

    const events = await getEventsByDate(yesterday);
    if (events.length === 0) {
      await setAiAutoDailyLastAttempt(yesterday);
      return 'skipped';
    }

    await setAiAutoDailyLastAttempt(yesterday);

    const weekMonday = getMondayOfWeek(yesterday);
    const weekDates = getWeekDatesMondayToSunday(weekMonday);
    const weekEventsMap = await getEventsForDates(weekDates);
    const weekPairs = weekDates.map((date) => ({
      date,
      events: weekEventsMap.get(date) ?? [],
    }));

    const dayInsights = buildDayInsights(yesterday, events, weekPairs);
    const config = await getAiConfig();
    const content = await generateDailyAiSummary(config, yesterday, dayInsights, events, weekPairs);
    await saveCachedSummary(yesterday, 'daily', content);
    return 'generated';
  } catch (error) {
    console.warn('[AI] 自动日报失败:', error);
    return 'failed';
  }
}
