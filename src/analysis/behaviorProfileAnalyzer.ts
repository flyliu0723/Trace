import type { BehaviorEvent } from '../types/event';
import { analyzeBehaviorPatterns } from './patternAnalyzer';
import { analyzePathTriggers } from './pathAnalyzer';
import { analyzeMediaSceneHabits } from './mediaSceneAnalyzer';
import { buildDailySummary, buildSessions, formatDuration } from './sessionAnalyzer';
import { analyzeSessionGoals, summarizeSessionGoals } from './sessionGoalAnalyzer';

export interface BehaviorProfileTrait {
  id: string;
  label: string;
  description: string;
}

export interface BehaviorProfile {
  baselineDays: number;
  traits: BehaviorProfileTrait[];
}

function isWeekend(dateStr: string): boolean {
  const day = new Date(`${dateStr}T12:00:00`).getDay();
  return day === 0 || day === 6;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getLongestProductiveSessionMinutes(events: BehaviorEvent[]): number {
  const sessions = buildSessions(events);
  const goals = analyzeSessionGoals(sessions);
  const productive = goals.filter((g) => g.goalType === 'productive');
  if (productive.length === 0) {
    return 0;
  }
  return Math.round(Math.max(...productive.map((g) => g.durationMs)) / 60_000);
}

/** 从多日事件构建长期行为画像 */
export function buildBehaviorProfile(
  dateEventPairs: Array<{ date: string; events: BehaviorEvent[] }>,
  minActiveDays = 5,
): BehaviorProfile | null {
  const activePairs = dateEventPairs.filter((pair) => pair.events.length > 0);
  if (activePairs.length < minActiveDays) {
    return null;
  }

  const traits: BehaviorProfileTrait[] = [];
  const weekdayPairs = activePairs.filter((pair) => !isWeekend(pair.date));
  const weekendPairs = activePairs.filter((pair) => isWeekend(pair.date));

  if (weekdayPairs.length >= 3 && weekendPairs.length >= 1) {
    const weekdayUnlockAvg = average(
      weekdayPairs.map((pair) => buildDailySummary(pair.date, pair.events).unlockCount),
    );
    const weekendUnlockAvg = average(
      weekendPairs.map((pair) => buildDailySummary(pair.date, pair.events).unlockCount),
    );

    if (weekdayUnlockAvg > weekendUnlockAvg * 1.2) {
      traits.push({
        id: 'weekday-heavier',
        label: '工作日用手机更频繁',
        description: `工作日日均解锁约 ${Math.round(weekdayUnlockAvg)} 次，周末约 ${Math.round(weekendUnlockAvg)} 次。`,
      });
    } else if (weekendUnlockAvg > weekdayUnlockAvg * 1.2) {
      traits.push({
        id: 'weekend-heavier',
        label: '周末用手机更频繁',
        description: `周末日均解锁约 ${Math.round(weekendUnlockAvg)} 次，工作日约 ${Math.round(weekdayUnlockAvg)} 次。`,
      });
    }
  }

  const morningFocusDays = activePairs.filter((pair) => {
    const sessions = buildSessions(pair.events);
    return sessions.some((session) => {
      const hour = new Date(session.startTime).getHours();
      return hour >= 9 && hour < 12 && session.durationMs >= 20 * 60_000 && session.apps.length <= 2;
    });
  }).length;

  if (morningFocusDays >= Math.ceil(activePairs.length * 0.4)) {
    traits.push({
      id: 'morning-focus',
      label: '上午专注度较高',
      description: `${morningFocusDays}/${activePairs.length} 天在上午有 20 分钟以上的低切换会话。`,
    });
  }

  const eveningEntertainmentDays = activePairs.filter((pair) => {
    const sessions = buildSessions(pair.events);
    const goals = summarizeSessionGoals(analyzeSessionGoals(sessions));
    const eveningSessions = sessions.filter((session) => new Date(session.startTime).getHours() >= 18);
    return goals.entertainmentCount >= 2 && eveningSessions.length >= 2;
  }).length;

  if (eveningEntertainmentDays >= Math.ceil(activePairs.length * 0.35)) {
    traits.push({
      id: 'evening-entertainment',
      label: '晚上娱乐更集中',
      description: `${eveningEntertainmentDays}/${activePairs.length} 天在晚间出现多次娱乐浏览会话。`,
    });
  }

  const mediaHabits = analyzeMediaSceneHabits(activePairs);
  for (const habit of mediaHabits.slice(0, 2)) {
    traits.push({
      id: `media-${traits.length}`,
      label: '播客/音乐陪伴',
      description: habit,
    });
  }

  const quickGlanceDays = activePairs.filter((pair) => {
    const summary = buildDailySummary(pair.date, pair.events);
    return summary.quickSessionCount >= 4;
  }).length;

  if (quickGlanceDays >= Math.ceil(activePairs.length * 0.4)) {
    traits.push({
      id: 'quick-glance-heavy',
      label: '快速查看偏多',
      description: `${quickGlanceDays}/${activePairs.length} 天出现 4 次以上不足 1 分钟的快速查看。`,
    });
  }

  const allEvents = activePairs.flatMap((pair) => pair.events);
  const topTrigger = analyzePathTriggers(allEvents)[0];
  if (topTrigger && topTrigger.count >= 3) {
    traits.push({
      id: 'top-trigger',
      label: '高频跳转习惯',
      description: `「${topTrigger.fromLabel} → ${topTrigger.toLabel}」累计出现 ${topTrigger.count} 次，是较稳定的跳转模式。`,
    });
  }

  const topPattern = analyzeBehaviorPatterns(activePairs)[0];
  if (topPattern && topPattern.occurrenceDays >= 3) {
    traits.push({
      id: 'top-pattern',
      label: '重复行为路径',
      description: `「${topPattern.pathLabel}」在 ${topPattern.occurrenceDays} 天重复出现。`,
    });
  }

  const productiveDurations = activePairs
    .map((pair) => getLongestProductiveSessionMinutes(pair.events))
    .filter((minutes) => minutes > 0);

  if (productiveDurations.length >= 3) {
    const min = Math.min(...productiveDurations);
    const max = Math.max(...productiveDurations);
    traits.push({
      id: 'productive-duration',
      label: '高效事务时长',
      description: `完成任务型会话通常可持续 ${min}~${max} 分钟。`,
    });
  }

  const passiveMediaDays = activePairs.filter(
    (pair) => buildDailySummary(pair.date, pair.events).passiveMediaMs >= 30 * 60_000,
  ).length;

  if (passiveMediaDays >= Math.ceil(activePairs.length * 0.3)) {
    traits.push({
      id: 'passive-media',
      label: '后台音频陪伴常见',
      description: `${passiveMediaDays}/${activePairs.length} 天后台播放超过 30 分钟。`,
    });
  }

  if (traits.length === 0) {
    return null;
  }

  return {
    baselineDays: activePairs.length,
    traits: traits.slice(0, 8),
  };
}

export function formatBehaviorProfile(profile: BehaviorProfile): string {
  return profile.traits.map((trait) => `- ${trait.label}：${trait.description}`).join('\n');
}

/** 对比当前区间与长期画像，找出显著偏离 */
export function comparePeriodAgainstProfile(
  profile: BehaviorProfile,
  currentPairs: Array<{ date: string; events: BehaviorEvent[] }>,
): string[] {
  const activeCurrent = currentPairs.filter((pair) => pair.events.length > 0);
  if (activeCurrent.length === 0) {
    return [];
  }

  const deviations: string[] = [];
  const currentUnlockAvg = average(
    activeCurrent.map((pair) => buildDailySummary(pair.date, pair.events).unlockCount),
  );
  const currentQuickAvg = average(
    activeCurrent.map((pair) => buildDailySummary(pair.date, pair.events).quickSessionCount),
  );
  const currentMediaAvg = average(
    activeCurrent.map((pair) => buildDailySummary(pair.date, pair.events).passiveMediaMs),
  );

  const profileQuickTrait = profile.traits.find((trait) => trait.id === 'quick-glance-heavy');
  if (profileQuickTrait && currentQuickAvg < 2) {
    deviations.push('快速查看比你的长期习惯明显更少。');
  } else if (!profileQuickTrait && currentQuickAvg >= 5) {
    deviations.push('快速查看比你的长期习惯更多。');
  }

  const profileMediaTrait = profile.traits.find(
    (trait) => trait.id === 'passive-media' || trait.label.includes('播客'),
  );
  if (profileMediaTrait && currentMediaAvg < 10 * 60_000) {
    deviations.push('后台音频陪伴比你的长期习惯更少。');
  } else if (!profileMediaTrait && currentMediaAvg >= 45 * 60_000) {
    deviations.push(`后台播放日均约 ${formatDuration(currentMediaAvg)}，高于你的长期习惯。`);
  }

  const profileWeekdayTrait = profile.traits.find((trait) => trait.id === 'weekday-heavier');
  const currentWeekday = activeCurrent.filter((pair) => !isWeekend(pair.date));
  const currentWeekend = activeCurrent.filter((pair) => isWeekend(pair.date));
  if (
    profileWeekdayTrait &&
    currentWeekday.length > 0 &&
    currentWeekend.length > 0 &&
    average(currentWeekend.map((p) => buildDailySummary(p.date, p.events).unlockCount)) >
      average(currentWeekday.map((p) => buildDailySummary(p.date, p.events).unlockCount)) * 1.2
  ) {
    deviations.push('这段时间更像周末节奏，解锁次数的工作日/周末差异比你的长期习惯更弱。');
  }

  if (deviations.length === 0 && currentUnlockAvg > 0) {
    const hasEveningTrait = profile.traits.some((trait) => trait.id === 'evening-entertainment');
    const currentEveningDays = activeCurrent.filter((pair) => {
      const sessions = buildSessions(pair.events);
      return sessions.some((session) => new Date(session.startTime).getHours() >= 18);
    }).length;

    if (hasEveningTrait && currentEveningDays === 0) {
      deviations.push('这段时间几乎没有晚间使用，与你常见的「晚上娱乐更集中」不同。');
    }
  }

  return deviations.slice(0, 3);
}

export function formatProfileDeviations(deviations: string[]): string {
  if (deviations.length === 0) {
    return '与长期画像基本一致';
  }
  return deviations.map((item) => `- ${item}`).join('\n');
}
