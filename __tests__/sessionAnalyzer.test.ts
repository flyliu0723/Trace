import {
  buildDailySummary,
  buildSessions,
  calculateActiveInteractionMs,
  calculatePassiveMediaMs,
} from '../src/analysis/sessionAnalyzer';
import type { BehaviorEvent } from '../src/types/event';

function evt(
  type: BehaviorEvent['type'],
  timestamp: number,
  packageName?: string,
): BehaviorEvent {
  return {
    type,
    timestamp,
    packageName,
    appLabel: packageName,
    source: 'test',
  };
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

  it('未闭合媒体片段与播客报告一致，封顶 90 分钟', () => {
    const start = new Date(2026, 6, 13, 20, 0, 0).getTime();
    const trailing = new Date(2026, 6, 13, 23, 0, 0).getTime();
    const events = [
      {
        type: 'media_start' as const,
        timestamp: start,
        packageName: 'com.music',
        appLabel: '音乐',
        source: 'media_session' as const,
      },
      { type: 'screen_off' as const, timestamp: trailing, source: 'native' as const },
    ];
    expect(calculatePassiveMediaMs(events)).toBe(90 * 60_000);
  });

  it('短于 60 秒的播放不计入被动媒体时长', () => {
    const events = [
      evt('media_start', 0, 'com.music'),
      evt('media_stop', 20_000, 'com.music'),
    ];
    expect(calculatePassiveMediaMs(events)).toBe(0);
  });

  it('主动交互按前台停留计，不含解锁后空档', () => {
    const events = [
      evt('unlock', 0),
      evt('app_foreground', 10_000, 'com.a'),
      evt('screen_off', 70_000),
    ];
    // 会话墙钟 70s，真实前台仅 60s
    expect(calculateActiveInteractionMs(events)).toBe(60_000);

    const summary = buildDailySummary('2026-07-13', events);
    expect(summary.totalForegroundMs).toBe(70_000);
    expect(summary.activeInteractionMs).toBe(60_000);
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
