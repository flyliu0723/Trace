import { DATABASE_NAME, EVENTS_TABLE } from '../constants';

export const DB_NAME = DATABASE_NAME;

export const CREATE_EVENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${EVENTS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    package_name TEXT,
    app_label TEXT,
    metadata TEXT,
    source TEXT NOT NULL DEFAULT 'native',
    dedupe_key TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  );
`;

export const CREATE_EVENTS_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_events_timestamp ON ${EVENTS_TABLE}(timestamp);
`;

export const CREATE_EVENTS_TYPE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_events_type ON ${EVENTS_TABLE}(type);
`;

export const CREATE_EVENTS_DEDUPE_INDEX = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_events_dedupe ON ${EVENTS_TABLE}(dedupe_key);
`;

export const SETTINGS_TABLE = 'app_settings';

export const CREATE_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS ${SETTINGS_TABLE} (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

export const AI_SUMMARIES_TABLE = 'ai_summaries';

export const CREATE_AI_SUMMARIES_TABLE = `
  CREATE TABLE IF NOT EXISTS ${AI_SUMMARIES_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
  );
`;

export const CREATE_AI_SUMMARIES_INDEX = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_summaries_date_type
  ON ${AI_SUMMARIES_TABLE}(date, type);
`;

export const SYNC_LOG_TABLE = 'sync_log';

export const CREATE_SYNC_LOG_TABLE = `
  CREATE TABLE IF NOT EXISTS ${SYNC_LOG_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at INTEGER NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    reconciled INTEGER NOT NULL DEFAULT 0,
    media_reconciled INTEGER NOT NULL DEFAULT 0,
    repaired INTEGER NOT NULL DEFAULT 0,
    ran INTEGER NOT NULL DEFAULT 1,
    kind TEXT NOT NULL DEFAULT 'auto',
    skipped_reason TEXT
  );
`;

export const CREATE_SYNC_LOG_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_sync_log_at ON ${SYNC_LOG_TABLE}(at DESC);
`;

/** 为旧版本数据库补充 dedupe_key 列 */
export const ADD_DEDUPE_KEY_COLUMN = `
  ALTER TABLE ${EVENTS_TABLE} ADD COLUMN dedupe_key TEXT;
`;
