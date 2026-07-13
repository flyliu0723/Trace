import {
  CONTEXT_MEDIA_COVERAGE_THRESHOLD,
  CONTEXT_MEDIA_MIN_SEGMENT_MS,
} from '../constants';
import type { BehaviorEvent } from '../types/event';
import { extractMediaSegments, type MediaPlaybackSegment } from './mediaSceneAnalyzer';
import { formatDuration, formatTime } from './sessionAnalyzer';

export type MediaListeningContext = 'in_vehicle' | 'walking' | 'passive';

export interface ContextMediaSegment {
  context: MediaListeningContext;
  appLabel: string;
  packageName?: string;
  title?: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  trackCount: number;
  pauseCount?: number;
}

export interface ContextMediaBucket {
  context: MediaListeningContext;
  label: string;
  totalDurationMs: number;
  segmentCount: number;
  totalPauseCount: number;
  trackCount: number;
  apps: string[];
  topSegments: ContextMediaSegment[];
}

export interface DailyContextMediaReport {
  hasActivityData: boolean;
  totalBackgroundMs: number;
  buckets: ContextMediaBucket[];
  segments: ContextMediaSegment[];
}

const CONTEXT_LABELS: Record<MediaListeningContext, string> = {
  in_vehicle: '行进收听',
  walking: '步行收听',
  passive: '后台陪伴',
};

const WALKING_ACTIVITIES = new Set(['WALKING', 'RUNNING', 'ON_FOOT']);

interface TimelinePoint {
  time: number;
  value: string;
}

function buildActivityTimeline(events: BehaviorEvent[]): TimelinePoint[] {
  const timeline: TimelinePoint[] = [];
  for (const event of events) {
    if (event.type !== 'activity_change' || !event.metadata?.activity) {
      continue;
    }
    timeline.push({ time: event.timestamp, value: event.metadata.activity });
  }
  return timeline.sort((a, b) => a.time - b.time);
}

function getValueAt(time: number, timeline: TimelinePoint[]): string | null {
  let result: string | null = null;
  for (const point of timeline) {
    if (point.time <= time) {
      result = point.value;
      continue;
    }
    break;
  }
  return result;
}

function getContextCoverage(
  startTime: number,
  endTime: number,
  timeline: TimelinePoint[],
  targetValue: string,
  sampleIntervalMs = 10_000,
): number {
  if (endTime <= startTime || timeline.length === 0) {
    return 0;
  }

  let matching = 0;
  let total = 0;
  for (let time = startTime; time < endTime; time += sampleIntervalMs) {
    total += 1;
    if (getValueAt(time, timeline) === targetValue) {
      matching += 1;
    }
  }

  return total > 0 ? matching / total : 0;
}

function getWalkingCoverage(
  startTime: number,
  endTime: number,
  timeline: TimelinePoint[],
): number {
  let maxCoverage = 0;
  for (const activity of WALKING_ACTIVITIES) {
    maxCoverage = Math.max(
      maxCoverage,
      getContextCoverage(startTime, endTime, timeline, activity),
    );
  }
  return maxCoverage;
}

function countTracksInSegment(
  events: BehaviorEvent[],
  startTime: number,
  endTime: number,
): number {
  const changes = events.filter(
    (event) =>
      event.type === 'media_track_change' &&
      event.timestamp > startTime &&
      event.timestamp <= endTime,
  ).length;
  return changes + 1;
}

function classifySegmentContext(
  segment: MediaPlaybackSegment,
  activityTimeline: TimelinePoint[],
): MediaListeningContext {
  if (activityTimeline.length === 0) {
    return 'passive';
  }

  const vehicleCoverage = getContextCoverage(
    segment.startTime,
    segment.endTime,
    activityTimeline,
    'IN_VEHICLE',
  );
  if (vehicleCoverage >= CONTEXT_MEDIA_COVERAGE_THRESHOLD) {
    return 'in_vehicle';
  }

  const walkingCoverage = getWalkingCoverage(
    segment.startTime,
    segment.endTime,
    activityTimeline,
  );
  if (walkingCoverage >= CONTEXT_MEDIA_COVERAGE_THRESHOLD) {
    return 'walking';
  }

  return 'passive';
}

function toContextSegment(
  segment: MediaPlaybackSegment,
  context: MediaListeningContext,
  events: BehaviorEvent[],
  sourceEvent?: BehaviorEvent,
): ContextMediaSegment {
  return {
    context,
    appLabel: segment.appLabel,
    packageName: sourceEvent?.packageName,
    title: segment.title,
    startTime: segment.startTime,
    endTime: segment.endTime,
    durationMs: segment.durationMs,
    trackCount: countTracksInSegment(events, segment.startTime, segment.endTime),
    pauseCount: segment.pauseCount,
  };
}

function findSegmentStartEvent(
  events: BehaviorEvent[],
  segment: MediaPlaybackSegment,
): BehaviorEvent | undefined {
  return events.find(
    (event) =>
      (event.type === 'media_start' || event.type === 'media_track_change') &&
      event.timestamp === segment.startTime &&
      (event.appLabel ?? '') === segment.appLabel,
  );
}

