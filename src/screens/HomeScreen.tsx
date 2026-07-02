import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import { buildDailySummary, formatDuration } from '../analysis/sessionAnalyzer';
import { buildContributionCells } from '../analysis/contributionAnalyzer';
import { buildDailyUnlockCounts } from '../analysis/heatmapAnalyzer';
import { ContributionHeatmap } from '../components/ContributionHeatmap';
import { DateNavigator } from '../components/DateNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatCard } from '../components/StatCard';
import { UnlockHeatmap } from '../components/UnlockHeatmap';
import { useSelectedDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import { getEventsByDate, getEventsForDates } from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { ensureSynced } from '../services/syncCoordinator';
import type { DailySummary } from '../types/event';
import { getRecentDateStrings, isToday } from '../utils/dateUtils';
import { spacing } from '../theme';

export function HomeScreen() {
  const { colors } = useTheme();
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [weekUnlockData, setWeekUnlockData] = useState<
    Array<{ date: string; count: number }>
  >([]);
  const [contributionCells, setContributionCells] = useState<
    ReturnType<typeof buildContributionCells>
  >([]);
  const [dayEvents, setDayEvents] = useState<Awaited<ReturnType<typeof getEventsByDate>>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const styles = useThemedStyles(() => ({
    screen: {
      paddingHorizontal: 0,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
  }));

  const loadData = useCallback(async (options?: { forceSync?: boolean }) => {
    if (isToday(selectedDate)) {
      await ensureSynced({ force: options?.forceSync });
    }
    const events = await getEventsByDate(selectedDate);
    setDayEvents(events);
    setSummary(buildDailySummary(selectedDate, events));

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
  }, [selectedDate]);

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
        <ScreenHeader title="轨迹" />
        <DateNavigator />

        <UnlockHeatmap events={dayEvents} weekData={weekUnlockData} />

        <ContributionHeatmap cells={contributionCells} onDayPress={setSelectedDate} />

        <View style={styles.statsGrid}>
          <StatCard
            label="解锁"
            value={String(summary?.unlockCount ?? 0)}
            accentColor={colors.unlock}
            featured
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
            label="亮屏"
            value={formatDuration(summary?.activeInteractionMs ?? 0)}
            accentColor={colors.accent}
          />
          <StatCard
            label="后台"
            value={formatDuration(summary?.passiveMediaMs ?? 0)}
            accentColor={colors.media}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
