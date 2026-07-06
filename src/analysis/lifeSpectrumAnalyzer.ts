import type { BehaviorEvent } from '../types/event';
import {
  classifyApp,
  getCategoryColor,
  getCategoryLabel,
  type AppCategory,
} from './appClassifier';
import type { DailyContextMediaReport } from './contextMediaAnalyzer';
import type { EntertainmentReport } from './entertainmentReportAnalyzer';
import { buildPodcastCompanionFromEvents } from './podcastReportAnalyzer';
import type { ReadingReport } from './readingReportAnalyzer';
import type { ShoppingReport } from './shoppingReportAnalyzer';
import { buildForegroundPeriods } from './foregroundPeriodAnalyzer';
import { formatDuration } from './sessionAnalyzer';

/** Hub 内可切换的维度：全部 + 各生活分类 */
export type LifeSpectrumDimension = 'all' | AppCategory;

/** 拥有深度专题报告的维度 */
export const DETAILED_DIMENSIONS = new Set<AppCategory>([
  'media',
  'entertainment',
  'reading',
  'shopping',
]);

export function isDetailedDimension(
  dimension: LifeSpectrumDimension,
): dimension is AppCategory {
  return dimension !== 'all' && DETAILED_DIMENSIONS.has(dimension);
}

export function getDimensionLabel(dimension: LifeSpectrumDimension): string {
  if (dimension === 'all') {
    return '全部';
  }
  if (dimension === 'media') {
    return '播客';
  }
  return getCategoryLabel(dimension);
}

export interface LifeSpectrumTile {
  category: AppCategory;
  label: string;
  icon: string;
  color: string;
  durationMs: number;
  durationLabel: string;
  topAppLabel: string;
  topAppPackageName?: string;
  highlight: string;
  hasData: boolean;
}

export interface DailyLifeSpectrum {
  date: string;
  tiles: LifeSpectrumTile[];
  totalTrackedMs: number;
}

interface CategoryAccumulator {
  durationMs: number;
  topAppLabel: string;
  topAppPackageName: string;
  topAppDurationMs: number;
}

const TILE_ICONS: Record<AppCategory, string> = {
  media: 'headset-outline',
  entertainment: 'play-circle-outline',
  reading: 'book-outline',
  social: 'chatbubbles-outline',
  shopping: 'bag-outline',
  work: 'briefcase-outline',
  navigation: 'navigate-outline',
  utility: 'construct-outline',
  other: 'apps-outline',
};

/** Phase 3 固定展示顺序：播客、娱乐、阅读、购物优先，其余按时长排序 */
const PRIMARY_CATEGORIES: AppCategory[] = ['media', 'entertainment', 'reading', 'shopping'];
const SECONDARY_CATEGORIES: AppCategory[] = [
  'social',
  'work',
  'navigation',
  'utility',
  'other',
];

const FOREGROUND_TILE_CATEGORIES = new Set<AppCategory>(SECONDARY_CATEGORIES);

function resolveTopApp(accumulator: CategoryAccumulator): string {
  if (accumulator.topAppLabel) {
    return accumulator.topAppLabel;
  }
  return '暂无记录';
}

function buildForegroundCategoryMap(events: BehaviorEvent[]): Map<AppCategory, CategoryAccumulator> {
  const map = new Map<AppCategory, CategoryAccumulator>();
  const periods = buildForegroundPeriods(events);

  for (const period of periods) {
    const category = classifyApp(period.packageName, period.appLabel);
    if (!FOREGROUND_TILE_CATEGORIES.has(category)) {
      continue;
    }

    const durationMs = Math.max(0, period.endTime - period.startTime);
    if (durationMs <= 0) {
      continue;
    }

    const existing = map.get(category) ?? {
      durationMs: 0,
      topAppLabel: '',
      topAppPackageName: '',
      topAppDurationMs: 0,
    };

    existing.durationMs += durationMs;
    if (durationMs > existing.topAppDurationMs) {
      existing.topAppDurationMs = durationMs;
      existing.topAppLabel = period.appLabel;
      existing.topAppPackageName = period.packageName;
    }

    map.set(category, existing);
  }

  return map;
}

