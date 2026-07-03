import { WANDERING_BUNDLE_GAP_MS } from '../constants';
import type { BehaviorEvent } from '../types/event';
import { formatDuration, formatTime } from './sessionAnalyzer';
import { analyzeSwitchChains, type SwitchChain } from './switchChainAnalyzer';
import type { DiarySessionEntry } from './diarySessionBuilder';
import { buildDiarySessions } from './diarySessionBuilder';
import { generateDayStingLine, generateEpisodeStingLine } from './wanderingCopywriter';
import { findRepeatedWanderingSessionIds } from './wanderingRepeatAnalyzer';

export interface WanderingViewOptions {
  yesterdayEvents?: BehaviorEvent[];
}

export interface WanderingSummary {
  totalWanderingMs: number;
  episodeCount: number;
  totalSwitchCount: number;
  topChain?: SwitchChain;
  peakBundleId?: string;
  peakTimeLabel?: string;
  repeatedPathCount: number;
  stingLine: string;
}

export interface WanderingEpisode {
  sessionId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  apps: Array<{ packageName: string; appLabel: string }>;
  switchCount: number;
  isRepeatedPath: boolean;
  stingLine: string;
}

export interface WanderingBundle {
  id: string;
  startTime: number;
  endTime: number;
  totalMs: number;
  episodeCount: number;
  switchCount: number;
  previewApps: Array<{ packageName: string; appLabel: string }>;
  episodes: WanderingEpisode[];
}

export type WanderingTimelineItem =
  | {
      type: 'flow_gap';
      id: string;
      startTime: number;
      endTime: number;
      label: string;
    }
  | {
      type: 'collapsed';
      id: string;
      bundle: WanderingBundle;
    };

export interface WanderingDayView {
  date: string;
  summary: WanderingSummary;
  timeline: WanderingTimelineItem[];
  focusApps: FocusAppChip[];
}

export interface FocusAppChip {
  packageName: string;
  appLabel: string;
  durationMs: number;
  sessionCount: number;
}

function buildFocusAppChips(entries: DiarySessionEntry[]): FocusAppChip[] {
  const chipMap = new Map<string, FocusAppChip>();

  for (const entry of entries) {
    if (entry.mood.mood !== 'flow') {
      continue;
    }

    const apps =
      entry.appPath.length > 0
        ? entry.appPath
        : entry.mood.dominantApp
          ? [{ packageName: entry.mood.dominantApp, appLabel: entry.mood.dominantApp }]
          : [];

    for (const app of apps) {
      const existing = chipMap.get(app.packageName);
      if (existing) {
        existing.durationMs += entry.session.durationMs;
        existing.sessionCount += 1;
      } else {
        chipMap.set(app.packageName, {
          packageName: app.packageName,
          appLabel: app.appLabel,
          durationMs: entry.session.durationMs,
          sessionCount: 1,
        });
      }
    }
  }

  return [...chipMap.values()].sort((a, b) => b.durationMs - a.durationMs);
}

function toEpisode(
  entry: DiarySessionEntry,
  repeatedSessionIds: Set<string>,
): WanderingEpisode {
  const { session, mood, appPath } = entry;
  const isRepeatedPath = repeatedSessionIds.has(session.id);

  return {
    sessionId: session.id,
    startTime: session.startTime,
    endTime: session.endTime,
    durationMs: session.durationMs,
    apps: appPath,
    switchCount: mood.switchCount,
    isRepeatedPath,
    stingLine: generateEpisodeStingLine(
      {
        startTime: session.startTime,
        switchCount: mood.switchCount,
        apps: appPath,
        isRepeatedPath,
      },
      mood.wanderingReason,
    ),
  };
}

function buildPreviewApps(episodes: WanderingEpisode[]): Array<{ packageName: string; appLabel: string }> {
  const seen = new Set<string>();
  const preview: Array<{ packageName: string; appLabel: string }> = [];

  for (const episode of episodes) {
    for (const app of episode.apps) {
      if (seen.has(app.packageName)) {
        continue;
      }
      seen.add(app.packageName);
      preview.push(app);
      if (preview.length >= 5) {
        return preview;
      }
    }
  }

  return preview;
}

function buildBundles(
  entries: DiarySessionEntry[],
  repeatedSessionIds: Set<string>,
): WanderingBundle[] {
  const chronological = [...entries].sort(
    (a, b) => a.session.startTime - b.session.startTime,
  );

  const bundles: WanderingBundle[] = [];
  let currentEpisodes: WanderingEpisode[] = [];
  let lastWanderingEnd = 0;

  const flushBundle = () => {
    if (currentEpisodes.length === 0) {
      return;
    }

    const startTime = currentEpisodes[0].startTime;
    const endTime = currentEpisodes[currentEpisodes.length - 1].endTime;
    const totalMs = currentEpisodes.reduce((sum, episode) => sum + episode.durationMs, 0);
    const switchCount = currentEpisodes.reduce((sum, episode) => sum + episode.switchCount, 0);

    bundles.push({
      id: `bundle-${startTime}`,
      startTime,
      endTime,
      totalMs,
      episodeCount: currentEpisodes.length,
      switchCount,
      previewApps: buildPreviewApps(currentEpisodes),
      episodes: currentEpisodes,
    });
    currentEpisodes = [];
  };

  for (const entry of chronological) {
    if (entry.mood.mood === 'wandering') {
      if (
        currentEpisodes.length > 0
        && entry.session.startTime - lastWanderingEnd > WANDERING_BUNDLE_GAP_MS
      ) {
        flushBundle();
      }
      currentEpisodes.push(toEpisode(entry, repeatedSessionIds));
      lastWanderingEnd = entry.session.endTime;
      continue;
    }

    flushBundle();
  }

  flushBundle();
  return bundles;
}

