import { syncAndReconcileEvents } from './monitorService';

const DEBOUNCE_MS = 30_000;

let inFlight: ReturnType<typeof syncAndReconcileEvents> | null = null;
let lastSyncAt = 0;

/** 确保事件已同步；force 时跳过节流，inFlight 时复用同一 Promise */
export async function ensureSynced(options?: { force?: boolean }): Promise<void> {
  if (inFlight) {
    await inFlight;
    return;
  }

  const force = options?.force ?? false;
  const now = Date.now();
  if (!force && now - lastSyncAt < DEBOUNCE_MS) {
    return;
  }

  inFlight = syncAndReconcileEvents();
  try {
    await inFlight;
    lastSyncAt = Date.now();
  } finally {
    inFlight = null;
  }
}

/** App 回前台时强制同步，跳过节流 */
export async function syncOnForeground(): Promise<void> {
  await ensureSynced({ force: true });
}

/** 启动后后台对账，不阻塞 UI */
export function scheduleBackgroundSync(): void {
  setTimeout(() => {
    ensureSynced({ force: true }).catch(console.error);
  }, 0);
}