function buildMediaTile(
  contextMedia: DailyContextMediaReport | null | undefined,
  events: BehaviorEvent[],
): LifeSpectrumTile | null {
  const durationMs = contextMedia?.totalBackgroundMs ?? 0;
  if (durationMs <= 0) {
    return null;
  }

  const topSegment = contextMedia?.segments[0];
  const topAppLabel = topSegment?.appLabel ?? contextMedia?.buckets[0]?.apps[0] ?? '音频';
  const companion = buildPodcastCompanionFromEvents(events, contextMedia);
  const highlight = companion
    ? `${topAppLabel} · 伴随 ${companion.companionRatePercent}%`
    : topSegment?.title
      ? `${topAppLabel} · ${topSegment.title}`
      : topAppLabel;

  return {
    category: 'media',
    label: '播客',
    icon: TILE_ICONS.media,
    color: getCategoryColor('media'),
    durationMs,
    durationLabel: formatDuration(durationMs),
    topAppLabel,
    topAppPackageName: topSegment?.packageName,
    highlight,
    hasData: true,
  };
}

function buildEntertainmentTile(
  entertainment: EntertainmentReport | null | undefined,
): LifeSpectrumTile | null {
  if (!entertainment?.hasData || entertainment.totalBrowseMs <= 0) {
    return null;
  }

  const topApp = entertainment.topApps[0];
  const deepLabel =
    entertainment.deepBrowseCount > 0
      ? `沉迷 ${entertainment.deepBrowseCount} 次`
      : entertainment.impulsiveOpenCount > 0
        ? `快闪 ${entertainment.impulsiveOpenCount} 次`
        : `进入 ${entertainment.totalVisitCount} 次`;
  const highlight = topApp ? `${topApp.appLabel} · ${deepLabel}` : deepLabel;

  return {
    category: 'entertainment',
    label: '娱乐',
    icon: TILE_ICONS.entertainment,
    color: getCategoryColor('entertainment'),
    durationMs: entertainment.totalBrowseMs,
    durationLabel: formatDuration(entertainment.totalBrowseMs),
    topAppLabel: topApp?.appLabel ?? '娱乐应用',
    topAppPackageName: topApp?.packageName,
    highlight,
    hasData: true,
  };
}

function buildReadingTile(
  reading: ReadingReport | null | undefined,
): LifeSpectrumTile | null {
  if (!reading?.hasData || reading.totalReadingMs <= 0) {
    return null;
  }

  const topApp = reading.topApps[0];
  const metricLabel = reading.immersionCount > 0
    ? `沉浸 ${reading.immersionCount} 次`
    : `进入 ${reading.totalVisitCount} 次`;
  const highlight = topApp ? `${topApp.appLabel} · ${metricLabel}` : metricLabel;

  return {
    category: 'reading',
    label: '阅读',
    icon: TILE_ICONS.reading,
    color: getCategoryColor('reading'),
    durationMs: reading.totalReadingMs,
    durationLabel: formatDuration(reading.totalReadingMs),
    topAppLabel: topApp?.appLabel ?? '阅读应用',
    topAppPackageName: topApp?.packageName,
    highlight,
    hasData: true,
  };
}

