import type { ThemePalettes } from '../theme/types';
import type { BehaviorEvent } from '../types/event';
import {
  classifyApp,
  ENTERTAINMENT_CATEGORIES,
  PRODUCTIVE_CATEGORIES,
} from './appClassifier';

export type DayMood = 'empty' | 'productive' | 'entertainment' | 'mixed';

export interface ContributionDayCell {
  date: string;
  productiveCount: number;
  entertainmentCount: number;
  otherCount: number;
  totalOpens: number;
  unlockCount: number;
  mood: DayMood;
  intensity: number;
}

const MOOD_COLORS: Record<DayMood, string[]> = {
  empty: ['#1A1A1A'],
  productive: ['#243028', '#3D5A42', '#5A7A52', '#7A9B6C', '#A3BE8C'],
  entertainment: ['#302824', '#5A4238', '#8B5A42', '#B07050', '#D08770'],
  mixed: ['#2A2830', '#4A4258', '#6B5A7A', '#8B7A9B', '#B48EAD'],
};

export function buildContributionCells(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): ContributionDayCell[] {
  const maxOpens = Math.max(
    1,
    ...dateEventPairs.map(({ events }) =>
      events.filter((event) => event.type === 'app_foreground').length,
    ),
  );

  return dateEventPairs.map(({ date, events }) => {
    let productiveCount = 0;
    let entertainmentCount = 0;
    let otherCount = 0;

    for (const event of events) {
      if (event.type !== 'app_foreground') {
        continue;
      }
      const category = classifyApp(event.packageName, event.appLabel);
      if (PRODUCTIVE_CATEGORIES.has(category)) {
        productiveCount += 1;
      } else if (ENTERTAINMENT_CATEGORIES.has(category)) {
        entertainmentCount += 1;
      } else {
        otherCount += 1;
      }
    }

    const totalOpens = productiveCount + entertainmentCount + otherCount;
    const unlockCount = events.filter((event) => event.type === 'unlock').length;
    const mood = resolveDayMood(productiveCount, entertainmentCount, totalOpens);
    const intensity = totalOpens === 0 ? 0 : totalOpens / maxOpens;

    return {
      date,
      productiveCount,
      entertainmentCount,
      otherCount,
      totalOpens,
      unlockCount,
      mood,
      intensity,
    };
  });
}

function resolveDayMood(
  productiveCount: number,
  entertainmentCount: number,
  totalOpens: number,
): DayMood {
  if (totalOpens === 0) {
    return 'empty';
  }

  const productiveRatio = productiveCount / totalOpens;
  const entertainmentRatio = entertainmentCount / totalOpens;

  if (productiveRatio >= 0.55 && productiveCount >= 2) {
    return 'productive';
  }
  if (entertainmentRatio >= 0.55 && entertainmentCount >= 2) {
    return 'entertainment';
  }
  if (productiveCount >= 1 && entertainmentCount >= 1) {
    return 'mixed';
  }
  if (productiveCount > entertainmentCount) {
    return 'productive';
  }
  if (entertainmentCount > productiveCount) {
    return 'entertainment';
  }
  return 'mixed';
}

/** @deprecated 使用 getContributionColor(mood, intensity, palettes) */
export function getContributionColor(
  mood: DayMood,
  intensity: number,
  palettes?: ThemePalettes,
): string {
  const palette = palettes?.mood[mood] ?? MOOD_COLORS[mood];
  if (palette.length === 1) {
    return palette[0];
  }

  const level = Math.min(
    palette.length - 1,
    Math.max(1, Math.ceil(intensity * (palette.length - 1))),
  );
  return palette[level];
}

export function getMoodLabel(mood: DayMood): string {
  const labels: Record<DayMood, string> = {
    empty: '安静',
    productive: '专注',
    entertainment: '娱乐',
    mixed: '混合',
  };
  return labels[mood];
}
