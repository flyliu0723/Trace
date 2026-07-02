import {
  CONTEXT_COVERAGE_THRESHOLD,
  LYING_INSIGHT_MIN_DURATION_MS,
  UNHEALTHY_BEHAVIOR_MERGE_GAP_MS,
  UNHEALTHY_BEHAVIOR_MIN_DURATION_MS,
  WALKING_INSIGHT_MIN_DURATION_MS,
  WALKING_USAGE_EXCLUDED_CATEGORIES,
} from '../constants';
import type { BehaviorEvent } from '../types/event';
import { classifyApp, type AppCategory } from './appClassifier';
import { formatDuration, formatTime } from './sessionAnalyzer';

export type PhysicalContext = 'WALKING' | 'STILL' | 'RUNNING' | 'IN_VEHICLE' | 'ON_FOOT' | 'UNKNOWN';
export type PostureContext = 'lying' | 'handheld' | 'unknown';

export interface UnhealthyBehaviorSegment {
  kind: 'walking_usage' | 'lying_usage';
  appLabel: string;
  packageName: string;
  startTime: number;
  endTime: number;
  durationMs: number;
}

export interface UnhealthyBehaviorReport {
  walkingUsage: {
    totalDurationMs: number;
    segments: UnhealthyBehaviorSegment[];
  };
  lyingUsage: {
    totalDurationMs: number;
    segments: UnhealthyBehaviorSegment[];
  };
  hasActivityData: boolean;
  hasPostureData: boolean;
}

interface ScreenUsageSegment {
  packageName: string;
  appLabel: string;
  category: AppCategory;
  startTime: number;
  endTime: number;
  durationMs: number;
}

interface TimelinePoint {
  time: number;
  value: string;
}

const PHYSICAL_ACTIVITIES = new Set<PhysicalContext>([
  'WALKING',
  'STILL',
  'RUNNING',
  'IN_VEHICLE',
  'ON_FOOT',
  'UNKNOWN',
]);

function buildActivityTimeline(events: BehaviorEvent[]): TimelinePoint[] {
  const timeline: TimelinePoint[] = [];
  for (const event of events) {
    if (event.type !== 'activity_change' || !event.metadata?.activity) {
      continue;
    }
    const activity = event.metadata.activity as PhysicalContext;
    if (!PHYSICAL_ACTIVITIES.has(activity)) {
      continue;
    }
    timeline.push({ time: event.timestamp, value: activity });
  }
  return timeline.sort((a, b) => a.time - b.time);
}

function buildPostureTimeline(events: BehaviorEvent[]): TimelinePoint[] {
  const timeline: TimelinePoint[] = [];
  for (const event of events) {
    if (event.type !== 'posture_change' || !event.metadata?.posture) {
      continue;
    }
    timeline.push({ time: event.timestamp, value: event.metadata.posture });
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

function buildScreenUsageSegments(events: BehaviorEvent[]): ScreenUsageSegment[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const segments: ScreenUsageSegment[] = [];
  const openApps = new Map<string, BehaviorEvent & { startTime: number }>();

  for (const event of sorted) {
    if (event.type === 'screen_off') {
      for (const [, info] of openApps) {
        segments.push(makeScreenSegment(info, info.startTime, event.timestamp));
      }
      openApps.clear();
      continue;
    }

    if (event.type === 'app_foreground' && event.packageName) {
      if (!openApps.has(event.packageName)) {
        openApps.set(event.packageName, { ...event, startTime: event.timestamp });
      }
      continue;
    }

    if (event.type === 'app_background' && event.packageName) {
      const info = openApps.get(event.packageName);
      if (info) {
        segments.push(makeScreenSegment(info, info.startTime, event.timestamp));
        openApps.delete(event.packageName);
      }
    }
  }

  const lastTimestamp = sorted[sorted.length - 1]?.timestamp ?? Date.now();
  for (const [, info] of openApps) {
    segments.push(makeScreenSegment(info, info.startTime, lastTimestamp));
  }

  return segments.filter((segment) => segment.durationMs >= UNHEALTHY_BEHAVIOR_MIN_DURATION_MS);
}

function makeScreenSegment(
  event: BehaviorEvent,
  startTime: number,
  endTime: number,
): ScreenUsageSegment {
  const durationMs = Math.max(0, endTime - startTime);
  return {
    packageName: event.packageName ?? '',
    appLabel: event.appLabel ?? event.packageName ?? '未知应用',
    category: classifyApp(event.packageName, event.appLabel),
    startTime,
    endTime,
    durationMs,
  };
}

function isExcludedFromWalking(category: AppCategory): boolean {
  return (WALKING_USAGE_EXCLUDED_CATEGORIES as readonly AppCategory[]).includes(category);
}

function mergeSegments(segments: UnhealthyBehaviorSegment[]): UnhealthyBehaviorSegment[] {
  if (segments.length === 0) {
    return [];
  }

  const sorted = [...segments].sort((a, b) => a.startTime - b.startTime);
  const merged: UnhealthyBehaviorSegment[] = [];
  let current = { ...sorted[0] };

  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index];
    const canMerge =
      current.kind === next.kind &&
      current.packageName === next.packageName &&
      next.startTime - current.endTime <= UNHEALTHY_BEHAVIOR_MERGE_GAP_MS;

    if (canMerge) {
      current.endTime = Math.max(current.endTime, next.endTime);
      current.durationMs = current.endTime - current.startTime;
      continue;
    }

    merged.push(current);
    current = { ...next };
  }

  merged.push(current);
  return merged;
}

