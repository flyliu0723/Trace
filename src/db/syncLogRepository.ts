import { open } from '@op-engineering/op-sqlite';
import { CREATE_SYNC_LOG_INDEX, CREATE_SYNC_LOG_TABLE, DB_NAME, SYNC_LOG_TABLE } from './schema';
import { getSetting, setSetting } from './settingsRepository';

const LEGACY_SYNC_LOG_KEY = 'sync_log_v1';
const MAX_LOG_ENTRIES = 100;

export type SyncLogKind = 'auto' | 'manual';

export interface SyncLogEntry {
  id?: number;
  at: number;
  synced: number;
  reconciled: number;
  mediaReconciled: number;
  repaired: number;
  ran: boolean;
  kind?: SyncLogKind;
  skippedReason?: 'debounce' | 'in_flight';
}

let syncLogDb: ReturnType<typeof open> | null = null;
let legacyMigrated = false;

function getSyncLogDb() {
  if (!syncLogDb) {
    syncLogDb = open({ name: DB_NAME });
    syncLogDb.executeSync(CREATE_SYNC_LOG_TABLE);
    syncLogDb.executeSync(CREATE_SYNC_LOG_INDEX);
  }
  return syncLogDb;
}

function rowToEntry(row: {
  id: number;
  at: number;
  synced: number;
  reconciled: number;
  media_reconciled: number;
  repaired: number;
  ran: number;
  kind: string | null;
  skipped_reason: string | null;
}): SyncLogEntry {
  return {
    id: row.id,
    at: row.at,
    synced: row.synced,
    reconciled: row.reconciled,
    mediaReconciled: row.media_reconciled,
    repaired: row.repaired,
    ran: row.ran === 1,
    kind: row.kind === 'manual' ? 'manual' : 'auto',
    skippedReason:
      row.skipped_reason === 'debounce' || row.skipped_reason === 'in_flight'
        ? row.skipped_reason
        : undefined,
  };
}

async function migrateLegacySyncLog(): Promise<void> {
  if (legacyMigrated) {
    return;
  }
  legacyMigrated = true;
  const raw = await getSetting(LEGACY_SYNC_LOG_KEY);
  if (!raw) {
    return;
  }
  try {
    const legacy = JSON.parse(raw) as SyncLogEntry;
    if (legacy.at > 0) {
      await saveSyncLog({ ...legacy, kind: 'auto' });
    }
  } catch {
    // 忽略损坏的旧数据
  }
  await setSetting(LEGACY_SYNC_LOG_KEY, '');
}

export async function saveSyncLog(entry: SyncLogEntry): Promise<void> {
  const database = getSyncLogDb();
  await migrateLegacySyncLog();

  await database.execute(
    `INSERT INTO ${SYNC_LOG_TABLE}
      (at, synced, reconciled, media_reconciled, repaired, ran, kind, skipped_reason)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.at,
      entry.synced,
      entry.reconciled,
      entry.mediaReconciled,
      entry.repaired,
      entry.ran ? 1 : 0,
      entry.kind ?? 'auto',
      entry.skippedReason ?? null,
    ],
  );

  await database.execute(
    `DELETE FROM ${SYNC_LOG_TABLE}
     WHERE id NOT IN (
       SELECT id FROM ${SYNC_LOG_TABLE} ORDER BY at DESC LIMIT ?
     )`,
    [MAX_LOG_ENTRIES],
  );
}

export async function getLastSyncLog(): Promise<SyncLogEntry | null> {
  const database = getSyncLogDb();
  await migrateLegacySyncLog();
  const result = await database.execute(
    `SELECT * FROM ${SYNC_LOG_TABLE} ORDER BY at DESC LIMIT 1`,
  );
  const row = result.rows?.[0] as
    | {
        id: number;
        at: number;
        synced: number;
        reconciled: number;
        media_reconciled: number;
        repaired: number;
        ran: number;
        kind: string | null;
        skipped_reason: string | null;
      }
    | undefined;
  return row ? rowToEntry(row) : null;
}

export async function getRecentSyncLogs(limit = 5): Promise<SyncLogEntry[]> {
  const database = getSyncLogDb();
  await migrateLegacySyncLog();
  const result = await database.execute(
    `SELECT * FROM ${SYNC_LOG_TABLE} ORDER BY at DESC LIMIT ?`,
    [limit],
  );
  return (result.rows as Array<Parameters<typeof rowToEntry>[0]>).map(rowToEntry);
}
