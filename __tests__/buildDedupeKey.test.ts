import { buildDedupeKey } from '../src/db/dedupeKey';

describe('buildDedupeKey', () => {
  it('普通事件按 type+timestamp+package 去重', () => {
    const key = buildDedupeKey({
      type: 'app_foreground',
      timestamp: 1_700_000_000_000,
      packageName: 'com.example.app',
    });
    expect(key).toBe('app_foreground|1700000000000|com.example.app');
  });

  it('activity_change 包含 activity 与 detector', () => {
    const key = buildDedupeKey({
      type: 'activity_change',
      timestamp: 100,
      metadata: { activity: 'walking', detector: 'step_counter' },
    });
    expect(key).toBe('activity_change|100|walking|step_counter');
  });

  it('posture_change 包含 posture', () => {
    const key = buildDedupeKey({
      type: 'posture_change',
      timestamp: 200,
      metadata: { posture: 'lying' },
    });
    expect(key).toBe('posture_change|200|lying');
  });

  it('media_track_change 包含曲目标题', () => {
    const key = buildDedupeKey({
      type: 'media_track_change',
      timestamp: 300,
      packageName: 'com.spotify.music',
      metadata: { title: 'Episode 1' },
    });
    expect(key).toBe('media_track_change|300|com.spotify.music|Episode 1');
  });

  it('service_start 包含 phase', () => {
    const key = buildDedupeKey({
      type: 'service_start',
      timestamp: 400,
      metadata: { phase: 'create' },
    });
    expect(key).toBe('service_start|400|create');
  });
});
