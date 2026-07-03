import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { buildDailySummary, formatDuration } from '../analysis/sessionAnalyzer';
import { analyzeContextMedia } from '../analysis/contextMediaAnalyzer';
import { buildContributionCells } from '../analysis/contributionAnalyzer';
import { ContextMediaCard } from '../components/ContextMediaCard';
import { buildDailyUnlockCounts } from '../analysis/heatmapAnalyzer';
import { ContributionHeatmap } from '../components/ContributionHeatmap';
import { DateNavigator } from '../components/DateNavigator';
import { MonitorBanner } from '../components/settings/MonitorBanner';
import { SettingsGearButton } from '../components/settings/SettingsGearButton';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { HomeMetricsGrid, StatCard } from '../components/StatCard';
import { UnlockHeatmap } from '../components/UnlockHeatmap';
import { useSelectedDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import { getEventsByDate, getEventsForDates } from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useRootNavigation } from '../hooks/useRootNavigation';
import { ensureSynced } from '../services/syncCoordinator';
import { getMonitorStatus } from '../services/monitorService';
import { useMonitorBanner } from '../hooks/useMonitorBanner';
import { getMonitorHealth } from '../utils/monitorStatusUtils';
import type { DailyContextMediaReport } from '../analysis/contextMediaAnalyzer';
import type { MonitorStatus } from '../native/BehaviorMonitor';
import type { DailySummary } from '../types/event';
import { getRecentDateStrings, isToday } from '../utils/dateUtils';
import { spacing } from '../theme';

const HOME_HORIZONTAL = 20;

export function HomeScreen() {
  const { colors } = useTheme();
  const rootNavigation = useRootNavigation();
  const { selectedDate, setSelectedDate, dataRevision } = useSelectedDate();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null);
  const [weekUnlockData, setWeekUnlockData] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [contributionCells, setContributionCells] = useState<
    ReturnType<typeof buildContributionCells>
  >([]);
  const [dayEvents, setDayEvents] = useState<Awaited<ReturnType<typeof getEventsByDate>>>([]);
  const [contextMediaReport, setContextMediaReport] = useState<DailyContextMediaReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { visible: bannerVisible, message: bannerMessage, dismiss: dismissBanner } =
    useMonitorBanner(monitorStatus);

  const styles = useThemedStyles(() => ({
    screen: {
      paddingHorizontal: 0,
    },
    content: {
      paddingHorizontal: HOME_HORIZONTAL,
      paddingBottom: spacing.xxl + spacing.lg,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }));

  const loadData = useCallback(async (options?: { forceSync?: boolean }) => {
    if (isToday(selectedDate)) {
      await ensureSynced({ force: options?.forceSync });
    }
    const [events, status] = await Promise.all([
      getEventsByDate(selectedDate),
      getMonitorStatus(),
    ]);
    setMonitorStatus(status);
    setDayEvents(events);
    setSummary(buildDailySummary(selectedDate, events));
    setContextMediaReport(analyzeContextMedia(events));

    const weekDates = getRecentDateStrings(7);
    const monthDates = getRecentDateStrings(35);
    const monthEventsMap = await getEventsForDates(monthDates);
    const weekPairs = weekDates.map((date) => ({
      date,
      events: monthEventsMap.get(date) ?? [],
    }));
    const monthPairs = monthDates.map((date) => ({
      date,
      events: monthEventsMap.get(date) ?? [],
    }));
    setWeekUnlockData(buildDailyUnlockCounts(weekPairs));
    setContributionCells(buildContributionCells(monthPairs));
  }, [selectedDate, dataRevision]);

  useEffect(() => {
    setLoading(true);
    loadData()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData({ forceSync: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  if (loading) {
    return (
      <ScreenContainer textured={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen} textured={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>
        <ScreenHeader
          title="轨迹"
          trailing={<SettingsGearButton showBadge={getMonitorHealth(monitorStatus) !== 'ok'} />}
        />
        <DateNavigator />

        {bannerVisible && bannerMessage ? (
          <MonitorBanner
            message={bannerMessage}
            onPress={() => rootNavigation.navigate('Settings')}
            onDismiss={dismissBanner}
          />
        ) : null}

        <UnlockHeatmap events={dayEvents} weekData={weekUnlockData} />

        <ContributionHeatmap
          cells={contributionCells}
          onDayPress={setSelectedDate}
          variant="ghost"
        />

        <ContextMediaCard report={contextMediaReport} compact variant="ghost" />

        <HomeMetricsGrid>
          <StatCard
            label="亮屏"
            value={formatDuration(summary?.activeInteractionMs ?? 0)}
            accentColor={colors.accent}
          />
          <StatCard
            label="会话"
            value={String(summary?.sessionCount ?? 0)}
            accentColor={colors.appForeground}
          />
          <StatCard
            label="快看"
            value={String(summary?.quickSessionCount ?? 0)}
            accentColor={colors.quickSession}
          />
          <StatCard
            label="后台"
            value={formatDuration(summary?.passiveMediaMs ?? 0)}
            accentColor={colors.media}
          />
        </HomeMetricsGrid>
      </ScrollView>
    </ScreenContainer>
  );
}
