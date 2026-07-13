import type {
  AchievementDefinition,
  AchievementRarity,
  AchievementStoryStep,
} from './achievements/achievementCatalog';
import { getCategoryLabel } from './achievements/achievementCatalog';
import type { StoredAchievement } from '../db/achievementRepository';
import { formatDisplayDate } from '../utils/dateUtils';

const SHARE_LINE = '━━━━━━━━━━━━━━━━━━━━';
const SHARE_DIVIDER = '────────────────────';

export interface ShareAchievement {
  name: string;
  categoryLabel: string;
  blurb: string;
  icon: string;
  rarity: AchievementRarity;
  rarityLabel: string | null;
  firstDateLabel: string | null;
  unlockCountLabel: string;
  summary: string | null;
  steps: AchievementStoryStep[];
  hasStory: boolean;
}

const RARITY_LABELS: Record<AchievementRarity, string | null> = {
  common: null,
  rare: '稀有',
  epic: '史诗',
};

export function buildAchievementSharePayload(
  definition: AchievementDefinition,
  latest: StoredAchievement | null,
  first: StoredAchievement | null,
  unlockCount: number,
): ShareAchievement {
  const firstDate = first?.evidence?.date;
  const steps = latest?.evidence?.steps ?? [];
  const summary = latest?.evidence?.summary ?? null;

  return {
    name: definition.name,
    categoryLabel: getCategoryLabel(definition.category),
    blurb: definition.blurb,
    icon: definition.icon,
    rarity: definition.rarity,
    rarityLabel: RARITY_LABELS[definition.rarity],
    firstDateLabel: firstDate ? formatDisplayDate(firstDate) : null,
    unlockCountLabel: definition.onceOnly ? '仅此一次' : `${unlockCount} 次`,
    summary,
    steps,
    hasStory: steps.length > 0 || Boolean(summary),
  };
}

export function getAchievementShareTitle(payload: ShareAchievement): string {
  return `${payload.name} · SpendWhere 成就`;
}

export function formatShareAchievementText(payload: ShareAchievement): string {
  const lines: string[] = [
    SHARE_LINE,
    `🏆 ${payload.name}`,
    payload.categoryLabel,
    SHARE_LINE,
    '',
    payload.blurb,
    '',
    SHARE_DIVIDER,
  ];

  if (payload.firstDateLabel) {
    lines.push(`首次获得：${payload.firstDateLabel}`);
  }
  lines.push(`累计：${payload.unlockCountLabel}`);

  if (payload.hasStory) {
    lines.push('', SHARE_DIVIDER, '最经典一次');
    if (payload.summary) {
      lines.push(payload.summary);
    }
    for (const step of payload.steps) {
      lines.push(`· ${step.label}`);
    }
  }

  lines.push('', SHARE_DIVIDER, 'SpendWhere · 行为发现');
  return lines.join('\n');
}
