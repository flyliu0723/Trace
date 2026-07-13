import type { BehaviorEvent } from '../../types/event';
import { addDays, formatDisplayDate, getDateStringsEndingAt } from '../../utils/dateUtils';
import { analyzeContextMedia } from '../contextMediaAnalyzer';
import { buildEntertainmentReport } from '../entertainmentReportAnalyzer';
import { buildPodcastReport } from '../podcastReportAnalyzer';
import {
  analyzeSessionMood,
} from '../sessionMoodAnalyzer';
import { analyzeSessionGoals } from '../sessionGoalAnalyzer';
import {
  buildDailySummary,
  buildSessions,
  formatDuration,
  formatTime,
} from '../sessionAnalyzer';
import {
  ACHIEVEMENT_CATALOG,
  type AchievementEvidence,
  type AchievementRuleId,
  getAchievementDefinition,
} from './achievementCatalog';

export interface AchievementEvalContext {
  date: string;
  events: BehaviorEvent[];
  /** 含 date 及更早若干日，按 date 升序 */
  historyPairs: Array<{ date: string; events: BehaviorEvent[] }>;
  /** 已解锁过的 onceOnly rule，或当日已解锁的可重复 rule */
  alreadySatisfied: Set<AchievementRuleId>;
}

export interface AchievementUnlockCandidate {
  ruleId: AchievementRuleId;
  evidence: AchievementEvidence;
}

const THIRTY_MIN_MS = 30 * 60_000;
const TWENTY_MIN_MS = 20 * 60_000;
const TWO_HOUR_MS = 2 * 60 * 60_000;

function getLastActivityTimestamp(events: BehaviorEvent[]): number | null {
  const activityTypes = new Set<BehaviorEvent['type']>([
    'unlock',
    'app_foreground',
    'screen_off',
    'media_start',
    'media_track_change',
  ]);
  const activities = events.filter((e) => activityTypes.has(e.type));
  if (activities.length === 0) {
    return null;
  }
  return Math.max(...activities.map((e) => e.timestamp));
}

function isAfterMidnight(timestamp: number): boolean {
  return new Date(timestamp).getHours() < 5;
}

function findFlowSession(events: BehaviorEvent[]) {
  const sessions = buildSessions(events);
  const goals = analyzeSessionGoals(sessions);
  for (let i = 0; i < sessions.length; i += 1) {
    const mood = analyzeSessionMood(sessions[i], goals[i]);
    if (mood.mood === 'flow') {
      return { session: sessions[i], dominantApp: mood.dominantApp };
    }
  }
  return null;
}

function countLateNightStreak(
  date: string,
  historyPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): { streak: number; lastTimeLabel: string } | null {
  const byDate = new Map(historyPairs.map((pair) => [pair.date, pair.events]));
  const todayEvents = byDate.get(date);
  if (!todayEvents || todayEvents.length === 0) {
    return null;
  }
  const lastActivity = getLastActivityTimestamp(todayEvents);
  if (lastActivity === null || !isAfterMidnight(lastActivity)) {
    return null;
  }

  let streak = 1;
  let cursor = date;
  while (true) {
    const prevDate = addDays(cursor, -1);
    const prevEvents = byDate.get(prevDate);
    if (!prevEvents || prevEvents.length === 0) {
      break;
    }
    const prevLast = getLastActivityTimestamp(prevEvents);
    if (prevLast === null || !isAfterMidnight(prevLast)) {
      break;
    }
    streak += 1;
    cursor = prevDate;
  }

  return { streak, lastTimeLabel: formatTime(lastActivity) };
}