function getTopAppLabel(segments: UnhealthyBehaviorSegment[]): string | null {
  if (segments.length === 0) {
    return null;
  }

  const durationByApp = new Map<string, number>();
  for (const segment of segments) {
    durationByApp.set(segment.appLabel, (durationByApp.get(segment.appLabel) ?? 0) + segment.durationMs);
  }

  let topLabel: string | null = null;
  let topDuration = 0;
  for (const [label, duration] of durationByApp) {
    if (duration > topDuration) {
      topLabel = label;
      topDuration = duration;
    }
  }
  return topLabel;
}

function getLongestSegment(
  segments: UnhealthyBehaviorSegment[],
): UnhealthyBehaviorSegment | null {
  if (segments.length === 0) {
    return null;
  }
  return segments.reduce((longest, segment) =>
    segment.durationMs > longest.durationMs ? segment : longest,
  );
}

export function analyzeUnhealthyBehaviors(events: BehaviorEvent[]): UnhealthyBehaviorReport {
  const activityTimeline = buildActivityTimeline(events);
  const postureTimeline = buildPostureTimeline(events);
  const screenSegments = buildScreenUsageSegments(events);

  const walkingSegments: UnhealthyBehaviorSegment[] = [];
  const lyingSegments: UnhealthyBehaviorSegment[] = [];

  for (const segment of screenSegments) {
    const walkingCoverage =
      activityTimeline.length > 0
        ? getContextCoverage(segment.startTime, segment.endTime, activityTimeline, 'WALKING')
        : 0;
    const lyingCoverage =
      postureTimeline.length > 0
        ? getContextCoverage(segment.startTime, segment.endTime, postureTimeline, 'lying')
        : 0;

    if (
      walkingCoverage >= CONTEXT_COVERAGE_THRESHOLD &&
      !isExcludedFromWalking(segment.category)
    ) {
      walkingSegments.push({
        kind: 'walking_usage',
        appLabel: segment.appLabel,
        packageName: segment.packageName,
        startTime: segment.startTime,
        endTime: segment.endTime,
        durationMs: segment.durationMs,
      });
    }

    if (lyingCoverage >= CONTEXT_COVERAGE_THRESHOLD) {
      lyingSegments.push({
        kind: 'lying_usage',
        appLabel: segment.appLabel,
        packageName: segment.packageName,
        startTime: segment.startTime,
        endTime: segment.endTime,
        durationMs: segment.durationMs,
      });
    }
  }

  const mergedWalking = mergeSegments(walkingSegments);
  const mergedLying = mergeSegments(lyingSegments);

  return {
    walkingUsage: {
      totalDurationMs: mergedWalking.reduce((sum, segment) => sum + segment.durationMs, 0),
      segments: mergedWalking,
    },
    lyingUsage: {
      totalDurationMs: mergedLying.reduce((sum, segment) => sum + segment.durationMs, 0),
      segments: mergedLying,
    },
    hasActivityData: activityTimeline.length > 0,
    hasPostureData: postureTimeline.length > 0,
  };
}

