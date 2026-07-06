import {
  buildDayCredibility,
  formatCredibilitySummary,
  formatDualDurationHint,
  getCredibilityBannerMessage,
  getCredibilityLevel,
} from '../src/analysis/usageCredibilityAnalyzer';
import { buildDailySummary } from '../src/analysis/sessionAnalyzer';
import type { BehaviorEvent } from '../src/types/event';

describe('usageCredibilityAnalyzer', () => {
  it('根据比值划分可信度等级', () => {
    expect(getCredibilityLevel(0.85)).toBe('good');
    expect(getCredibilityLevel(0.55)).toBe('fair');
    expect(getCredibilityLevel(0.2)).toBe('poor');
    expect(getCredibilityLevel(null)).toBe('unknown');
  });

  it('格式化可信度摘要', () => {
    const text = formatCredibilitySummary(3_600_000, 4_000_000, 0.9, 'good');
    expect(text).toContain('采集');
    expect(text).toContain('系统');
    expect(text).toContain('90%');
  });

  it('无使用情况权限时返回 unknown', async () => {
    const result = await buildDayCredibility('2026-07-06', [], false);
    expect(result.level).toBe('unknown');
    expect(result.summary).toContain('使用情况访问');
  });

  it('采集与会话汇总一致', () => {
    const events: BehaviorEvent[] = [
      { type: 'unlock', timestamp: 0, source: 'test' },
      { type: 'app_foreground', timestamp: 1_000, packageName: 'com.a', source: 'test' },
      { type: 'screen_off', timestamp: 61_000, source: 'test' },
    ];
    const summary = buildDailySummary('2026-07-06', events);
    expect(summary.totalForegroundMs).toBeGreaterThan(0);
  });

  it('生成可信度 Banner 文案', () => {
    const message = getCredibilityBannerMessage({
      date: '2026-07-06',
      collectedMs: 1_000_000,
      systemMs: 3_000_000,
      ratio: 0.33,
      level: 'poor',
      summary: '',
    });
    expect(message).toContain('完整度偏低');
  });

  it('双轨时长提示包含系统参考', () => {
    const hint = formatDualDurationHint({
      collectedMs: 3_600_000,
      systemMs: 4_000_000,
      ratio: 0.9,
      level: 'good',
    });
    expect(hint).toContain('系统');
    expect(hint).toContain('90%');
  });
});
