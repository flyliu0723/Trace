import { open } from '@op-engineering/op-sqlite';
import type { BehaviorEvent, EventSource, EventType } from '../types/event';
import { timestampToDateString } from '../utils/dateUtils';
import { EVENTS_TABLE } from '../constants';
import {
  ADD_DEDUPE_KEY_COLUMN,
  CREATE_EVENTS_DEDUPE_INDEX,
  CREATE_EVENTS_INDEX,
  CREATE_EVENTS_TABLE,
  CREATE_EVENTS_TYPE_INDEX,
  DB_NAME,
} from './schema';

let db: ReturnType<typeof open> | null = null;

export function buildDedupeKey(
  event: Pick<BehaviorEvent, 'type' | 'timestamp' | 'packageName' | 'metadata'>,
): string {
  if (event.type === 'activity_change') {
    return `${event.type}|${event.timestamp}|${event.metadata?.activity ?? ''}`;
  }
  if (event.type === 'posture_change') {
    return `${event.type}|${event.timestamp}|${event.metadata?.posture ?? ''}`;
  }
  return `${event.type}|${event.timestamp}|${event.packageName ?? ''}`;
}

function getDb() {
  if (!db) {
    db = open({ name: DB_NAME });
    db.executeSync(CREATE_EVENTS_TABLE);
    db.executeSync(CREATE_EVENTS_INDEX);
    db.executeSync(CREATE_EVENTS_TYPE_INDEX);
    migrateDedupeKey(db);
    db.executeSync(CREATE_EVENTS_DEDUPE_INDEX);
  }
  return db;
}

function migrateDedupeKey(database: ReturnType<typeof open>) {
  try {
    database.executeSync(ADD_DEDUPE_KEY_COLUMN);
  } catch {
    // 列已存在
  }

  const result = database.executeSync(
    `SELECT id, type, timestamp, package_name FROM ${EVENTS_TABLE} WHERE dedupe_key IS NULL`,
  );
  const rows = result.rows as Array<{
    id: number;
    type: EventType;
    timestamp: number;
    package_name: string | null;
  }>;

  for (const row of rows) {
    const dedupeKey = buildDedupeKey({
      type: row.type,
      timestamp: row.timestamp,
      packageName: row.package_name ?? undefined,
    });
    database.executeSync(`UPDATE ${EVENTS_TABLE} SET dedupe_key = ? WHERE id = ?`, [
      dedupeKey,
      row.id,
    ]);
  }
}

interface EventRow {
  id: number;
  type: EventType;
  timestamp: number;
  package_name: string | null;
  app_label: string | null;
  metadata: string | null;
  source: EventSource;
}

function rowToEvent(row: EventRow): BehaviorEvent {
  return {
    id: row.id,
    type: row.type,
    timestamp: row.timestamp,
    packageName: row.package_name ?? undefined,
    appLabel: row.app_label ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    source: row.source,
  };
}

export async function insertEvent(event: BehaviorEvent): Promise<number> {
  const database = getDb();
  const dedupeKey = buildDedupeKey(event);
  const result = await database.execute(
    `INSERT OR IGNORE INTO ${EVENTS_TABLE}
     (type, timestamp, package_name, app_label, metadata, source, dedupe_key)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      event.type,
      event.timestamp,
      event.packageName ?? null,
      event.appLabel ?? null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.source,
      dedupeKey,
    ],
  );
  return Number(result.insertId ?? 0);
}

export async function insertEvents(events: BehaviorEvent[]): Promise<number> {
  if (events.length === 0) {
    return 0;
  }

  const database = getDb();
  let inserted = 0;

  await database.transaction(async (tx) => {
    for (const event of events) {
      const dedupeKey = buildDedupeKey(event);
      const result = await tx.execute(
        `INSERT OR IGNORE INTO ${EVENTS_TABLE}
         (type, timestamp, package_name, app_label, metadata, source, dedupe_key)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          event.type,
          event.timestamp,
          event.packageName ?? null,
          event.appLabel ?? null,
          event.metadata ? JSON.stringify(event.metadata) : null,
          event.source,
          dedupeKey,
        ],
      );
      if ((result.rowsAffected ?? 0) > 0) {
        inserted += 1;
      }
    }
  });

  return inserted;
}

