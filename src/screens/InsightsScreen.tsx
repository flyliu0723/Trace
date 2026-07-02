import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { buildDayInsights, type DayInsights } from '../analysis/insightEngine';
import { buildWanderingDayView } from '../analysis/wanderingViewBuilder';
import { AiInsightsPanel } from '../components/AiInsightsPanel';
import { DateNavigator } from '../components/DateNavigator';
import { InsightCard } from '../components/InsightCard';
import { PathTriggerRow } from '../components/PathTriggerRow';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { SessionGoalCard } from '../components/SessionGoalCard';
import { WanderingSummaryCard } from '../components/WanderingSummaryCard';
import { useSelectedDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import {
  getAiConfig,
  getCachedSummary,
  getEventsByDate,
  getEventsForDates,
  isAiConfigured,
  saveCachedSummary,
} from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { generateDailyAiSummary, generateMonthlyAiSummary, generateWeeklyAiSummary } from '../services/aiSummaryService';
import { ensureSynced } from '../services/syncCoordinator';
import type { BehaviorEvent } from '../types/event';
import { getDateStringsEndingAt, isToday, addDays } from '../utils/dateUtils';
import type { SessionGoal } from '../analysis/sessionGoalAnalyzer';
import type { RootTabParamList } from '../navigation/types';
import { radius, spacing, typography } from '../theme';

function sortGoalsByRecent(goals: SessionGoal[]): SessionGoal[] {
  return [...goals].sort((a, b) => b.startTime - a.startTime);
}

export function InsightsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const { selectedDate } = useSelectedDate();
  const [data, setData] = useState<DayInsights | null>(null);
  const [dayEvents, setDayEvents] = useState<BehaviorEvent[]>([]);
  const [yesterdayEvents, setYesterdayEvents] = useState<BehaviorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [dailyAiSummary, setDailyAiSummary] = useState<string | null>(null);
  const [weeklyAiSummary, setWeeklyAiSummary] = useState<string | null>(null);
  const [monthlyAiSummary, setMonthlyAiSummary] = useState<string | null>(null);
  const [dailyAiLoading, setDailyAiLoading] = useState(false);
  const [weeklyAiLoading, setWeeklyAiLoading] = useState(false);
  const [monthlyAiLoading, setMonthlyAiLoading] = useState(false);

  const styles = useThemedStyles(({ colors: c }) => ({
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
    sectionTitle: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    insightScroll: {
      paddingRight: spacing.md,
      paddingBottom: spacing.sm,
      marginBottom: spacing.md,
    },
    section: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    patternRow: {
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    patternPath: {
      color: c.accent,
      fontSize: 14,
      fontWeight: '600',
    },
    patternMeta: {
      color: c.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    empty: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
    dataSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
      marginTop: spacing.xs,
    },
    dataSectionLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: c.border,
    },
    dataSectionTitle: {
      ...typography.label,
      color: c.textMuted,
      fontWeight: '600',
      letterSpacing: 0.6,
    },
  }));

  const weekDates = useMemo(() => getDateStringsEndingAt(selectedDate, 7), [selectedDate]);
  const monthDates = useMemo(() => getDateStringsEndingAt(selectedDate, 30), [selectedDate]);
  const wanderingView = useMemo(
    () => buildWanderingDayView(selectedDate, dayEvents, { yesterdayEvents }),
    [dayEvents, selectedDate, yesterdayEvents],
  );
  const weekEndDate = weekDates[weekDates.length - 1] ?? selectedDate;
  const monthEndDate = monthDates[monthDates.length - 1] ?? selectedDate;

  const loadData = useCallback(async (options?: { forceSync?: boolean }) => {
    if (isToday(selectedDate)) {
      await ensureSynced({ force: options?.forceSync });
    }

    const events = await getEventsByDate(selectedDate);
    setDayEvents(events);
    const yesterday = addDays(selectedDate, -1);
    const previousDayEvents = await getEventsByDate(yesterday);
    setYesterdayEvents(previousDayEvents);
    const weekEventsMap = await getEventsForDates(weekDates);
    const weekPairs = weekDates.map((date) => ({
      date,
      events: weekEventsMap.get(date) ?? [],
    }));

    setData(buildDayInsights(selectedDate, events, weekPairs));

    const [configured, cachedDaily, cachedWeekly, cachedMonthly] = await Promise.all([
      isAiConfigured(),
      getCachedSummary(selectedDate, 'daily'),
      getCachedSummary(weekEndDate, 'weekly'),
      getCachedSummary(monthEndDate, 'monthly'),
    ]);
    setAiConfigured(configured);
    setDailyAiSummary(cachedDaily);
    setWeeklyAiSummary(cachedWeekly);
    setMonthlyAiSummary(cachedMonthly);
  }, [selectedDate, weekDates, weekEndDate, monthEndDate]);

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

  const handleGenerateDaily = async () => {
    if (!aiConfigured) {
      Alert.alert('未配置', '请前往 设置 → AI');
      return;
    }
    if (!data) {
      return;
    }

    setDailyAiLoading(true);
    try {
      const weekEventsMap = await getEventsForDates(weekDates);
      const weekPairs = weekDates.map((date) => ({
        date,
        events: weekEventsMap.get(date) ?? [],
      }));
      const events = await getEventsByDate(selectedDate);
      const config = await getAiConfig();
      const content = await generateDailyAiSummary(config, selectedDate, data, events, weekPairs);
      await saveCachedSummary(selectedDate, 'daily', content);
      setDailyAiSummary(content);
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setDailyAiLoading(false);
    }
  };

  const handleGenerateWeekly = async () => {
    if (!aiConfigured) {
      Alert.alert('未配置', '请前往 设置 → AI');
      return;
    }

    setWeeklyAiLoading(true);
    try {
      const weekEventsMap = await getEventsForDates(weekDates);
      const monthEventsMap = await getEventsForDates(monthDates);
      const weekPairs = weekDates.map((date) => ({
        date,
        events: weekEventsMap.get(date) ?? [],
      }));
      const monthPairs = monthDates.map((date) => ({
        date,
        events: monthEventsMap.get(date) ?? [],
      }));
      const config = await getAiConfig();
      const { content } = await generateWeeklyAiSummary(config, weekPairs, monthPairs);
      await saveCachedSummary(weekEndDate, 'weekly', content);
      setWeeklyAiSummary(content);
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setWeeklyAiLoading(false);
    }
  };

  const handleGenerateMonthly = async () => {
    if (!aiConfigured) {
      Alert.alert('未配置', '请前往 设置 → AI');
      return;
    }

    setMonthlyAiLoading(true);
    try {
      const monthEventsMap = await getEventsForDates(monthDates);
      const monthPairs = monthDates.map((date) => ({
        date,
        events: monthEventsMap.get(date) ?? [],
      }));
      const config = await getAiConfig();
      const { content } = await generateMonthlyAiSummary(config, monthPairs);
      await saveCachedSummary(monthEndDate, 'monthly', content);
      setMonthlyAiSummary(content);
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setMonthlyAiLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer textured={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  const productiveGoals = sortGoalsByRecent(
    data?.sessionGoals.filter((g) => g.goalType === 'productive') ?? [],
  );
  const notableGoals = sortGoalsByRecent(
    data?.sessionGoals.filter((g) => g.goalType === 'entertainment' || g.goalType === 'idle') ?? [],
  );

  return (
    <ScreenContainer style={styles.screen} textured={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>
        <ScreenHeader title="洞察" />
        <DateNavigator />

        <WanderingSummaryCard
          summary={wanderingView.summary}
          actionLabel="查看游离时间线 →"
          onActionPress={() => navigation.navigate('Timeline', { tab: 'wandering' })}
          onPeakPress={
            wanderingView.summary.peakBundleId
              ? () => navigation.navigate('Timeline', {
                  tab: 'wandering',
                  bundleId: wanderingView.summary.peakBundleId,
                })
              : undefined
          }
        />

        <AiInsightsPanel
          aiConfigured={aiConfigured}
          daily={{
            content: dailyAiSummary,
            loading: dailyAiLoading,
            onGenerate: handleGenerateDaily,
          }}
          weekly={{
            content: weeklyAiSummary,
            loading: weeklyAiLoading,
            onGenerate: handleGenerateWeekly,
          }}
          monthly={{
            content: monthlyAiSummary,
            loading: monthlyAiLoading,
            onGenerate: handleGenerateMonthly,
          }}
        />

        {data?.insights.length === 0 ? (
          <Text style={styles.empty}>暂无数据</Text>
        ) : (
          <>
            <View style={styles.dataSectionHeader}>
              <View style={styles.dataSectionLine} />
              <Text style={styles.dataSectionTitle}>数据详情</Text>
              <View style={styles.dataSectionLine} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightScroll}
              decelerationRate="fast"
              snapToInterval={296}>
              {data?.insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </ScrollView>

            {(data?.triggers.length ?? 0) > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>跳转</Text>
                {data?.triggers.map((trigger) => (
                  <PathTriggerRow
                    key={`${trigger.fromPackage}-${trigger.toPackage}`}
                    trigger={trigger}
                  />
                ))}
              </View>
            ) : null}

            {(data?.patterns.length ?? 0) > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>重复路径</Text>
                {data?.patterns.map((pattern) => (
                  <View key={pattern.pathLabel} style={styles.patternRow}>
                    <Text style={styles.patternPath}>{pattern.pathLabel}</Text>
                    <Text style={styles.patternMeta}>
                      {pattern.occurrenceDays} 天 · {pattern.totalCount} 次
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {productiveGoals.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>高效</Text>
                {productiveGoals.slice(0, 5).map((goal) => (
                  <SessionGoalCard key={goal.sessionId} goal={goal} />
                ))}
              </View>
            ) : null}

            {notableGoals.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>留意</Text>
                {notableGoals.slice(0, 5).map((goal) => (
                  <SessionGoalCard key={goal.sessionId} goal={goal} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
