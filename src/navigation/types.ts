import type { LifeSpectrumDimension } from '../analysis/lifeSpectrumAnalyzer';
import type { AchievementRuleId } from '../analysis/achievements/achievementCatalog';

export type TimelineSubTabParam = 'hourly' | 'diary' | 'wandering';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
  LifeSpectrumHub: { dimension?: LifeSpectrumDimension } | undefined;
  Achievements: undefined;
  AchievementDetail: { ruleId: AchievementRuleId };
};

export type RootTabParamList = {
  Home: undefined;
  Insights: undefined;
  Timeline:
    | {
        tab?: TimelineSubTabParam;
        sessionId?: string;
        bundleId?: string;
      }
    | undefined;
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
  AiSettings: undefined;
  AppCategories: undefined;
};
