import type { AppCategory } from '../analysis/appClassifier';
import { getSetting, setSetting } from '../db/settingsRepository';

const OVERRIDES_KEY = 'app_category_overrides_v1';

export interface AppCategoryOverride {
  category: AppCategory;
  appLabel?: string;
}

type OverrideMap = Record<string, AppCategoryOverride>;

let cache: OverrideMap | null = null;

function normalizeMap(raw: unknown): OverrideMap {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const map: OverrideMap = {};
  for (const [packageName, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    const category = (value as AppCategoryOverride).category;
    if (typeof category !== 'string') {
      continue;
    }
    map[packageName] = {
      category: category as AppCategory,
      appLabel:
        typeof (value as AppCategoryOverride).appLabel === 'string'
          ? (value as AppCategoryOverride).appLabel
          : undefined,
    };
  }
  return map;
}

async function loadFromStorage(): Promise<OverrideMap> {
  const raw = await getSetting(OVERRIDES_KEY);
  if (!raw) {
    return {};
  }
  try {
    return normalizeMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

async function persist(map: OverrideMap): Promise<void> {
  await setSetting(OVERRIDES_KEY, JSON.stringify(map));
  cache = map;
}

export async function initAppCategoryOverrides(): Promise<void> {
  cache = await loadFromStorage();
}

export function getAppCategoryOverride(packageName?: string): AppCategory | null {
  if (!packageName || !cache) {
    return null;
  }
  return cache[packageName]?.category ?? null;
}

export function getAllAppCategoryOverrides(): OverrideMap {
  return cache ? { ...cache } : {};
}

export async function setAppCategoryOverride(
  packageName: string,
  category: AppCategory,
  appLabel?: string,
): Promise<void> {
  const map = cache ? { ...cache } : await loadFromStorage();
  map[packageName] = { category, appLabel: appLabel?.trim() || undefined };
  await persist(map);
}

export async function clearAppCategoryOverride(packageName: string): Promise<void> {
  const map = cache ? { ...cache } : await loadFromStorage();
  if (!map[packageName]) {
    return;
  }
  delete map[packageName];
  await persist(map);
}