export function formatUnhealthyBehaviorReport(report: UnhealthyBehaviorReport): string {
  const lines: string[] = [];

  if (!report.hasActivityData && !report.hasPostureData) {
    return '## 场景行为\n暂无运动或姿态数据。请在设置中授予「身体活动」权限并保持监控开启。';
  }

  if (report.hasActivityData) {
    if (report.walkingUsage.totalDurationMs > 0) {
      const topApp = getTopAppLabel(report.walkingUsage.segments);
      const longest = getLongestSegment(report.walkingUsage.segments);
      lines.push(
        `- 行走时使用屏幕：约 ${formatDuration(report.walkingUsage.totalDurationMs)}，${report.walkingUsage.segments.length} 段` +
          (topApp ? `，主要应用 ${topApp}` : '') +
          (longest ? `，最长一段 ${formatDuration(longest.durationMs)}（${formatTime(longest.startTime)}）` : ''),
      );
    } else {
      lines.push('- 行走时使用屏幕：未检测到显著片段');
    }
  }

  if (report.hasPostureData) {
    if (report.lyingUsage.totalDurationMs > 0) {
      const topApp = getTopAppLabel(report.lyingUsage.segments);
      const longest = getLongestSegment(report.lyingUsage.segments);
      lines.push(
        `- 躺卧时使用屏幕：约 ${formatDuration(report.lyingUsage.totalDurationMs)}，${report.lyingUsage.segments.length} 段` +
          (topApp ? `，主要应用 ${topApp}` : '') +
          (longest ? `，最长一段 ${formatDuration(longest.durationMs)}（${formatTime(longest.startTime)}）` : ''),
      );
    } else {
      lines.push('- 躺卧时使用屏幕：未检测到显著片段');
    }
  }

  return `## 场景行为（数字行为 × 现实上下文）\n${lines.join('\n')}`;
}

export function buildWalkingUsageInsight(
  report: UnhealthyBehaviorReport,
): { title: string; description: string } | null {
  if (
    !report.hasActivityData ||
    report.walkingUsage.totalDurationMs < WALKING_INSIGHT_MIN_DURATION_MS
  ) {
    return null;
  }

  const topApp = getTopAppLabel(report.walkingUsage.segments);
  const longest = getLongestSegment(report.walkingUsage.segments);
  const topAppDuration = topApp
    ? report.walkingUsage.segments
        .filter((segment) => segment.appLabel === topApp)
        .reduce((sum, segment) => sum + segment.durationMs, 0)
    : 0;

  let description = `今天约 ${formatDuration(report.walkingUsage.totalDurationMs)} 在步行时查看屏幕`;
  if (topApp) {
    description += `，其中 ${topApp} 约 ${formatDuration(topAppDuration)}`;
  }
  if (longest) {
    description += `。最长一段持续 ${formatDuration(longest.durationMs)}`;
  }
  description += '。边走边看屏幕容易分散注意力。';

  return {
    title: '行走时使用手机',
    description,
  };
}

export function buildLyingUsageInsight(
  report: UnhealthyBehaviorReport,
): { title: string; description: string } | null {
  if (!report.hasPostureData || report.lyingUsage.totalDurationMs < LYING_INSIGHT_MIN_DURATION_MS) {
    return null;
  }

  const topApp = getTopAppLabel(report.lyingUsage.segments);
  const longest = getLongestSegment(report.lyingUsage.segments);

  let description = `今天约 ${formatDuration(report.lyingUsage.totalDurationMs)} 在躺卧状态下使用手机`;
  if (topApp) {
    description += `，主要在 ${topApp}`;
  }
  if (longest) {
    description += `，最长一段 ${formatDuration(longest.durationMs)}`;
  }
  description += '。';

  return {
    title: '躺卧时使用手机',
    description,
  };
}
