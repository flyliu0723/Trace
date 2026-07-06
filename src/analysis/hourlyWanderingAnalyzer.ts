import type { BehaviorEvent } from '../types/event';
import { extractDisplayAppSequence } from './pathAnalyzer';

/** 按小时统计 App 切换次数（每次前台 App 变化计 1 次，不含 Launcher） */
export function buildHourlySwitchCounts(events: BehaviorEvent[]): number[] {
  const counts = new Array(24).fill(0) as number[];
  const sequence = extractDisplayAppSequence(events);

  for (let i = 1; i < sequence.length; i += 1) {
    const hour = new Date(sequence[i].timestamp).getHours();
    counts[hour] += 1;
  }

  return counts;
}
