import {
  buildDailySummary,
  buildSessions,
  calculatePassiveMediaMs,
} from '../src/analysis/sessionAnalyzer';
import type { BehaviorEvent } from '../src/types/event';

function evt(
  type: BehaviorEvent['type'],
  timestamp: number,
  packageName?: string,
): BehaviorEvent {
  return { type, timestamp, packageName, source: 'test' };
}

describe('sessionAnalyzer', () => {
  it('按 unlock/screen_off 切分会话', () => {
    const events = [
      evt('unlock', 0),
      evt('app_foreground', 1_000, 'com.a'),
      evt('screen_off', 60_000),
      evt('unlock', 120_000),
      evt('screen_off', 150_000),
    ];
    const sessions = buildSessions(events);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].durationMs).toBe(60_000);
    expect(sessions[0].apps).toEqual(['com.a']);
  });

  it('计算被动媒体播放时长', () => {
    const events = [
      evt('media_start', 0, 'com.music'),
      evt('media_pause', 30_000, 'com.music'),
      evt('media_start', 60_000, 'com.music'),
      evt('media_stop', 120_000, 'com.music'),
    ];
    expect(calculatePassiveMediaMs(events)).toBe(90_000);
  });

  it('buildDailySummary 汇总解锁与会话数', () => {
    const events = [
      evt('unlock', 0),
      evt('app_foreground', 1_000, 'com.a'),
      evt('screen_off', 20_000),
      evt('unlock', 40_000),
      evt('screen_off', 50_000),
    ];
    const summary = buildDailySummary('2026-07-06', events);
    expect(summary.unlockCount).toBe(2);
    expect(summary.sessionCount).toBe(2);
    expect(summary.totalForegroundMs).toBeGreaterThan(0);
  });
});
