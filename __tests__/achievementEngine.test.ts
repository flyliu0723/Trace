import { evaluateAchievementsForDay } from '../src/analysis/achievements/achievementEngine';
import type { BehaviorEvent } from '../src/types/event';
import { FLOW_MIN_DURATION_MS } from '../src/constants';

function evt(
  type: BehaviorEvent['type'],
  timestamp: number,
  packageName?: string,
  appLabel?: string,
): BehaviorEvent {
  return {
    type,
    timestamp,
    packageName,
    appLabel: appLabel ?? packageName,
    source: 'native',
  };
}

const day = '2026-07-13';
const noon = new Date(2026, 6, 13, 12, 0, 0).getTime();

describe('achievementEngine', () => {
  it('解锁第一次沉浸（flow）', () => {
    const events = [
      evt('unlock', noon),
      evt('app_foreground', noon + 1_000, 'com.read', '微信读书'),
      evt('screen_off', noon + FLOW_MIN_DURATION_MS + 5_000),
    ];
    const result = evaluateAchievementsForDay({
      date: day,
      events,
      historyPairs: [{ date: day, events }],
      alreadySatisfied: new Set(),
    });
    expect(result.some((item) => item.ruleId === 'first-flow')).toBe(true);
  });

  it('已满足 onceOnly 时不再给出 first-flow', () => {
    const events = [
      evt('unlock', noon),
      evt('app_foreground', noon + 1_000, 'com.read', '微信读书'),
      evt('screen_off', noon + FLOW_MIN_DURATION_MS + 5_000),
    ];
    const result = evaluateAchievementsForDay({
      date: day,
      events,
      historyPairs: [{ date: day, events }],
      alreadySatisfied: new Set(['first-flow']),
    });
    expect(result.some((item) => item.ruleId === 'first-flow')).toBe(false);
  });

  it('礼貌摸一下：高解锁低亮屏', () => {
    const events: BehaviorEvent[] = [];
    for (let i = 0; i < 45; i += 1) {
      const t = noon + i * 60_000;
      events.push(evt('unlock', t));
      events.push(evt('app_foreground', t + 500, 'com.wechat', '微信'));
      events.push(evt('screen_off', t + 5_000));
    }
    const result = evaluateAchievementsForDay({
      date: day,
      events,
      historyPairs: [{ date: day, events }],
      alreadySatisfied: new Set(),
    });
    expect(result.some((item) => item.ruleId === 'polite-glance')).toBe(true);
  });

  it('七日记事：连续 7 天有事件', () => {
    const historyPairs = [];
    for (let i = 6; i >= 0; i -= 1) {
      const date = `2026-07-${String(13 - i).padStart(2, '0')}`;
      const t = new Date(2026, 6, 13 - i, 10, 0, 0).getTime();
      historyPairs.push({
        date,
        events: [evt('unlock', t), evt('screen_off', t + 10_000)],
      });
    }
    const today = historyPairs[historyPairs.length - 1];
    const result = evaluateAchievementsForDay({
      date: today.date,
      events: today.events,
      historyPairs,
      alreadySatisfied: new Set(),
    });
    expect(result.some((item) => item.ruleId === 'record-streak-7')).toBe(true);
  });

  it('记录不足 7 天不解锁七日记事', () => {
    const historyPairs = [
      {
        date: day,
        events: [evt('unlock', noon), evt('screen_off', noon + 10_000)],
      },
    ];
    const result = evaluateAchievementsForDay({
      date: day,
      events: historyPairs[0].events,
      historyPairs,
      alreadySatisfied: new Set(),
    });
    expect(result.some((item) => item.ruleId === 'record-streak-7')).toBe(false);
  });

  it('声音陪伴者：高伴随率且收听足够长', () => {
    const start = new Date(2026, 6, 13, 8, 0, 0).getTime();
    const events = [
      evt('media_start', start, 'app.podcast.cosmos', '小宇宙'),
      {
        type: 'media_stop' as const,
        timestamp: start + 40 * 60_000,
        packageName: 'app.podcast.cosmos',
        appLabel: '小宇宙',
        source: 'media_session' as const,
        metadata: { title: '测试节目' },
      },
    ];
    const result = evaluateAchievementsForDay({
      date: day,
      events,
      historyPairs: [{ date: day, events }],
      alreadySatisfied: new Set(),
    });
    // 无前台打开播放器时伴随率通常很高
    expect(result.some((item) => item.ruleId === 'sound-companion')).toBe(true);
  });
});
