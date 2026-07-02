import { open } from '@op-engineering/op-sqlite';
import {
  CREATE_AI_SUMMARIES_INDEX,
  CREATE_AI_SUMMARIES_TABLE,
  AI_SUMMARIES_TABLE,
  DB_NAME,
} from './schema';

export type SummaryType = 'daily' | 'weekly' | 'monthly';

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
