import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { buildDailySummary, formatDuration } from '../analysis/sessionAnalyzer';
import { buildDayCredibility, formatDualDurationHint } from '../analysis/usageCredibilityAnalyzer';
import { analyzeContextMedia } from '../analysis/contextMediaAnalyzer';
import { buildEntertainmentReport } from '../analysis/entertainmentReportAnalyzer';
import { buildReadingReport } from '../analysis/readingReportAnalyzer';
import { buildShoppingReport } from '../analysis/shoppingReportAnalyzer';
import { buildDailyLifeSpectrum, type DailyLifeSpectrum } from '../analysis/lifeSpectrumAnalyzer';
import { buildContributionCells } from '../analysis/contributionAnalyzer';
import { LifeSpectrumGrid } from '../components/LifeSpectrumGrid';
import { ReceiptShareButton } from '../components/ReceiptShareButton';
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
import { useHomeBanner } from '../hooks/useHomeBanner';
import { getMonitorHealth } from '../utils/monitorStatusUtils';
import { formatSyncResultMessage } from '../utils/syncFeedbackUtils';
import type { DayCredibility } from '../analysis/usageCredibilityAnalyzer';
import type { MonitorStatus } from '../native/BehaviorMonitor';
import type { DailySummary } from '../types/event';
import {
  addDays,
  getMondayOfWeek,
  getRecentDateStrings,
  getWeekDatesMondayToSunday,
  isToday,
} from '../utils/dateUtils';
import { spacing, typography } from '../theme';

const HOME_HORIZONTAL = 20;

export function HomeScreen() {
  const { colors } = useTheme();
  const rootNavigation = useRootNavigation();
  const { selectedDate, setSelectedDate, dataRevision, isSelectedToday } = useSelectedDate();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<MonitorStatus | null>(null);
  const [weekUnlockData, setWeekUnlockData] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [contributionCells, setContributionCells] = useState<
    ReturnType<typeof buildContributionCells>
  >([]);
  const [dayEvents, setDayEvents] = useState<Awaited<ReturnType<typeof getEventsByDate>>>([]);
  const [lifeSpectrum, setLifeSpectrum] = useState<DailyLifeSpectrum | null>(null);
  const [dayCredibility, setDayCredibility] = useState<DayCredibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const { visible: bannerVisible, message: bannerMessage, dismiss: dismissBanner } = useHomeBanner(
    monitorStatus,
    dayCredibility,
    isSelectedToday,
  );

  const styles = useThemedStyles(({ colors: c }) => ({
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
    dateRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    dateNavigator: {
      flex: 1,
    },
    syncFeedback: {
      fontSize: 12,
      color: c.textMuted,
      marginBottom: spacing.sm,
      marginTop: -spacing.xs,
    },
    metricLegend: {
      ...typography.caption,
      color: c.textMuted,
      lineHeight: 18,
      marginTop: spacing.sm,
    },
  }));

  const loadData = useCallback(async (options?: { forceSync?: boolean }) => {
    if (isToday(selectedDate)) {
      const syncResult = await ensureSynced({ force: options?.forceSync });
      if (options?.forceSync) {
        setSyncFeedback(formatSyncResultMessage(syncResult));
      }
    }
    const [events, status] = await Promise.all([
      getEventsByDate(selectedDate),
      getMonitorStatus(),
    ]);
    setMonitorStatus(status);
    setDayEvents(events);
    setSummary(buildDailySummary(selectedDate, events));
    const credibility = await buildDayCredibility(selectedDate, events, status.hasUsageAccess);
    setDayCredibility(credibility);
    const contextMedia = analyzeContextMedia(events);

    const weekMonday = getMondayOfWeek(selectedDate);
    const prevWeekMonday = addDays(weekMonday, -7);
    const weekDates = getWeekDatesMondayToSunday(weekMonday);
    const prevWeekDates = getWeekDatesMondayToSunday(prevWeekMonday);
    const entertainmentDates = [...prevWeekDates, ...weekDates];
    const monthDates = getRecentDateStrings(35);
    const fetchDates = [...new Set([...monthDates, ...entertainmentDates])];
    const monthEventsMap = await getEventsForDates(fetchDates);
    const weekPairs = entertainmentDates.map((date) => ({
      date,
      events: monthEventsMap.get(date) ?? [],
    }));
    const entertainment = buildEntertainmentReport(selectedDate, events, weekPairs);
    const reading = buildReadingReport(selectedDate, events, weekPairs);
    const shopping = buildShoppingReport(selectedDate, events, weekPairs);
    setLifeSpectrum(
      buildDailyLifeSpectrum(selectedDate, events, {
        contextMedia,
        entertainment,
        reading,
        shopping,
      }),
    );

    const unlockWeekDates = getRecentDateStrings(7);
    const weekUnlockPairs = unlockWeekDates.map((date) => ({
      date,
      events: monthEventsMap.get(date) ?? [],
    }));
    setWeekUnlockData(buildDailyUnlockCounts(weekUnlockPairs));

    const monthPairs = monthDates.map((date) => ({
      date,
      events: monthEventsMap.get(date) ?? [],
    }));
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
        <View style={styles.dateRow}>
          <View style={styles.dateNavigator}>
            <DateNavigator />
          </View>
          <ReceiptShareButton
            date={selectedDate}
            events={dayEvents}
            summary={summary}
          />
        </View>

        {syncFeedback ? (
          <Text style={styles.syncFeedback}>{syncFeedback}</Text>
        ) : null}

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

        <LifeSpectrumGrid
          spectrum={lifeSpectrum ?? { date: selectedDate, tiles: [], totalTrackedMs: 0 }}
          onViewAllPress={() => rootNavigation.navigate('LifeSpectrumHub', { dimension: 'all' })}
          onTilePress={(category) => {
            rootNavigation.navigate('LifeSpectrumHub', { dimension: category });
          }}
        />

        <HomeMetricsGrid>
          <StatCard
            label="亮屏"
            value={formatDuration(summary?.activeInteractionMs ?? 0)}
            hint={
              dayCredibility
                ? formatDualDurationHint({
                    collectedMs: dayCredibility.collectedMs,
                    systemMs: dayCredibility.systemMs,
                    ratio: dayCredibility.ratio,
                    level: dayCredibility.level,
                  })
                : undefined
            }
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
        <Text style={styles.metricLegend}>
          「亮屏」按 App 前台停留统计；覆盖率对比的是会话墙钟与系统用量，口径不同属正常。「后台」为播客/音乐播放时长。
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