export async function getEventsByDate(date: string): Promise<BehaviorEvent[]> {
  const database = getDb();
  const start = new Date(`${date}T00:00:00`).getTime();
  const end = new Date(`${date}T23:59:59.999`).getTime();
  const result = await database.execute(
    `SELECT * FROM ${EVENTS_TABLE}
     WHERE timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp ASC`,
    [start, end],
  );
  return (result.rows as unknown as EventRow[]).map(rowToEvent);
}

export async function getEventsInRange(
  startDate: string,
  endDate: string,
): Promise<BehaviorEvent[]> {
  const database = getDb();
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T23:59:59.999`).getTime();
  const result = await database.execute(
    `SELECT * FROM ${EVENTS_TABLE}
     WHERE timestamp >= ? AND timestamp <= ?
     ORDER BY timestamp ASC`,
    [start, end],
  );
  return (result.rows as unknown as EventRow[]).map(rowToEvent);
}

function groupEventsByDate(events: BehaviorEvent[], dates: string[]): Map<string, BehaviorEvent[]> {
  const dateSet = new Set(dates);
  const result = new Map<string, BehaviorEvent[]>();
  for (const date of dates) {
    result.set(date, []);
  }
  for (const event of events) {
    const date = timestampToDateString(event.timestamp);
    if (dateSet.has(date)) {
      result.get(date)!.push(event);
    }
  }
  return result;
}

export async function getEventsForDates(dates: string[]): Promise<Map<string, BehaviorEvent[]>> {
  if (dates.length === 0) {
    return new Map();
  }
  const sorted = [...dates].sort();
  const events = await getEventsInRange(sorted[0]!, sorted[sorted.length - 1]!);
  return groupEventsByDate(events, dates);
}

export async function getRecentEvents(limit = 50): Promise<BehaviorEvent[]> {
  const database = getDb();
  const result = await database.execute(
    `SELECT * FROM ${EVENTS_TABLE} ORDER BY timestamp DESC LIMIT ?`,
    [limit],
  );
  return (result.rows as unknown as EventRow[]).map(rowToEvent).reverse();
}

export async function getLastEventTimestamp(): Promise<number> {
  const database = getDb();
  const result = await database.execute(
    `SELECT MAX(timestamp) as last_timestamp FROM ${EVENTS_TABLE}`,
  );
  const row = result.rows?.[0] as { last_timestamp: number | null } | undefined;
  return row?.last_timestamp ?? 0;
}

export async function fixMislabeledAppEvents(
  labelMap: Record<string, string>,
): Promise<number> {
  const database = getDb();
  let updated = 0;

  for (const [packageName, label] of Object.entries(labelMap)) {
    if (!label || label === packageName) {
      continue;
    }

    const result = await database.execute(
      `UPDATE ${EVENTS_TABLE}
       SET app_label = ?
       WHERE package_name = ?
         AND (app_label IS NULL OR app_label = package_name)`,
      [label, packageName],
    );
    updated += result.rowsAffected ?? 0;
  }

  return updated;
}

export async function getMislabeledPackageNames(): Promise<string[]> {
  const database = getDb();
  const result = await database.execute(
    `SELECT DISTINCT package_name
     FROM ${EVENTS_TABLE}
     WHERE package_name IS NOT NULL
       AND (app_label IS NULL OR app_label = package_name)`,
  );

  return (result.rows as Array<{ package_name: string }>)
    .map((row) => row.package_name)
    .filter(Boolean);
}

export async function clearAllEvents(): Promise<void> {
  const database = getDb();
  await database.execute(`DELETE FROM ${EVENTS_TABLE}`);
}

export async function getUnlockCountByDate(date: string): Promise<number> {
  const database = getDb();
  const start = new Date(`${date}T00:00:00`).getTime();
  const end = new Date(`${date}T23:59:59.999`).getTime();
  const result = await database.execute(
    `SELECT COUNT(*) as count FROM ${EVENTS_TABLE}
     WHERE type = 'unlock' AND timestamp >= ? AND timestamp <= ?`,
    [start, end],
  );
  const row = result.rows?.[0] as { count: number } | undefined;
  return row?.count ?? 0;
}
