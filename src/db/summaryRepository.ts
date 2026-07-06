import { open } from '@op-engineering/op-sqlite';
import {
  CREATE_AI_SUMMARIES_INDEX,
  CREATE_AI_SUMMARIES_TABLE,
  AI_SUMMARIES_TABLE,
  DB_NAME,
} from './schema';
import { getFirstDayOfMonth, getMondayOfWeek } from '../utils/dateUtils';

export type SummaryType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'podcast_weekly'
  | 'podcast_monthly'
  | 'entertainment_weekly'
  | 'entertainment_monthly';

let db: ReturnType<typeof open> | null = null;

function getDb() {
  if (!db) {
    db = open({ name: DB_NAME });
    db.executeSync(CREATE_AI_SUMMARIES_TABLE);
    db.executeSync(CREATE_AI_SUMMARIES_INDEX);
  }
  return db;
}

export async function getCachedSummary(
  date: string,
  type: SummaryType,
): Promise<string | null> {
  const database = getDb();
  const result = await database.execute(
    `SELECT content FROM ${AI_SUMMARIES_TABLE} WHERE date = ? AND type = ?`,
    [date, type],
  );
  const row = result.rows?.[0] as { content: string } | undefined;
  return row?.content ?? null;
}

export async function saveCachedSummary(
  date: string,
  type: SummaryType,
  content: string,
): Promise<void> {
  const database = getDb();
  await database.execute(
    `INSERT OR REPLACE INTO ${AI_SUMMARIES_TABLE} (date, type, content, created_at)
     VALUES (?, ?, ?, ?)`,
    [date, type, content, Date.now()],
  );
}

export async function deleteCachedSummary(date: string, type: SummaryType): Promise<void> {
  const database = getDb();
  await database.execute(`DELETE FROM ${AI_SUMMARIES_TABLE} WHERE date = ? AND type = ?`, [
    date,
    type,
  ]);
}

/** 按自然周（周一至周日）读取周报缓存，兼容旧版按选中日期存储的记录 */
export async function getCachedWeeklySummary(selectedDate: string): Promise<string | null> {
  const weekMonday = getMondayOfWeek(selectedDate);
  const cached = await getCachedSummary(weekMonday, 'weekly');
  if (cached) {
    return cached;
  }
  return getCachedSummary(selectedDate, 'weekly');
}

/** 按自然月读取月报缓存，兼容旧版按选中日期存储的记录 */
export async function getCachedMonthlySummary(selectedDate: string): Promise<string | null> {
  const monthAnchor = getFirstDayOfMonth(selectedDate);
  const cached = await getCachedSummary(monthAnchor, 'monthly');
  if (cached) {
    return cached;
  }
  return getCachedSummary(selectedDate, 'monthly');
}
