import { extractMediaSegments } from '../src/analysis/mediaSceneAnalyzer';
import type { BehaviorEvent } from '../src/types/event';

function at(hour: number, minute = 0, second = 0): number {
  return new Date(2026, 6, 13, hour, minute, second).getTime();
}

function mediaEvt(
  type: BehaviorEvent['type'],
  timestamp: number,
  options: {
    packageName?: string;
    source?: BehaviorEvent['source'];
    metadata?: Record<string, string>;
  } = {},
): BehaviorEvent {
  return {
    type,
    timestamp,
    packageName: options.packageName ?? 'app.podcast.cosmos',
    appLabel: '小宇宙',
    metadata: options.metadata,
    source: options.source ?? 'media_session',
  };
}

describe('extractMediaSegments', () => {
  it('正常 pause/stop 收尾时按真实播放时长统计', () => {
    const events = [
      mediaEvt('media_start', at(20, 0)),
      mediaEvt('media_pause', at(20, 35)),
      mediaEvt('media_start', at(20, 36)),
      mediaEvt('media_stop', at(21, 10)),
    ];

    const segments = extractMediaSegments(events);
    expect(segments).toHaveLength(1);
    expect(segments[0].durationMs).toBe(69 * 60_000);
  });

  it('无 stop 时封顶 90 分钟，避免睡着后虚高', () => {
    const events = [
      mediaEvt('media_start', at(20, 0)),
      { type: 'screen_off', timestamp: at(23, 0), source: 'native' as const },
    ];

    const segments = extractMediaSegments(events);
    expect(segments).toHaveLength(1);
    expect(segments[0].durationMs).toBe(90 * 60_000);
    expect(segments[0].endTime).toBe(at(21, 30));
  });

  it('恢复事件倒推起点最多回溯 5 分钟', () => {
    const events = [
      mediaEvt('media_start', at(10, 0), {
        source: 'recovery',
        metadata: { recovered: 'true' },
      }),
      mediaEvt('media_stop', at(12, 0)),
    ];

    const segments = extractMediaSegments(events);
    expect(segments).toHaveLength(1);
    expect(segments[0].startTime).toBe(at(11, 55));
    expect(segments[0].durationMs).toBe(5 * 60_000);
  });

  it('跨零点未闭合片段截断到当日 23:59:59', () => {
    const events = [
      mediaEvt('media_start', at(23, 0)),
      { type: 'unlock', timestamp: at(23, 40), source: 'native' as const },
    ];

    const segments = extractMediaSegments(events);
    expect(segments).toHaveLength(1);
    expect(segments[0].durationMs).toBe(40 * 60_000);
    expect(segments[0].endTime).toBe(at(23, 40));
  });
});
