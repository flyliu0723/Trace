import { saveSyncLog, type SyncLogEntry } from '../db/syncLogRepository';
import { DEFAULT_SYNC_DEBOUNCE_MS, PENDING_SYNC_DEBOUNCE_MS } from '../constants';
import { getPendingEventCount, manualReconcileEvents, syncAndReconcileEvents } from './monitorService';

export type SyncResult = SyncLogEntry;

let inFlight: Promise<SyncResult> | null = null;
let lastSyncAt = 0;
let lastResult: SyncResult = {
  ran: false,
  at: 0,
  synced: 0,
  reconciled: 0,
  mediaReconciled: 0,
  repaired: 0,
};

async function resolveDebounceMs(): Promise<number> {
  const pending = await getPendingEventCount();
  return pending > 0 ? PENDING_SYNC_DEBOUNCE_MS : DEFAULT_SYNC_DEBOUNCE_MS;
}

/** 确保事件已同步；force 时跳过节流，inFlight 时复用同一 Promise */
export async function ensureSynced(options?: { force?: boolean }): Promise<SyncResult> {
  if (inFlight) {
    return inFlight;
  }

  const force = options?.force ?? false;
  const now = Date.now();
  const debounceMs = await resolveDebounceMs();
  if (!force && now - lastSyncAt < debounceMs) {
    return { ...lastResult, ran: false, skippedReason: 'debounce' };
  }

  inFlight = (async () => {
    const result = await syncAndReconcileEvents();
    const syncResult: SyncResult = {
      ran: true,
      at: Date.now(),
      synced: result.synced,
      reconciled: result.reconciled,
      mediaReconciled: result.mediaReconciled,
      repaired: result.repaired,
      kind: 'auto',
    };
    await saveSyncLog(syncResult);
    lastSyncAt = syncResult.at;
    lastResult = syncResult;
    return syncResult;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** 手动触发历史对账（不经过常规同步节流） */
export async function runManualReconcile(lookbackDays: number): Promise<SyncResult> {
  const result = await manualReconcileEvents(lookbackDays);
  const syncResult: SyncResult = {
    ran: true,
    at: Date.now(),
    synced: 0,
    reconciled: result.reconciled,
    mediaReconciled: 0,
    repaired: 0,
    kind: 'manual',
  };
  await saveSyncLog(syncResult);
  lastSyncAt = syncResult.at;
  lastResult = syncResult;
  return syncResult;
}

/** App 回前台时强制同步，跳过节流 */
export async function syncOnForeground(): Promise<SyncResult> {
  return ensureSynced({ force: true });
}

/** 启动后后台对账，不阻塞 UI */
export function scheduleBackgroundSync(): void {
  setTimeout(() => {
    ensureSynced({ force: true }).catch(console.error);
  }, 0);
}

/** 读取内存中的最近一次同步结果（不触发同步） */
export function getLastSyncResult(): SyncResult {
  return lastResult;
}
