import type { SwitchChain } from './switchChainAnalyzer';
import type { WanderingReason } from './sessionMoodAnalyzer';

const DEFAULT_STING_LINES = [
  '几个 App 之间来回，却没在一个地方停下',
  '屏幕比注意力更快地在切换',
  '这段时间，手指比想法更忙',
];

const REASON_LINES: Record<WanderingReason, string[]> = {
  rapid_switch: [
    '几个 App 之间来回，却没在一个地方停下',
    '高频切换里，很难找到真正想做的事',
  ],
  aimless_browse: [
    '打开了很多，却没有一个停留太久',
    '像是在刷，却说不清在找什么',
  ],
  idle_loop: [
    '解锁了又放下，手比脑子快',
    '短暂停留，没有真正进入任何一件事',
  ],
};

export interface EpisodeStingInput {
  startTime: number;
  switchCount: number;
  apps: Array<{ packageName: string; appLabel: string }>;
  isRepeatedPath?: boolean;
}

export interface DayStingInput {
  totalWanderingMs: number;
  episodeCount: number;
  repeatedPathCount?: number;
  topChain?: SwitchChain;
}

function pickLine(lines: string[], seed: number): string {
  return lines[seed % lines.length] ?? DEFAULT_STING_LINES[0];
}

/** 为单个游离片段生成本地刺痛文案 */
export function generateEpisodeStingLine(
  episode: EpisodeStingInput,
  reason?: WanderingReason,
): string {
  const hour = new Date(episode.startTime).getHours();

  if (hour >= 22 || hour < 6) {
    return '这么晚了，屏幕比睡意更有吸引力';
  }

  if (episode.switchCount >= 5) {
    return '切换越来越快，专注正在碎掉';
  }

  if (episode.isRepeatedPath) {
    return '这条路昨天也走过';
  }

  if (reason) {
    return pickLine(REASON_LINES[reason], episode.startTime);
  }

  const hasSocial = episode.apps.some((app) =>
    /微信|QQ|钉钉|飞书|微博|小红书|抖音/.test(app.appLabel),
  );
  if (hasSocial) {
    return '消息好像回不完，其实可能在逃避别的事';
  }

  return pickLine(DEFAULT_STING_LINES, episode.startTime);
}

/** 为当日游离摘要生成刺痛文案 */
export function generateDayStingLine(summary: DayStingInput): string {
  if (summary.episodeCount === 0) {
    return '';
  }

  if (summary.totalWanderingMs >= 60 * 60_000) {
    return '今天有超过一小时消失在碎片切换里';
  }

  if (summary.episodeCount >= 5) {
    return '游离片段一次次出现，像反复失焦';
  }

  if ((summary.repeatedPathCount ?? 0) > 0) {
    return '有些切换路径，昨天就已经走过一遍';
  }

  if (summary.topChain && summary.topChain.switchCount >= 5) {
    return `最夸张的一段里，你在 ${summary.topChain.apps.slice(0, 3).join('、')} 之间来回横跳`;
  }

  return '这段时间，你似乎在寻找某种安慰';
}
