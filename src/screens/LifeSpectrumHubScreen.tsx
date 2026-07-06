import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { analyzeContextMedia } from '../analysis/contextMediaAnalyzer';
import { buildEntertainmentReport } from '../analysis/entertainmentReportAnalyzer';
import {
  buildDailyLifeSpectrum,
  buildHubDimensions,
  findSpectrumTile,
  isDetailedDimension,
  type DailyLifeSpectrum,
  type LifeSpectrumDimension,
} from '../analysis/lifeSpectrumAnalyzer';
import { buildReadingReport } from '../analysis/readingReportAnalyzer';
import { buildShoppingReport } from '../analysis/shoppingReportAnalyzer';
import { BasicDimensionPanel } from '../components/BasicDimensionPanel';
import { DateNavigator } from '../components/DateNavigator';
import { LifeSpectrumDimensionPicker } from '../components/LifeSpectrumDimensionPicker';
import { LifeSpectrumOverviewPanel } from '../components/LifeSpectrumOverviewPanel';
import { ScreenContainer } from '../components/ScreenContainer';
import { useSelectedDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import { getEventsByDate, getEventsForDates } from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { RootStackParamList } from '../navigation/types';
import { ensureSynced } from '../services/syncCoordinator';
import { spacing } from '../theme';
import {
  addDays,
  getMondayOfWeek,
  getRecentDateStrings,
  getWeekDatesMondayToSunday,
  isToday,
} from '../utils/dateUtils';
import { EntertainmentReportScreen } from './EntertainmentReportScreen';
import { PodcastReportScreen } from './PodcastReportScreen';
import { ReadingReportScreen } from './ReadingReportScreen';
import { ShoppingReportScreen } from './ShoppingReportScreen';

type HubRoute = RouteProp<RootStackParamList, 'LifeSpectrumHub'>;

function resolveInitialDimension(
  param?: LifeSpectrumDimension,
): LifeSpectrumDimension {
  return param ?? 'all';
}

function mergeHubDimensions(
  spectrum: DailyLifeSpectrum,
  activeDimension: LifeSpectrumDimension,
): LifeSpectrumDimension[] {
  const base = buildHubDimensions(spectrum);
  if (
    activeDimension !== 'all' &&
    !base.includes(activeDimension)
  ) {
    return ['all', activeDimension, ...base.slice(1)];
  }
  return base;
}

function DimensionPanel({ dimension }: { dimension: LifeSpectrumDimension }) {
  if (dimension === 'all') {
    return null;
  }
  if (dimension === 'media') {
    return <PodcastReportScreen embedded />;
  }
  if (dimension === 'entertainment') {
    return <EntertainmentReportScreen embedded />;
  }
  if (dimension === 'reading') {
    return <ReadingReportScreen embedded />;
  }
  if (dimension === 'shopping') {
    return <ShoppingReportScreen embedded />;
  }
  return null;
}

export function LifeSpectrumHubScreen() {
  const { colors } = useTheme();
  const route = useRoute<HubRoute>();
  const { selectedDate, dataRevision } = useSelectedDate();
  const initialDimension = resolveInitialDimension(route.params?.dimension);

  const [activeDimension, setActiveDimension] = useState<LifeSpectrumDimension>(initialDimension);
  const [spectrum, setSpectrum] = useState<DailyLifeSpectrum | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setActiveDimension(initialDimension);
  }, [initialDimension, selectedDate]);

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
  }));

  const loadData = useCallback(async (options?: { forceSync?: boolean }) => {
    if (isToday(selectedDate)) {
      await ensureSynced({ force: options?.forceSync });
    }

    const events = await getEventsByDate(selectedDate);
    const contextMedia = analyzeContextMedia(events);

    const weekMonday = getMondayOfWeek(selectedDate);
    const prevWeekMonday = addDays(weekMonday, -7);
    const weekDates = getWeekDatesMondayToSunday(weekMonday);
    const prevWeekDates = getWeekDatesMondayToSunday(prevWeekMonday);
    const entertainmentDates = [...prevWeekDates, ...weekDates];
    const monthDates = getRecentDateStrings(35);
    const fetchDates = [...new Set([...monthDates, ...entertainmentDates, selectedDate])];
    const monthEventsMap = await getEventsForDates(fetchDates);
    const weekPairs = entertainmentDates.map((date) => ({
      date,
      events: monthEventsMap.get(date) ?? [],
    }));

    const entertainment = buildEntertainmentReport(selectedDate, events, weekPairs);
    const reading = buildReadingReport(selectedDate, events, weekPairs);
    const shopping = buildShoppingReport(selectedDate, events, weekPairs);

    setSpectrum(
      buildDailyLifeSpectrum(selectedDate, events, {
        contextMedia,
        entertainment,
        reading,
        shopping,
      }),
    );
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

  const dimensions = useMemo(
    () => mergeHubDimensions(spectrum ?? { date: selectedDate, tiles: [], totalTrackedMs: 0 }, activeDimension),
    [spectrum, activeDimension, selectedDate],
  );

  const activeTile = useMemo(() => {
    if (!spectrum || activeDimension === 'all' || isDetailedDimension(activeDimension)) {
      return undefined;
    }
    return findSpectrumTile(spectrum, activeDimension);
  }, [spectrum, activeDimension]);

  if (loading) {
    return (
      <ScreenContainer style={styles.screen} textured={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  const currentSpectrum = spectrum ?? { date: selectedDate, tiles: [], totalTrackedMs: 0 };

  return (
    <ScreenContainer style={styles.screen} textured={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>
        <DateNavigator />

        <LifeSpectrumDimensionPicker
          dimensions={dimensions}
          activeDimension={activeDimension}
          onSelect={setActiveDimension}
        />

        {activeDimension === 'all' ? (
          <LifeSpectrumOverviewPanel
            spectrum={currentSpectrum}
            onDimensionPress={setActiveDimension}
          />
        ) : isDetailedDimension(activeDimension) ? (
          <DimensionPanel dimension={activeDimension} />
        ) : activeTile ? (
          <BasicDimensionPanel tile={activeTile} />
        ) : (
          <View style={styles.center}>
            <Text style={{ color: colors.textMuted }}>该维度今天暂无数据</Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
