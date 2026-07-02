export type TimelineSubTabParam = 'hourly' | 'diary' | 'wandering';

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
  Settings: undefined;
};
