import { open } from '@op-engineering/op-sqlite';
import type { AchievementEvidence, AchievementRuleId } from '../analysis/achievements/achievementCatalog';
import {
  ACHIEVEMENTS_TABLE,
  CREATE_ACHIEVEMENTS_INDEX,
  CREATE_ACHIEVEMENTS_TABLE,
  DB_NAME,
} from './schema';

export interface StoredAchievement {
  ruleId: AchievementRuleId;
  unlockedAt: number;
  occurrence: number;
  evidence: AchievementEvidence | null;
}

let db: ReturnType<typeof open> | null = null;

function getDb() {
  if (!db) {
    db = open({ name: DB_NAME });
    db.executeSync(CREATE_ACHIEVEMENTS_TABLE);
    db.executeSync(CREATE_ACHIEVEMENTS_INDEX);
  }
  return db;
}

function parseEvidence(raw: string | null): AchievementEvidence | null {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as AchievementEvidence;
  } catch {
    return null;
  }
}

export async function getUnlockedAchievements(): Promise<StoredAchievement[]> {
  const database = getDb();
  const result = await database.execute(
    `SELECT rule_id, unlocked_at, occurrence, evidence
     FROM ${ACHIEVEMENTS_TABLE}
     ORDER BY unlocked_at DESC, occurrence DESC`,
  );
  const rows = (result.rows ?? []) as Array<{
    rule_id: string;
    unlocked_at: number;
    occurrence: number;
    evidence: string | null;
  }>;

  return rows.map((row) => ({
    ruleId: row.rule_id as AchievementRuleId,
    unlockedAt: row.unlocked_at,
    occurrence: row.occurrence,
    evidence: parseEvidence(row.evidence),
  }));
}

export async function getLatestByRule(ruleId: AchievementRuleId): Promise<StoredAchievement | null> {
  const database = getDb();
  const result = await database.execute(
    `SELECT rule_id, unlocked_at, occurrence, evidence
     FROM ${ACHIEVEMENTS_TABLE}
     WHERE rule_id = ?
     ORDER BY occurrence DESC
     LIMIT 1`,
    [ruleId],
  );
  const row = result.rows?.[0] as
    | {
        rule_id: string;
        unlocked_at: number;
        occurrence: number;
        evidence: string | null;
      }
    | undefined;
  if (!row) {
    return null;
  }
  return {
    ruleId: row.rule_id as AchievementRuleId,
    unlockedAt: row.unlocked_at,
    occurrence: row.occurrence,
    evidence: parseEvidence(row.evidence),
  };
}

export async function getFirstByRule(ruleId: AchievementRuleId): Promise<StoredAchievement | null> {
  const database = getDb();
  const result = await database.execute(
    `SELECT rule_id, unlocked_at, occurrence, evidence
     FROM ${ACHIEVEMENTS_TABLE}
     WHERE rule_id = ?
     ORDER BY occurrence ASC
     LIMIT 1`,
    [ruleId],
  );
  const row = result.rows?.[0] as
    | {
        rule_id: string;
        unlocked_at: number;
        occurrence: number;
        evidence: string | null;
      }
    | undefined;
  if (!row) {
    return null;
  }
  return {
    ruleId: row.rule_id as AchievementRuleId,
    unlockedAt: row.unlocked_at,
    occurrence: row.occurrence,
    evidence: parseEvidence(row.evidence),
  };
}

export async function getUnlockCountByRule(ruleId: AchievementRuleId): Promise<number> {
  const database = getDb();
  const result = await database.execute(
    `SELECT COUNT(*) as cnt FROM ${ACHIEVEMENTS_TABLE} WHERE rule_id = ?`,
    [ruleId],
  );
  const row = result.rows?.[0] as { cnt: number } | undefined;
  return row?.cnt ?? 0;
}

export async function hasUnlockedRule(ruleId: AchievementRuleId): Promise<boolean> {
  const count = await getUnlockCountByRule(ruleId);
  return count > 0;
}

export async function hasUnlockedRuleOnDate(
  ruleId: AchievementRuleId,
  date: string,
): Promise<boolean> {
  const database = getDb();
  const result = await database.execute(
    `SELECT evidence FROM ${ACHIEVEMENTS_TABLE} WHERE rule_id = ?`,
    [ruleId],
  );
  const rows = (result.rows ?? []) as Array<{ evidence: string | null }>;
  return rows.some((row) => parseEvidence(row.evidence)?.date === date);
}

export async function recordUnlock(
  ruleId: AchievementRuleId,
  evidence: AchievementEvidence,
  unlockedAt = Date.now(),
): Promise<StoredAchievement> {
  const database = getDb();
  const latest = await getLatestByRule(ruleId);
  const occurrence = (latest?.occurrence ?? 0) + 1;
  await database.execute(
    `INSERT INTO ${ACHIEVEMENTS_TABLE} (rule_id, unlocked_at, occurrence, evidence)
     VALUES (?, ?, ?, ?)`,
    [ruleId, unlockedAt, occurrence, JSON.stringify(evidence)],
  );
  return {
    ruleId,
    unlockedAt,
    occurrence,
    evidence,
  };
}

/** 每个 rule 取最新一条，用于墙展示 */
export async function getLatestUnlockPerRule(): Promise<StoredAchievement[]> {
  const all = await getUnlockedAchievements();
  const latest = new Map<AchievementRuleId, StoredAchievement>();
  for (const item of all) {
    const existing = latest.get(item.ruleId);
    if (!existing || item.occurrence > existing.occurrence) {
      latest.set(item.ruleId, item);
    }
  }
  return [...latest.values()].sort((a, b) => b.unlockedAt - a.unlockedAt);
}
