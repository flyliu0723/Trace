import {
  formatManualReconcileMessage,
  formatRelativeTime,
  formatSyncResultMessage,
} from '../src/utils/syncFeedbackUtils';

describe('syncFeedbackUtils', () => {
  it('格式化同步补充结果', () => {
    const message = formatSyncResultMessage({
      ran: true,
      synced: 3,
      reconciled: 2,
      mediaReconciled: 1,
      repaired: 0,
    });
    expect(message).toContain('3 条实时事件');
    expect(message).toContain('2 条系统对账');
    expect(message).toContain('1 条媒体补全');
  });

  it('节流跳过时提示无需重复同步', () => {
    expect(
      formatSyncResultMessage({
        ran: false,
        skippedReason: 'debounce',
        synced: 0,
        reconciled: 0,
        mediaReconciled: 0,
        repaired: 0,
      }),
    ).toBe('数据已是最新，无需重复同步');
  });

  it('相对时间描述', () => {
    const now = 1_000_000;
    expect(formatRelativeTime(now - 30_000, now)).toBe('刚刚');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5 分钟前');
  });

  it('手动对账结果文案', () => {
    expect(formatManualReconcileMessage(0, 3)).toContain('未发现遗漏');
    expect(formatManualReconcileMessage(12, 7)).toContain('12 条');
  });
});