function buildFlowGaps(
  entries: DiarySessionEntry[],
  bundles: WanderingBundle[],
): WanderingTimelineItem[] {
  const flowSessions = entries
    .filter((entry) => entry.mood.mood === 'flow')
    .sort((a, b) => a.session.startTime - b.session.startTime);

  if (flowSessions.length === 0) {
    return [];
  }

  const bundleRanges = bundles.map((bundle) => ({
    start: bundle.startTime,
    end: bundle.endTime,
  }));

  const items: WanderingTimelineItem[] = [];

  for (const entry of flowSessions) {
    const overlapsBundle = bundleRanges.some(
      (range) => entry.session.startTime <= range.end && entry.session.endTime >= range.start,
    );
    if (overlapsBundle) {
      continue;
    }

    const label = entry.mood.dominantApp
      ? `专注使用 · ${entry.mood.dominantApp} · ${formatDuration(entry.session.durationMs)}`
      : `专注时段 · ${formatDuration(entry.session.durationMs)}`;

    items.push({
      type: 'flow_gap',
      id: `flow-${entry.session.id}`,
      startTime: entry.session.startTime,
      endTime: entry.session.endTime,
      label,
    });
  }

  return items;
}

function buildSummary(
  episodes: WanderingEpisode[],
  events: BehaviorEvent[],
  bundles: WanderingBundle[],
): WanderingSummary {
  const chains = analyzeSwitchChains(events);
  const peakBundle = [...bundles].sort(
    (a, b) => b.switchCount - a.switchCount || b.totalMs - a.totalMs,
  )[0];

  const summary: WanderingSummary = {
    totalWanderingMs: episodes.reduce((sum, episode) => sum + episode.durationMs, 0),
    episodeCount: episodes.length,
    totalSwitchCount: episodes.reduce((sum, episode) => sum + episode.switchCount, 0),
    topChain: chains[0],
    peakBundleId: peakBundle?.id,
    peakTimeLabel: peakBundle
      ? `${formatTime(peakBundle.startTime)}–${formatTime(peakBundle.endTime)}`
      : undefined,
    repeatedPathCount: episodes.filter((episode) => episode.isRepeatedPath).length,
    stingLine: '',
  };
  summary.stingLine = generateDayStingLine(summary);
  return summary;
}

/** 从事件流构建游离复盘视图 */
export function buildWanderingDayView(
  date: string,
  events: BehaviorEvent[],
  options: WanderingViewOptions = {},
): WanderingDayView {
  const repeatedSessionIds = options.yesterdayEvents
    ? findRepeatedWanderingSessionIds(events, options.yesterdayEvents)
    : new Set<string>();

  const entries = buildDiarySessions(events);
  const wanderingEntries = entries.filter((entry) => entry.mood.mood === 'wandering');
  const episodes = wanderingEntries.map((entry) => toEpisode(entry, repeatedSessionIds));
  const bundles = buildBundles(entries, repeatedSessionIds);
  const flowGaps = buildFlowGaps(entries, bundles);

  const timeline: WanderingTimelineItem[] = [
    ...bundles.map((bundle) => ({
      type: 'collapsed' as const,
      id: bundle.id,
      bundle,
    })),
    ...flowGaps,
  ].sort((a, b) => {
    const aTime = a.type === 'collapsed' ? a.bundle.startTime : a.startTime;
    const bTime = b.type === 'collapsed' ? b.bundle.startTime : b.startTime;
    return bTime - aTime;
  });

  return {
    date,
    summary: buildSummary(episodes, events, bundles),
    timeline,
    focusApps: buildFocusAppChips(entries),
  };
}

export function findBundleIndexById(
  view: WanderingDayView,
  bundleId: string,
): number {
  return view.timeline.findIndex(
    (item) => item.type === 'collapsed' && item.id === bundleId,
  );
}

export function findBundleIdBySessionId(
  view: WanderingDayView,
  sessionId: string,
): string | null {
  for (const item of view.timeline) {
    if (item.type !== 'collapsed') {
      continue;
    }
    if (item.bundle.episodes.some((episode) => episode.sessionId === sessionId)) {
      return item.bundle.id;
    }
  }
  return null;
}
