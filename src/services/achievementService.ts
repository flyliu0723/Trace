import {
  ACHIEVEMENT_CATALOG,
  getAchievementDefinition,
  type AchievementRuleId,
} from '../analysis/achievements/achievementCatalog';
import {
  buildHistoryWindow,
  evaluateAchievementsForDay,
} from '../analysis/achievements/achievementEngine';
import {
  getEventsForDates,
  hasUnlockedRule,
  hasUnlockedRuleOnDate,
  recordUnlock,
} from '../db';
import { addDays, getTodayDateString } from '../utils/dateUtils';

export type EvaluateAchievementsResult = {
  newlyUnlocked: AchievementRuleId[];
};

let inFlight: Promise<EvaluateAchievementsResult> | null = null;

/**
 * 对昨日 + 今日求值成就。onceOnly 全局只解锁一次；可重复类同一天不重复写入。
 */
export async function maybeEvaluateAchievements(
  dates?: string[],
): Promise<EvaluateAchievementsResult> {
  if (inFlight) {
    return inFlight;
  }
  inFlight = runEvaluate(dates).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runEvaluate(dates?: string[]): Promise<EvaluateAchievementsResult> {
  const today = getTodayDateString();
  const targetDates = dates ?? [addDays(today, -1), today];
  const uniqueTargets = [...new Set(targetDates)].sort();

  const lookbackStart = addDays(uniqueTargets[0], -13);
  const fetchDates = new Set<string>();
  for (const date of uniqueTargets) {
    let cursor = lookbackStart;
    while (cursor <= date) {
      fetchDates.add(cursor);
      cursor = addDays(cursor, 1);
    }
  }

  const eventsMap = await getEventsForDates([...fetchDates]);
  const newlyUnlocked: AchievementRuleId[] = [];

  for (const date of uniqueTargets) {
    const alreadySatisfied = new Set<AchievementRuleId>();

    for (const definition of ACHIEVEMENT_CATALOG) {
      if (definition.onceOnly) {
        if (await hasUnlockedRule(definition.id)) {
          alreadySatisfied.add(definition.id);
        }
      } else if (await hasUnlockedRuleOnDate(definition.id, date)) {
        alreadySatisfied.add(definition.id);
      }
    }

    const historyPairs = buildHistoryWindow(date, eventsMap, 14);
    const candidates = evaluateAchievementsForDay({
      date,
      events: eventsMap.get(date) ?? [],
      historyPairs,
      alreadySatisfied,
    });

    for (const candidate of candidates) {
      const definition = getAchievementDefinition(candidate.ruleId);
      if (!definition) {
        continue;
      }
      if (definition.onceOnly && alreadySatisfied.has(candidate.ruleId)) {
        continue;
      }
      if (!definition.onceOnly && alreadySatisfied.has(candidate.ruleId)) {
        continue;
      }

      await recordUnlock(candidate.ruleId, candidate.evidence);
      alreadySatisfied.add(candidate.ruleId);
      newlyUnlocked.push(candidate.ruleId);
    }
  }

  return { newlyUnlocked };
}