function countRecordStreak(
  date: string,
  historyPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): number {
  const byDate = new Map(historyPairs.map((pair) => [pair.date, pair.events]));
  let streak = 0;
  let cursor = date;
  while (true) {
    const events = byDate.get(cursor);
    if (!events || events.length === 0) {
      break;
    }
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

type RuleEvaluator = (ctx: AchievementEvalContext) => AchievementEvidence | null;

const RULE_EVALUATORS: Record<AchievementRuleId, RuleEvaluator> = {
  'first-flow'(ctx) {
    const flow = findFlowSession(ctx.events);
    if (!flow) {
      return null;
    }
    const appLabel = flow.dominantApp ?? flow.session.apps[0] ?? '某个 App';
    return {
      date: ctx.date,
      summary: `${formatDisplayDate(ctx.date)} 出现第一次沉浸会话`,
      metrics: { durationMs: flow.session.durationMs },
      steps: [
        { label: `${formatTime(flow.session.startTime)} 开始使用` },
        { label: `主要在「${appLabel}」` },
        { label: `连续 ${formatDuration(flow.session.durationMs)}，进入沉浸` },
      ],
    };
  },

  'first-quiet-entertain'(ctx) {
    const report = buildEntertainmentReport(ctx.date, ctx.events, []);
    if (!report.hasData || report.deepBrowseCount !== 0) {
      return null;
    }
    return {
      date: ctx.date,
      summary: `${formatDisplayDate(ctx.date)} 有娱乐但无长时间沉迷`,
      metrics: {
        totalBrowseMs: report.totalBrowseMs,
        deepBrowseCount: report.deepBrowseCount,
      },
      steps: [
        { label: `娱乐浏览 ${formatDuration(report.totalBrowseMs)}` },
        { label: `进入 ${report.totalVisitCount} 次` },
        { label: '没有超过 30 分钟的沉迷段' },
      ],
    };
  },

  'sound-companion'(ctx) {
    const report = buildPodcastReport(ctx.date, ctx.events, []);
    const companion = report.companion;
    if (
      !report.hasData
      || !companion
      || companion.companionRatePercent < 70
      || report.totalListeningMs < THIRTY_MIN_MS
    ) {
      return null;
    }
    return {
      date: ctx.date,
      summary: `伴随率 ${companion.companionRatePercent}%，收听 ${formatDuration(report.totalListeningMs)}`,
      metrics: {
        companionRatePercent: companion.companionRatePercent,
        totalListeningMs: report.totalListeningMs,
      },
      steps: [
        { label: `总收听 ${formatDuration(report.totalListeningMs)}` },
        { label: `伴随率 ${companion.companionRatePercent}%` },
        { label: '多数时间不必盯着播放器' },
      ],
    };
  },

  'walking-listen'(ctx) {
    const contextMedia = analyzeContextMedia(ctx.events);
    const walking = contextMedia?.buckets.find((bucket) => bucket.context === 'walking');
    if (!walking || walking.totalDurationMs < TWENTY_MIN_MS) {
      return null;
    }
    return {
      date: ctx.date,
      summary: `步行收听 ${formatDuration(walking.totalDurationMs)}`,
      metrics: { walkingMs: walking.totalDurationMs },
      steps: [
        { label: '检测到步行状态' },
        { label: `收听约 ${formatDuration(walking.totalDurationMs)}` },
        { label: walking.apps.slice(0, 2).join('、') || '音频应用' },
      ],
    };
  },

  'vehicle-listen'(ctx) {
    const contextMedia = analyzeContextMedia(ctx.events);
    const vehicle = contextMedia?.buckets.find((bucket) => bucket.context === 'in_vehicle');
    if (!vehicle || vehicle.totalDurationMs < TWENTY_MIN_MS) {
      return null;
    }
    return {
      date: ctx.date,
      summary: `行进收听 ${formatDuration(vehicle.totalDurationMs)}`,
      metrics: { vehicleMs: vehicle.totalDurationMs },
      steps: [
        { label: '检测到行进状态' },
        { label: `收听约 ${formatDuration(vehicle.totalDurationMs)}` },
        { label: vehicle.apps.slice(0, 2).join('、') || '音频应用' },
      ],
    };
  },

  'polite-glance'(ctx) {
    const summary = buildDailySummary(ctx.date, ctx.events);
    if (summary.unlockCount < 40 || summary.activeInteractionMs >= THIRTY_MIN_MS) {
      return null;
    }
    return {
      date: ctx.date,
      summary: `解锁 ${summary.unlockCount} 次，亮屏仅 ${formatDuration(summary.activeInteractionMs)}`,
      metrics: {
        unlockCount: summary.unlockCount,
        activeInteractionMs: summary.activeInteractionMs,
      },
      steps: [
        { label: `解锁 ${summary.unlockCount} 次` },
        { label: `亮屏 ${formatDuration(summary.activeInteractionMs)}` },
        { label: '像是在礼貌地确认一下' },
      ],
    };
  },

  'schrodinger-unlock'(ctx) {
    const summary = buildDailySummary(ctx.date, ctx.events);
    if (summary.unlockCount < 80 || summary.activeInteractionMs >= THIRTY_MIN_MS) {
      return null;
    }
    return {
      date: ctx.date,
      summary: `解锁 ${summary.unlockCount} 次，亮屏仅 ${formatDuration(summary.activeInteractionMs)}`,
      metrics: {
        unlockCount: summary.unlockCount,
        activeInteractionMs: summary.activeInteractionMs,
      },
      steps: [
        { label: `解锁高达 ${summary.unlockCount} 次` },
        { label: `亮屏却只有 ${formatDuration(summary.activeInteractionMs)}` },
        { label: '薛定谔式：又用了，又没怎么用' },
      ],
    };
  },

  'deep-browse'(ctx) {
    const report = buildEntertainmentReport(ctx.date, ctx.events, []);
    const longest = report.longestBlock;
    const qualifies =
      longest !== null
      && longest.durationMs >= TWO_HOUR_MS
      && (report.deepBrowseCount >= 1 || longest.durationMs >= TWO_HOUR_MS);
    if (!report.hasData || !qualifies || !longest) {
      return null;
    }
    return {
      date: ctx.date,
      summary: `${longest.appLabel} 连续 ${formatDuration(longest.durationMs)}`,
      metrics: {
        longestMs: longest.durationMs,
        deepBrowseCount: report.deepBrowseCount,
      },
      steps: [
        { label: `${formatTime(longest.startTime)} 打开 ${longest.appLabel}` },
        { label: `连续停留 ${formatDuration(longest.durationMs)}` },
        { label: '从屏幕里回来时，时间已经跳格' },
      ],
    };
  },

  'record-streak-7'(ctx) {
    const streak = countRecordStreak(ctx.date, ctx.historyPairs);
    if (streak < 7) {
      return null;
    }
    const startDate = addDays(ctx.date, -(streak - 1));
    return {
      date: ctx.date,
      summary: `连续 ${streak} 天有行为记录`,
      metrics: { streak },
      steps: [
        { label: `自 ${formatDisplayDate(startDate)} 起` },
        { label: `连续 ${streak} 天留下足迹` },
        { label: `截至 ${formatDisplayDate(ctx.date)}` },
      ],
    };
  },

  'late-night-streak-3'(ctx) {
    const result = countLateNightStreak(ctx.date, ctx.historyPairs);
    if (!result || result.streak < 3) {
      return null;
    }
    return {
      date: ctx.date,
      summary: `连续 ${result.streak} 天最后使用超过 0 点（${result.lastTimeLabel}）`,
      metrics: { streak: result.streak },
      steps: [
        { label: `本日最后活动 ${result.lastTimeLabel}` },
        { label: `已连续 ${result.streak} 天跨过零点` },
        { label: '凌晨还醒着' },
      ],
    };
  },
};

/** 对单日求值，返回新的解锁候选（调用方负责持久化与去重） */
export function evaluateAchievementsForDay(
  ctx: AchievementEvalContext,
): AchievementUnlockCandidate[] {
  const unlocked: AchievementUnlockCandidate[] = [];

  for (const definition of ACHIEVEMENT_CATALOG) {
    if (ctx.alreadySatisfied.has(definition.id)) {
      continue;
    }
    const evidence = RULE_EVALUATORS[definition.id](ctx);
    if (!evidence) {
      continue;
    }
    unlocked.push({ ruleId: definition.id, evidence });
  }

  return unlocked;
}

/** 构建求值所需的历史窗口（含目标日向前 lookbackDays 天） */
export function buildHistoryWindow(
  endDate: string,
  eventsByDate: Map<string, BehaviorEvent[]>,
  lookbackDays = 14,
): Array<{ date: string; events: BehaviorEvent[] }> {
  const dates = getDateStringsEndingAt(endDate, lookbackDays);
  return dates.map((date) => ({
    date,
    events: eventsByDate.get(date) ?? [],
  }));
}

export function describeUnlock(ruleId: AchievementRuleId): string {
  return getAchievementDefinition(ruleId)?.name ?? ruleId;
}
