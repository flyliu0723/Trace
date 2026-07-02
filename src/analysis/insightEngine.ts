import type { BehaviorEvent } from '../types/event';
import { buildDailySummary, buildSessions, formatDuration } from './sessionAnalyzer';
import { analyzePathTriggers, formatPathTrigger } from './pathAnalyzer';
import {
  analyzeAfterWorkPattern,
  analyzeBehaviorPatterns,
  analyzeDistractionHours,
} from './patternAnalyzer';
import {
  analyzeSessionGoals,
  summarizeSessionGoals,
  type SessionGoal,
} from './sessionGoalAnalyzer';
import {
  analyzeUnhealthyBehaviors,
  buildLyingUsageInsight,
  buildWalkingUsageInsight,
  type UnhealthyBehaviorReport,
} from './unhealthyBehaviorAnalyzer';

export type InsightType = 'summary' | 'trigger' | 'pattern' | 'session' | 'time' | 'highlight' | 'context';

export interface BehaviorInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
}

export interface DayInsights {
  date: string;
  insights: BehaviorInsight[];
  triggers: ReturnType<typeof analyzePathTriggers>;
  patterns: ReturnType<typeof analyzeBehaviorPatterns>;
  sessionGoals: SessionGoal[];
  goalSummary: ReturnType<typeof summarizeSessionGoals>;
  unhealthyBehavior: UnhealthyBehaviorReport;
}

export function buildDayInsights(
  date: string,
  events: BehaviorEvent[],
  weekDateEventPairs: Array<{ date: string; events: BehaviorEvent[] }> = [],
): DayInsights {
  const summary = buildDailySummary(date, events);
  const sessions = buildSessions(events);
  const sessionGoals = analyzeSessionGoals(sessions);
  const goalSummary = summarizeSessionGoals(sessionGoals);
  const triggers = analyzePathTriggers(events).slice(0, 5);
  const patterns = analyzeBehaviorPatterns(weekDateEventPairs).slice(0, 3);
  const distractionHours = analyzeDistractionHours(events, 4);
  const afterWork = analyzeAfterWorkPattern(events);
  const unhealthyBehavior = analyzeUnhealthyBehaviors(events);

  const insights: BehaviorInsight[] = [];

  insights.push({
    id: 'daily-summary',
    type: 'summary',
    title: '今日行为摘要',
    description: `解锁 ${summary.unlockCount} 次，${summary.sessionCount} 个会话，其中 ${summary.quickSessionCount} 次快速查看。亮屏 ${formatDuration(summary.activeInteractionMs)}，后台播放 ${formatDuration(summary.passiveMediaMs)}。`,
  });

  if (goalSummary.productiveCount > 0) {
    insights.push({
      id: 'productive-sessions',
      type: 'highlight',
      title: '高效拿起手机',
      description: `今天有 ${goalSummary.productiveCount} 次拿起手机完成了明确事务，共 ${goalSummary.totalTasks} 项。`,
    });
  }

  if (goalSummary.entertainmentCount >= 3) {
    insights.push({
      id: 'entertainment-heavy',
      type: 'session',
      title: '娱乐占用偏多',
      description: `${goalSummary.entertainmentCount} 次会话主要在娱乐应用上，占总会话 ${Math.round((goalSummary.entertainmentCount / Math.max(sessions.length, 1)) * 100)}%。`,
    });
  }

  const walkingInsight = buildWalkingUsageInsight(unhealthyBehavior);
  if (walkingInsight) {
    insights.push({
      id: 'walking-usage',
      type: 'context',
      title: walkingInsight.title,
      description: walkingInsight.description,
    });
  }

  const lyingInsight = buildLyingUsageInsight(unhealthyBehavior);
  if (lyingInsight) {
    insights.push({
      id: 'lying-usage',
      type: 'context',
      title: lyingInsight.title,
      description: lyingInsight.description,
    });
  }

  for (const trigger of triggers.slice(0, 2)) {
    if (trigger.count >= 2) {
      insights.push({
        id: `trigger-${trigger.fromPackage}-${trigger.toPackage}`,
        type: 'trigger',
        title: `${trigger.fromLabel} → ${trigger.toLabel}`,
        description: formatPathTrigger(trigger),
      });
    }
  }

  for (const pattern of patterns.slice(0, 2)) {
    insights.push({
      id: `pattern-${pattern.pathLabel}`,
      type: 'pattern',
      title: '重复行为路径',
      description: `「${pattern.pathLabel}」在过去 ${pattern.occurrenceDays} 天出现过`,
    });
  }

  if (distractionHours.length > 0) {
    const top = distractionHours[0];
    insights.push({
      id: `distraction-${top.hour}`,
      type: 'time',
      title: '易分心时段',
      description: `${String(top.hour).padStart(2, '0')}:00–${String(top.hour + 1).padStart(2, '0')}:00 解锁 ${top.unlockCount} 次，是你今天最容易拿起手机的时段。`,
    });
  }

  if (afterWork && afterWork.length >= 2) {
    insights.push({
      id: 'after-work',
      type: 'pattern',
      title: '下班后第一件事',
      description: `今天下班后你先打开了：${afterWork.join(' → ')}`,
    });
  }

  const aimlessSessions = sessionGoals.filter(
    (g) => g.goalType === 'entertainment' || g.goalType === 'idle',
  );
  if (aimlessSessions.length > 0 && aimlessSessions.length <= 3) {
    for (const goal of aimlessSessions.slice(0, 2)) {
      insights.push({
        id: `session-${goal.sessionId}`,
        type: 'session',
        title: getSessionInsightTitle(goal.goalType),
        description: goal.summary,
      });
    }
  }

  return {
    date,
    insights,
    triggers,
    patterns,
    sessionGoals,
    goalSummary,
    unhealthyBehavior,
  };
}

function getSessionInsightTitle(goalType: SessionGoal['goalType']): string {
  if (goalType === 'entertainment') {
    return '无明确目标的浏览';
  }
  if (goalType === 'idle') {
    return '空会话';
  }
  return '会话观察';
}
