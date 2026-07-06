import type { BehaviorEvent } from '../types/event';
import { extractDisplayAppSequence } from './pathAnalyzer';
import { formatTime } from './sessionAnalyzer';

export interface SwitchChain {
  startTime: number;
  endTime: number;
  apps: string[];
  switchCount: number;
}

const CHAIN_GAP_MS = 3 * 60_000;
const MIN_CHAIN_APPS = 3;
const MAX_CHAINS = 5;

/** 从事件流中提取连续快速切换的 App 链 */
export function analyzeSwitchChains(events: BehaviorEvent[]): SwitchChain[] {
  const sequence = extractDisplayAppSequence(events);
  if (sequence.length < MIN_CHAIN_APPS) {
    return [];
  }

  const chains: SwitchChain[] = [];
  let chainStart = 0;

  const flushChain = (start: number, end: number) => {
    const segment = sequence.slice(start, end + 1);
    if (segment.length < MIN_CHAIN_APPS) {
      return;
    }
    chains.push({
      startTime: segment[0].timestamp,
      endTime: segment[segment.length - 1].timestamp,
      apps: segment.map((item) => item.appLabel),
      switchCount: segment.length - 1,
    });
  };

  for (let i = 1; i < sequence.length; i += 1) {
    const gapMs = sequence[i].timestamp - sequence[i - 1].timestamp;
    if (gapMs > CHAIN_GAP_MS) {
      flushChain(chainStart, i - 1);
      chainStart = i;
    }
  }

  flushChain(chainStart, sequence.length - 1);

  return chains
    .sort((a, b) => b.switchCount - a.switchCount || b.endTime - a.endTime)
    .slice(0, MAX_CHAINS);
}

export function formatSwitchChains(chains: SwitchChain[]): string {
  if (chains.length === 0) {
    return '暂无';
  }

  return chains
    .map((chain) => {
      const range =
        formatTime(chain.startTime) === formatTime(chain.endTime)
          ? formatTime(chain.startTime)
          : `${formatTime(chain.startTime)}~${formatTime(chain.endTime)}`;
      const path = chain.apps.join('\n↓\n');
      return `${range}\n连续切换：\n${path}\n共切换 ${chain.switchCount} 次`;
    })
    .join('\n\n');
}