function buildShoppingTile(
  shopping: ShoppingReport | null | undefined,
): LifeSpectrumTile | null {
  if (!shopping?.hasData || shopping.totalBrowseMs <= 0) {
    return null;
  }

  const topApp = shopping.topApps[0];
  const metricLabel = shopping.decisionSessionCount > 0
    ? `决策 ${shopping.decisionSessionCount} 次`
    : shopping.compareTriggers.length > 0
      ? `比价 ${shopping.compareTriggers[0].count} 次`
      : `进入 ${shopping.totalVisitCount} 次`;
  const highlight = topApp ? `${topApp.appLabel} · ${metricLabel}` : metricLabel;

  return {
    category: 'shopping',
    label: '购物',
    icon: TILE_ICONS.shopping,
    color: getCategoryColor('shopping'),
    durationMs: shopping.totalBrowseMs,
    durationLabel: formatDuration(shopping.totalBrowseMs),
    topAppLabel: topApp?.appLabel ?? '购物应用',
    topAppPackageName: topApp?.packageName,
    highlight,
    hasData: true,
  };
}

function buildSecondaryTile(
  category: AppCategory,
  accumulator: CategoryAccumulator,
): LifeSpectrumTile | null {
  if (accumulator.durationMs <= 0) {
    return null;
  }

  return {
    category,
    label: getCategoryLabel(category),
    icon: TILE_ICONS[category],
    color: getCategoryColor(category),
    durationMs: accumulator.durationMs,
    durationLabel: formatDuration(accumulator.durationMs),
    topAppLabel: resolveTopApp(accumulator),
    topAppPackageName: accumulator.topAppPackageName || undefined,
    highlight: resolveTopApp(accumulator),
    hasData: true,
  };
}

/** 从光谱数据构建 Hub 维度切换列表（全部 + 有数据的分类） */
export function buildHubDimensions(spectrum: DailyLifeSpectrum): LifeSpectrumDimension[] {
  return ['all', ...spectrum.tiles.map((tile) => tile.category)];
}

export function findSpectrumTile(
  spectrum: DailyLifeSpectrum,
  category: AppCategory,
): LifeSpectrumTile | undefined {
  return spectrum.tiles.find((tile) => tile.category === category);
}

function sortSecondaryTiles(tiles: LifeSpectrumTile[]): LifeSpectrumTile[] {
  return [...tiles].sort((a, b) => b.durationMs - a.durationMs);
}

/** 构建首页「今日生活光谱」Bento 数据 */
export function buildDailyLifeSpectrum(
  date: string,
  events: BehaviorEvent[],
  options?: {
    contextMedia?: DailyContextMediaReport | null;
    entertainment?: EntertainmentReport | null;
    reading?: ReadingReport | null;
    shopping?: ShoppingReport | null;
  },
): DailyLifeSpectrum {
  const foregroundMap = buildForegroundCategoryMap(events);
  const primaryTiles: LifeSpectrumTile[] = [];

  const mediaTile = buildMediaTile(options?.contextMedia, events);
  if (mediaTile) {
    primaryTiles.push(mediaTile);
  }

  const entertainmentTile = buildEntertainmentTile(options?.entertainment);
  if (entertainmentTile) {
    primaryTiles.push(entertainmentTile);
  }

  const readingTile = buildReadingTile(options?.reading);
  if (readingTile) {
    primaryTiles.push(readingTile);
  }

  const shoppingTile = buildShoppingTile(options?.shopping);
  if (shoppingTile) {
    primaryTiles.push(shoppingTile);
  }

  const orderedPrimary = PRIMARY_CATEGORIES.map((category) =>
    primaryTiles.find((tile) => tile.category === category),
  ).filter((tile): tile is LifeSpectrumTile => tile !== undefined);

  const secondaryTiles = sortSecondaryTiles(
    SECONDARY_CATEGORIES.map((category) => {
      const accumulator = foregroundMap.get(category);
      if (!accumulator) {
        return null;
      }
      return buildSecondaryTile(category, accumulator);
    }).filter((tile): tile is LifeSpectrumTile => tile !== null),
  );

  const tiles = [...orderedPrimary, ...secondaryTiles];
  const totalTrackedMs = tiles.reduce((sum, tile) => sum + tile.durationMs, 0);

  return {
    date,
    tiles,
    totalTrackedMs,
  };
}
