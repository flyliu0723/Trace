import type { SyncLogEntry } from '../db/syncLogRepository';

export interface SyncCounts {
  synced: number;
  reconciled: number;
  mediaReconciled: number;
  repaired: number;
}

/** 将同步结果格式化为用户可读文案 */
export function formatSyncResultMessage(
  entry: Pick<SyncLogEntry, 'ran' | 'skippedReason'> & SyncCounts,
): string {
  if (!entry.ran) {
    if (entry.skippedReason === 'debounce') {
      return '数据已是最新，无需重复同步';
    }
    return '同步进行中，请稍候';
  }

  const parts: string[] = [];
  if (entry.synced > 0) {
    parts.push(`${entry.synced} 条实时事件`);
  }
  if (entry.reconciled > 0) {
    parts.push(`${entry.reconciled} 条系统对账`);
  }
  if (entry.mediaReconciled > 0) {
    parts.push(`${entry.mediaReconciled} 条媒体补全`);
  }
  if (entry.repaired > 0) {
    parts.push(`${entry.repaired} 条标签修复`);
  }

  if (parts.length === 0) {
    return '同步完成，暂无新数据';
  }
  return `已补充 ${parts.join('、')}`;
}

/** 手动对账结果文案 */
export function formatManualReconcileMessage(reconciled: number, lookbackDays: number): string {
  if (reconciled <= 0) {
    return `近 ${lookbackDays} 天对账完成，未发现遗漏事件`;
  }
  return `近 ${lookbackDays} 天对账完成，补充 ${reconciled} 条事件`;
}

/** 同步历史单行摘要 */
export function formatSyncLogLine(entry: SyncLogEntry): string {
  const prefix = entry.kind === 'manual' ? '手动对账' : '自动同步';
  if (!entry.ran) {
    return `${prefix} · 已跳过`;
  }
  const total = entry.synced + entry.reconciled + entry.mediaReconciled + entry.repaired;
  if (total <= 0) {
    return `${prefix} · 无新数据`;
  }
  const parts: string[] = [];
  if (entry.synced > 0) {
    parts.push(`实时 ${entry.synced}`);
  }
  if (entry.reconciled > 0) {
    parts.push(`对账 ${entry.reconciled}`);
  }
  if (entry.mediaReconciled > 0) {
    parts.push(`媒体 ${entry.mediaReconciled}`);
  }
  return `${prefix} · ${parts.join('、')}`;
}

/** 相对时间描述 */
export function formatRelativeTime(timestamp: number, now = Date.now()): string {
  if (timestamp <= 0) {
    return '尚未同步';
  }
  const diffMs = Math.max(0, now - timestamp);
  if (diffMs < 60_000) {
    return '刚刚';
  }
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} 小时前`;
  }
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

/** 格式化绝对时间（用于数据健康页详情） */
export function formatAbsoluteTime(timestamp: number): string {
  if (timestamp <= 0) {
    return '—';
  }
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}