function buildBucket(
  context: MediaListeningContext,
  segments: ContextMediaSegment[],
): ContextMediaBucket | null {
  if (segments.length === 0) {
    return null;
  }

  const apps = [...new Set(segments.map((segment) => segment.appLabel))];
  const trackCount = segments.reduce((sum, segment) => sum + segment.trackCount, 0);
  const totalDurationMs = segments.reduce((sum, segment) => sum + segment.durationMs, 0);
  const totalPauseCount = segments.reduce((sum, segment) => sum + (segment.pauseCount ?? 0), 0);

  return {
    context,
    label: CONTEXT_LABELS[context],
    totalDurationMs,
    segmentCount: segments.length,
    totalPauseCount,
    trackCount,
    apps,
    topSegments: [...segments].sort((a, b) => b.durationMs - a.durationMs).slice(0, 3),
  };
}

/** 交叉 activity 时间线与媒体片段，产出行进/步行/后台收听报告 */
export function analyzeContextMedia(events: BehaviorEvent[]): DailyContextMediaReport | null {
  const mediaSegments = extractMediaSegments(events);
  if (mediaSegments.length === 0) {
    return null;
  }

  const activityTimeline = buildActivityTimeline(events);
  const contextSegments = mediaSegments.map((segment) => {
    const context = classifySegmentContext(segment, activityTimeline);
    const sourceEvent = findSegmentStartEvent(events, segment);
    return toContextSegment(segment, context, events, sourceEvent);
  });

  const bucketMap = new Map<MediaListeningContext, ContextMediaSegment[]>();
  for (const segment of contextSegments) {
    const list = bucketMap.get(segment.context) ?? [];
    list.push(segment);
    bucketMap.set(segment.context, list);
  }

  const bucketOrder: MediaListeningContext[] = ['in_vehicle', 'walking', 'passive'];
  const buckets = bucketOrder
    .map((context) => buildBucket(context, bucketMap.get(context) ?? []))
    .filter((bucket): bucket is ContextMediaBucket => bucket !== null);

  const totalBackgroundMs = contextSegments.reduce(
    (sum, segment) => sum + segment.durationMs,
    0,
  );

  return {
    hasActivityData: activityTimeline.length > 0,
    totalBackgroundMs,
    buckets,
    segments: contextSegments.sort((a, b) => b.durationMs - a.durationMs),
  };
}

/** 某时刻的媒体收听上下文（用于时间线标注） */
export function resolveMediaContextLabel(
  events: BehaviorEvent[],
  timestamp: number,
): string | null {
  const activity = getValueAt(timestamp, buildActivityTimeline(events));
  if (activity === 'IN_VEHICLE') {
    return '行进中';
  }
  if (activity && WALKING_ACTIVITIES.has(activity)) {
    return '步行中';
  }
  return null;
}

export function formatContextMediaBucketSummary(bucket: ContextMediaBucket): string {
  const appText = bucket.apps.slice(0, 2).join('、');
  const trackText = bucket.trackCount > 0 ? `${bucket.trackCount} 集` : '';
  const parts = [formatDuration(bucket.totalDurationMs), trackText, appText].filter(Boolean);
  return parts.join(' · ');
}

export function formatContextMediaSegmentLine(segment: ContextMediaSegment): string {
  const title = segment.title ? `「${segment.title}」` : '';
  const trackText = segment.trackCount > 1 ? `${segment.trackCount} 集` : '1 集';
  const pauseText =
    segment.pauseCount && segment.pauseCount > 0 ? `，中途暂停 ${segment.pauseCount} 次` : '';
  return `${formatTime(segment.startTime)} ${segment.appLabel}${title}：${formatDuration(segment.durationMs)}（${trackText}${pauseText}）`;
}

export function buildContextMediaInsight(report: DailyContextMediaReport): {
  title: string;
  description: string;
} | null {
  const vehicle = report.buckets.find((bucket) => bucket.context === 'in_vehicle');
  const walking = report.buckets.find((bucket) => bucket.context === 'walking');
  const passive = report.buckets.find((bucket) => bucket.context === 'passive');

  const highlights: string[] = [];
  if (vehicle && vehicle.totalDurationMs >= CONTEXT_MEDIA_MIN_SEGMENT_MS) {
    highlights.push(
      `${vehicle.label} ${formatDuration(vehicle.totalDurationMs)}（${vehicle.trackCount} 集，${vehicle.apps.join('、')}）`,
    );
  }
  if (walking && walking.totalDurationMs >= CONTEXT_MEDIA_MIN_SEGMENT_MS) {
    highlights.push(
      `${walking.label} ${formatDuration(walking.totalDurationMs)}（${walking.trackCount} 集）`,
    );
  }
  if (passive && passive.totalDurationMs >= CONTEXT_MEDIA_MIN_SEGMENT_MS) {
    const contextualCount =
      (vehicle?.segmentCount ?? 0) + (walking?.segmentCount ?? 0);
    const prefix =
      contextualCount > 0
        ? `另有 ${passive.segmentCount} 段`
        : `共 ${passive.segmentCount} 段`;
    highlights.push(`${prefix}${passive.label} ${formatDuration(passive.totalDurationMs)}`);
  }

  if (highlights.length === 0) {
    return null;
  }

  return {
    title: '伴随式收听',
    description: highlights.join('；'),
  };
}

export function getContextMediaAccentKey(context: MediaListeningContext): 'accent' | 'quickSession' | 'media' {
  if (context === 'in_vehicle') {
    return 'accent';
  }
  if (context === 'walking') {
    return 'quickSession';
  }
  return 'media';
}
