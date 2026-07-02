import type { BehaviorEvent } from '../types/event';
import { addDays, getTodayDateString } from '../utils/dateUtils';

const APPS = {
  wechat: { pkg: 'com.tencent.mm', label: '微信' },
  douyin: { pkg: 'com.ss.android.ugc.aweme', label: '抖音' },
  xhs: { pkg: 'com.xingin.xhs', label: '小红书' },
  alipay: { pkg: 'com.eg.android.AlipayGphone', label: '支付宝' },
  amap: { pkg: 'com.autonavi.minimap', label: '高德地图' },
  chrome: { pkg: 'com.android.chrome', label: 'Chrome' },
  meituan: { pkg: 'com.sankuai.meituan', label: '美团' },
  cosmos: { pkg: 'app.podcast.cosmos', label: '小宇宙' },
  netease: { pkg: 'com.netease.cloudmusic', label: '网易云音乐' },
  bilibili: { pkg: 'tv.danmaku.bili', label: '哔哩哔哩' },
  weread: { pkg: 'com.tencent.weread', label: '微信读书' },
} as const;

function at(date: string, hour: number, minute: number, second = 0): number {
  return new Date(
    `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
  ).getTime();
}

function evt(
  type: BehaviorEvent['type'],
  timestamp: number,
  app?: (typeof APPS)[keyof typeof APPS],
  metadata?: Record<string, string>,
): BehaviorEvent {
  return {
    type,
    timestamp,
    packageName: app?.pkg,
    appLabel: app?.label,
    metadata,
    source: 'demo',
  };
}

/** 一次完整会话：解锁 → 若干 App → 锁屏 */
function session(
  date: string,
  startHour: number,
  startMin: number,
  apps: Array<(typeof APPS)[keyof typeof APPS]>,
  durationMin: number,
): BehaviorEvent[] {
  const start = at(date, startHour, startMin);
  const events: BehaviorEvent[] = [evt('unlock', start)];
  let offset = 30_000;
  for (const app of apps) {
    events.push(evt('app_foreground', start + offset, app));
    offset += 45_000;
  }
  events.push(evt('screen_off', start + durationMin * 60_000));
  return events;
}

/** 快速查看：解锁 → 一个 App → 很快锁屏 */
function quickGlance(
  date: string,
  hour: number,
  min: number,
  app: (typeof APPS)[keyof typeof APPS],
): BehaviorEvent[] {
  const start = at(date, hour, min);
  return [
    evt('unlock', start),
    evt('app_foreground', start + 2000, app),
    evt('screen_off', start + 8000),
  ];
}

/** 播客：打开小宇宙 → 播放 → 锁屏 → 稍后停止 */
function podcastSession(date: string, hour: number, min: number, durationMin: number): BehaviorEvent[] {
  const start = at(date, hour, min);
  return [
    evt('unlock', start),
    evt('app_foreground', start + 3000, APPS.cosmos),
    evt('media_start', start + 8000, APPS.cosmos, {
      title: '忽左忽右',
      artist: 'Culture Podcast',
    }),
    evt('screen_off', start + 15_000),
    evt('media_stop', start + durationMin * 60_000, APPS.cosmos),
  ];
}

/** 生成某一天的演示事件 */
function generateDayEvents(date: string, isToday: boolean): BehaviorEvent[] {
  const events: BehaviorEvent[] = [];

  if (isToday) {
    events.push(
      ...session(date, 8, 10, [APPS.wechat, APPS.alipay, APPS.amap], 4),
      ...quickGlance(date, 8, 30, APPS.wechat),
      ...session(date, 9, 15, [APPS.chrome, APPS.wechat], 35),
      ...session(date, 10, 20, [APPS.chrome], 55),
      ...quickGlance(date, 11, 5, APPS.wechat),
      ...session(date, 12, 10, [APPS.meituan], 18),
      ...session(date, 13, 30, [APPS.chrome, APPS.wechat], 40),
      ...quickGlance(date, 15, 2, APPS.wechat),
      ...quickGlance(date, 15, 8, APPS.wechat),
      ...quickGlance(date, 15, 15, APPS.wechat),
      ...quickGlance(date, 15, 22, APPS.wechat),
      ...quickGlance(date, 15, 35, APPS.douyin),
      ...session(date, 16, 10, [APPS.chrome], 50),
      ...session(date, 18, 20, [APPS.wechat, APPS.xhs, APPS.douyin], 25),
      ...session(date, 19, 10, [APPS.douyin], 45),
      ...podcastSession(date, 20, 0, 35),
      ...session(date, 21, 30, [APPS.weread], 30),
      ...quickGlance(date, 22, 10, APPS.wechat),
      ...session(date, 22, 45, [APPS.bilibili], 20),
    );
    return events;
  }

  const dayIndex = Math.abs(date.split('-').join('').charCodeAt(6) ?? 0) % 3;

  events.push(
    ...session(date, 9, 0, [APPS.chrome, APPS.wechat], 30),
    ...session(date, 12, 0, [APPS.meituan], 15),
    ...quickGlance(date, 14, 30, APPS.wechat),
  );

  if (dayIndex === 0) {
    events.push(...session(date, 18, 30, [APPS.wechat, APPS.xhs, APPS.douyin], 30));
  } else if (dayIndex === 1) {
    events.push(...session(date, 19, 0, [APPS.douyin], 40));
    events.push(...podcastSession(date, 21, 0, 25));
  } else {
    events.push(...session(date, 20, 0, [APPS.netease], 5));
    events.push(
      evt('media_start', at(date, 20, 5), APPS.netease, { title: 'Daily Drive', artist: 'Various' }),
      evt('screen_off', at(date, 20, 6)),
      evt('media_stop', at(date, 21, 30), APPS.netease),
    );
  }

  events.push(...quickGlance(date, 15, 10, APPS.wechat));
  events.push(...quickGlance(date, 15, 25, APPS.wechat));

  return events;
}

/** 生成近 30 天演示事件 */
export function generateDemoEvents(): BehaviorEvent[] {
  const today = getTodayDateString();
  const all: BehaviorEvent[] = [];

  for (let i = 29; i >= 0; i -= 1) {
    const date = addDays(today, -i);
    all.push(...generateDayEvents(date, i === 0));
  }

  return all.sort((a, b) => a.timestamp - b.timestamp);
}

export const DEMO_DAILY_AI_SUMMARY = `【今日发现】
下午 3 点前后出现了 4 次快速查看，其中有一次在 30 秒内从微信切到了抖音，很像工作间隙的「奖励式刷手机」。

【为什么会这样】
「微信 → 抖音」是你今天最高频的跳转之一，多发生在下午注意力自然下滑的时段。下班后 6 点 20 分的「微信 → 小红书 → 抖音」已连续多天出现，像是一套固定的放松流程。

【今天做得好】
上午以 Chrome 和微信为主，处理工作和沟通，节奏比较集中。晚上 8 点打开小宇宙听了 35 分钟播客，但真正操作手机只有十几秒——这是陪伴式收听，不是刷手机。

【明天小实验】
明天下午 3 点前后，试试把第一次打开抖音延后 10 分钟，观察后续快速查看次数有没有减少。`;

export const DEMO_WEEKLY_AI_SUMMARY = `【本周发现】
工作日解锁次数明显高于周末，下午 3 点是注意力最容易被打断的时段，连续 4 天在这个小时有 4 次以上的快速查看。

【为什么会这样】
最高频的跳转是「微信 → 抖音」，占抖音打开的 60% 以上，说明抖音很少是主动打开的，更像是社交 App 使用后的惯性延续。

【本周亮点】
你有 6 次「完成任务型」会话（支付、导航、外卖），以及 3 次超过 20 分钟的播客/读书，说明手机也在承担工具和内容陪伴的角色。

【下周小实验】
下周试试在下午 3 点前先把手机放远 10 分钟，只观察这一个时段的快速查看有没有变化。`;

export const DEMO_MONTHLY_AI_SUMMARY = `【本月发现】
这个月你的工作日晚间娱乐更集中，但下半月快速查看比上半月略有下降，说明一些调整已经在发生。

【为什么会这样】
「微信 → 抖音」和「微信 → 小红书 → 抖音」是贯穿全月的两条高频路径，多出现在下午和下班后。播客/音乐则主要覆盖傍晚和睡前，更像陪伴而不是主动刷手机。

【本月亮点】
你保留了稳定的高效事务会话，且多个工作日上午都能维持 20 分钟以上的低切换使用，这是值得继续复制的节奏。

【下月小实验】
下月继续保留晚间播客陪伴，但把下班后第一条娱乐路径延后 10 分钟，观察全月快速查看是否进一步下降。`;
