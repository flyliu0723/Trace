export type TimelineSubTabParam = 'hourly' | 'diary' | 'wandering';

export type RootStackParamList = {
  MainTabs: undefined;
  Settings: undefined;
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
};
