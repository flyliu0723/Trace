import type { BehaviorEvent } from '../types/event';
import { classifyApp, PRODUCTIVE_CATEGORIES } from './appClassifier';
import { formatDuration, formatTime } from './sessionAnalyzer';

export type LifeScene =
  | 'morning'
  | 'work_morning'
  | 'afternoon'
  | 'evening'
  | 'bedtime'
  | 'late_night';

const SCENE_LABELS: Record<LifeScene, string> = {
  morning: '早晨',
  work_morning: '上午工作',
  afternoon: '下午',
  evening: '傍晚晚饭',
  bedtime: '睡前',
  late_night: '深夜',
};

const MEDIA_PLAY_TYPES = new Set<BehaviorEvent['type']>(['media_start']);
const MEDIA_END_TYPES = new Set<BehaviorEvent['type']>(['media_pause', 'media_stop']);

export interface MediaPlaybackSegment {
  appLabel: string;
  title?: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  primaryScene: LifeScene;
  hadWorkAppForeground: boolean;
}

export interface MediaSceneSummary {
  scene: LifeScene;
  label: string;
  durationMs: number;
  apps: string[];
}

export interface DailyMediaSceneReport {
  totalDurationMs: number;
  segmentCount: number;
  scenes: MediaSceneSummary[];
  segments: MediaPlaybackSegment[];
}

function getSceneFromHour(hour: number): LifeScene {
  if (hour < 6) {
    return 'late_night';
  }
  if (hour < 9) {
    return 'morning';
  }
  if (hour < 12) {
    return 'work_morning';
  }
  if (hour < 18) {
    return 'afternoon';
  }
  if (hour < 21) {
    return 'evening';
  }
  return 'bedtime';
}

function getSceneFromTimestamp(timestamp: number): LifeScene {
  return getSceneFromHour(new Date(timestamp).getHours());
}

function extractMediaSegments(events: BehaviorEvent[]): MediaPlaybackSegment[] {
  const mediaEvents = [...events]
    .filter((e) => MEDIA_PLAY_TYPES.has(e.type) || MEDIA_END_TYPES.has(e.type))
    .sort((a, b) => a.timestamp - b.timestamp);

  const segments: MediaPlaybackSegment[] = [];
  let currentStart: BehaviorEvent | null = null;

  const flushSegment = (endTimestamp: number) => {
    if (!currentStart || endTimestamp <= currentStart.timestamp) {
      currentStart = null;
      return;
    }

    const startTime = currentStart.timestamp;
    const appLabel = currentStart.appLabel ?? '音频应用';
    const hadWorkAppForeground = events.some((event) => {
      if (event.type !== 'app_foreground' || !event.packageName) {
        return false;
      }
      if (event.timestamp < startTime || event.timestamp > endTimestamp) {
        return false;
      }
      return PRODUCTIVE_CATEGORIES.has(classifyApp(event.packageName, event.appLabel));
    });

    segments.push({
      appLabel,
      title: currentStart.metadata?.title,
      startTime,
      endTime: endTimestamp,
      durationMs: endTimestamp - startTime,
      primaryScene: getSceneFromTimestamp(startTime),
      hadWorkAppForeground,
    });
    currentStart = null;
  };

  for (const event of mediaEvents) {
    if (event.type === 'media_start') {
      if (currentStart === null) {
        currentStart = event;
      }
      continue;
    }
    if (currentStart !== null) {
      flushSegment(event.timestamp);
    }
  }

  if (currentStart !== null) {
    const lastTimestamp = events[events.length - 1]?.timestamp ?? Date.now();
    flushSegment(lastTimestamp);
  }

  return segments.filter((segment) => segment.durationMs >= 30_000);
}

/** 分析单日后台媒体播放的生活场景分布 */
export function analyzeDailyMediaScenes(events: BehaviorEvent[]): DailyMediaSceneReport | null {
  const segments = extractMediaSegments(events);
  if (segments.length === 0) {
    return null;
  }

  const sceneMap = new Map<LifeScene, { durationMs: number; apps: Set<string> }>();

  for (const segment of segments) {
    const entry = sceneMap.get(segment.primaryScene) ?? { durationMs: 0, apps: new Set<string>() };
    entry.durationMs += segment.durationMs;
    entry.apps.add(segment.appLabel);
    sceneMap.set(segment.primaryScene, entry);
  }

  const scenes: MediaSceneSummary[] = [...sceneMap.entries()]
    .map(([scene, value]) => ({
      scene,
      label: SCENE_LABELS[scene],
      durationMs: value.durationMs,
      apps: [...value.apps],
    }))
    .sort((a, b) => b.durationMs - a.durationMs);

  const totalDurationMs = segments.reduce((sum, segment) => sum + segment.durationMs, 0);

  return {
    totalDurationMs,
    segmentCount: segments.length,
    scenes,
    segments: segments.sort((a, b) => b.durationMs - a.durationMs).slice(0, 5),
  };
}

export function formatDailyMediaSceneReport(report: DailyMediaSceneReport): string {
  const sceneLines = report.scenes
    .map((scene) => `- ${scene.label}：${formatDuration(scene.durationMs)}（${scene.apps.join('、')}）`)
    .join('\n');

  const segmentLines = report.segments
    .map((segment) => {
      const title = segment.title ? `「${segment.title}」` : '';
      const workNote = segment.hadWorkAppForeground ? '，期间有工作/工具类 App 在前台' : '';
      return `- ${formatTime(segment.startTime)} ${segment.appLabel}${title}：${formatDuration(segment.durationMs)}，场景「${SCENE_LABELS[segment.primaryScene]}」${workNote}`;
    })
    .join('\n');

  return `总后台播放：${formatDuration(report.totalDurationMs)}，共 ${report.segmentCount} 段

## 场景分布
${sceneLines}

## 主要播放片段
${segmentLines}`;
}

/** 分析多日媒体场景习惯（用于长期画像） */
export function analyzeMediaSceneHabits(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): string[] {
  const sceneDayCount = new Map<LifeScene, number>();
  const sceneDuration = new Map<LifeScene, number>();
  let mediaDays = 0;

  for (const { events } of dateEventPairs) {
    const report = analyzeDailyMediaScenes(events);
    if (!report) {
      continue;
    }
    mediaDays += 1;
    for (const scene of report.scenes) {
      sceneDayCount.set(scene.scene, (sceneDayCount.get(scene.scene) ?? 0) + 1);
      sceneDuration.set(scene.scene, (sceneDuration.get(scene.scene) ?? 0) + scene.durationMs);
    }
  }

  if (mediaDays < 2) {
    return [];
  }

  const habits: string[] = [];
  const sortedScenes = [...sceneDayCount.entries()].sort((a, b) => b[1] - a[1]);

  for (const [scene, dayCount] of sortedScenes.slice(0, 3)) {
    if (dayCount < 2) {
      continue;
    }
    const avgDuration = Math.round((sceneDuration.get(scene) ?? 0) / dayCount / 60_000);
    habits.push(
      `播客/音乐常出现在${SCENE_LABELS[scene]}（${dayCount}/${mediaDays} 天，日均约 ${avgDuration} 分钟）`,
    );
  }

  return habits;
}
