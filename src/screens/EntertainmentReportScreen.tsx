import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  buildEntertainmentPeriodReport,
  buildEntertainmentReport,
  type EntertainmentReport,
} from '../analysis/entertainmentReportAnalyzer';
import type { PathTrigger } from '../analysis/pathAnalyzer';
import { formatDuration, formatTime } from '../analysis/sessionAnalyzer';
import { AppIconBadge } from '../components/HourlyAppRow';
import { DateNavigator } from '../components/DateNavigator';
import { DimensionHeroCard } from '../components/DimensionHeroCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { TopicAiPanel } from '../components/TopicAiPanel';
import { useSelectedDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import {
  getAiConfig,
  getCachedSummary,
  getEventsForDates,
  isAiConfigured,
  saveCachedSummary,
} from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useRootNavigation } from '../hooks/useRootNavigation';
import { generateEntertainmentMonthlyAiSummary, generateEntertainmentWeeklyAiSummary } from '../services/aiSummaryService';
import { ensureSynced } from '../services/syncCoordinator';
import { radius, spacing, tabularNums, typography } from '../theme';
import {
  addDays,
  formatDisplayDate,
  formatMonthRangeLabel,
  formatWeekRangeLabel,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getMondayOfWeek,
  getMonthDateStrings,
  getSundayOfWeek,
  getWeekDatesMondayToSunday,
  isToday,
} from '../utils/dateUtils';

function TriggerRow({ trigger }: { trigger: PathTrigger }) {
  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    arrow: {
      ...typography.label,
      color: c.textMuted,
      fontSize: 10,
    },
    meta: {
      flex: 1,
      ...typography.caption,
      color: c.textSecondary,
      textAlign: 'right',
      ...typography.mono,
    },
  }));

  return (
    <View style={styles.row}>
      <AppIconBadge packageName={trigger.fromPackage} appLabel={trigger.fromLabel} size={22} />
      <Text style={styles.arrow}>→</Text>
      <AppIconBadge packageName={trigger.toPackage} appLabel={trigger.toLabel} size={22} />
      <Text style={styles.meta}>
        {trigger.count} 次 · {trigger.percentage}%
      </Text>
    </View>
  );
}

export function EntertainmentReportScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { colors } = useTheme();
  const rootNavigation = useRootNavigation();
  const { selectedDate, dataRevision } = useSelectedDate();

  const [report, setReport] = useState<EntertainmentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [weeklyAiSummary, setWeeklyAiSummary] = useState<string | null>(null);
  const [monthlyAiSummary, setMonthlyAiSummary] = useState<string | null>(null);
  const [weeklyAiLoading, setWeeklyAiLoading] = useState(false);
  const [monthlyAiLoading, setMonthlyAiLoading] = useState(false);

  const weekMonday = useMemo(() => getMondayOfWeek(selectedDate), [selectedDate]);
  const weekSunday = useMemo(() => getSundayOfWeek(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => getWeekDatesMondayToSunday(weekMonday), [weekMonday]);
  const prevWeekMonday = useMemo(() => addDays(weekMonday, -7), [weekMonday]);
  const prevWeekDates = useMemo(
    () => getWeekDatesMondayToSunday(prevWeekMonday),
    [prevWeekMonday],
  );
  const monthDates = useMemo(() => getMonthDateStrings(selectedDate), [selectedDate]);
  const monthEnd = monthDates[monthDates.length - 1] ?? getLastDayOfMonth(selectedDate);
  const prevMonthEnd = addDays(getFirstDayOfMonth(selectedDate), -1);
  const prevMonthDates = useMemo(() => getMonthDateStrings(prevMonthEnd), [prevMonthEnd]);
  const fetchDates = useMemo(() => {
    const dates = new Set([
      selectedDate,
      ...weekDates,
      ...prevWeekDates,
      ...monthDates,
      ...prevMonthDates,
    ]);
    return [...dates];
  }, [monthDates, prevMonthDates, prevWeekDates, selectedDate, weekDates]);

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    screen: { paddingHorizontal: 0 },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      ...shadows.card,
    },
    hero: {
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
    },
    heroValue: {
      fontSize: 36,
      fontWeight: '800',
      color: c.statInk,
      letterSpacing: -1,
      ...tabularNums,
    },
    heroUnit: {
      ...typography.caption,
      color: c.textMuted,
    },
    heroMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    metaChip: {
      ...typography.label,
      color: c.textSecondary,
      backgroundColor: c.surfaceElevated,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
      ...typography.mono,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
      marginBottom: spacing.sm,
    },
    segmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    segmentBody: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    segmentTitle: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '500',
    },
    segmentMeta: {
      ...typography.label,
      color: c.textMuted,
      ...typography.mono,
    },
    segmentDuration: {
      ...typography.label,
      color: c.textSecondary,
      fontWeight: '600',
      ...typography.mono,
    },
    wanderingCard: {
      backgroundColor: c.warning + '14',
      borderColor: c.warning + '44',
    },
    wanderingStat: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 20,
      ...typography.mono,
    },
    weekRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.xs,
      height: 56,
      marginTop: spacing.sm,
    },
    weekCell: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.xs,
    },
    weekBar: {
      width: '100%',
      borderRadius: 3,
      minHeight: 4,
    },
    weekLabel: {
      fontSize: 9,
      color: c.textMuted,
      ...tabularNums,
    },
    trendText: {
      ...typography.caption,
      color: c.textSecondary,
      marginTop: spacing.sm,
    },
    emptyWrap: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      gap: spacing.sm,
    },
    emptyText: {
      ...typography.caption,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  }));

  const loadData = useCallback(async (options?: { forceSync?: boolean }) => {
    if (isToday(selectedDate)) {
      await ensureSynced({ force: options?.forceSync });
    }

    const eventsMap = await getEventsForDates(fetchDates);
    const toPairs = (dates: string[]) =>
      dates.map((date) => ({ date, events: eventsMap.get(date) ?? [] }));

    const weekPairs = toPairs([...prevWeekDates, ...weekDates]);
    const dayEvents = eventsMap.get(selectedDate) ?? [];

    setReport(buildEntertainmentReport(selectedDate, dayEvents, weekPairs));

    const [configured, cachedWeekly, cachedMonthly] = await Promise.all([
      isAiConfigured(),
      getCachedSummary(weekSunday, 'entertainment_weekly'),
      getCachedSummary(monthEnd, 'entertainment_monthly'),
    ]);
    setAiConfigured(configured);
    setWeeklyAiSummary(cachedWeekly);
    setMonthlyAiSummary(cachedMonthly);
  }, [selectedDate, fetchDates, prevWeekDates, weekDates, weekSunday, monthEnd, dataRevision]);

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

  const handleGenerateWeeklyAi = async () => {
    if (!aiConfigured) {
      Alert.alert('未配置', '请前往 设置 → AI 总结助手 配置 API Key', [
        { text: '取消', style: 'cancel' },
        { text: '去设置', onPress: () => rootNavigation.navigate('Settings') },
      ]);
      return;
    }

    setWeeklyAiLoading(true);
    try {
      const eventsMap = await getEventsForDates(fetchDates);
      const toPairs = (dates: string[]) =>
        dates.map((date) => ({ date, events: eventsMap.get(date) ?? [] }));
      const periodReport = buildEntertainmentPeriodReport(
        weekSunday,
        toPairs(weekDates),
        toPairs(prevWeekDates),
      );
      if (!periodReport.hasData) {
        Alert.alert('暂无数据', '本周暂无娱乐 App 浏览记录');
        return;
      }
      const config = await getAiConfig();
      const content = await generateEntertainmentWeeklyAiSummary(config, weekMonday, periodReport);
      await saveCachedSummary(weekSunday, 'entertainment_weekly', content);
      setWeeklyAiSummary(content);
    } catch (error) {
      Alert.alert('生成失败', String(error));
    } finally {
      setWeeklyAiLoading(false);
    }
  };

  const handleGenerateMonthlyAi = async () => {
    if (!aiConfigured) {
      Alert.alert('未配置', '请前往 设置 → AI 总结助手 配置 API Key', [
        { text: '取消', style: 'cancel' },
        { text: '去设置', onPress: () => rootNavigation.navigate('Settings') },
      ]);
      return;
    }

    setMonthlyAiLoading(true);
    try {
      const eventsMap = await getEventsForDates(fetchDates);
      const toPairs = (dates: string[]) =>
        dates.map((date) => ({ date, events: eventsMap.get(date) ?? [] }));
      const periodReport = buildEntertainmentPeriodReport(
        monthEnd,
        toPairs(monthDates),
        toPairs(prevMonthDates),
      );
      if (!periodReport.hasData) {
        Alert.alert('暂无数据', '本月暂无娱乐 App 浏览记录');
        return;
      }
      const config = await getAiConfig();
      const content = await generateEntertainmentMonthlyAiSummary(config, selectedDate, periodReport);
      await saveCachedSummary(monthEnd, 'entertainment_monthly', content);
      setMonthlyAiSummary(content);
    } catch (error) {
      Alert.alert('生成失败', String(error));
    } finally {
      setMonthlyAiLoading(false);
    }
  };

  const maxWeekMs = Math.max(...(report?.weekDays.map((day) => day.browseMs) ?? [1]), 1);

  if (loading) {
    const loader = (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
    if (embedded) {
      return loader;
    }
    return (
      <ScreenContainer style={styles.screen} textured={false}>
        {loader}
      </ScreenContainer>
    );
  }

  if (!report || (!report.hasData && report.weekTotalMs === 0)) {
    const emptyBody = (
      <View style={styles.emptyWrap}>
        <Ionicons name="phone-portrait-outline" size={40} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          {formatDisplayDate(selectedDate)} 没有检测到娱乐 App 浏览记录。{'\n'}
          抖音、小红书、B站等使用后会出现在这里。
        </Text>
      </View>
    );
    if (embedded) {
      return emptyBody;
    }
    return (
      <ScreenContainer style={styles.screen} textured={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }>
          <DateNavigator />
          {emptyBody}
        </ScrollView>
      </ScreenContainer>
    );
  }

  const reportBody = (
    <>
        {report.hasData ? (
          <DimensionHeroCard
            tone="alert"
            eyebrow="清醒旁观"
            primaryValue={formatDuration(report.totalBrowseMs)}
            primaryLabel="娱乐浏览时长"
            secondaryValue={
              report.deepBrowseCount > 0 ? String(report.deepBrowseCount) : undefined
            }
            secondaryLabel="沉迷 >30 分钟"
            insight={
              report.deepBrowseCount > 0
                ? `今天有 ${report.deepBrowseCount} 次连续浏览超过 30 分钟，另有 ${report.impulsiveOpenCount} 次不足 2 分钟的快闪打开。`
                : report.impulsiveOpenCount > 0
                  ? `今天有 ${report.impulsiveOpenCount} 次短暂打开，像是在无意识地点开娱乐 App。`
                  : '今天的娱乐使用比较克制，没有明显的长时间沉迷。'
            }
            chips={[
              `进入 ${report.totalVisitCount} 次`,
              `切换 ${report.totalSwitchCount} 次`,
              report.peakHourLabel ? `高峰 ${report.peakHourLabel}` : '',
            ].filter(Boolean)}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>当日浏览</Text>
            <View style={styles.hero}>
              <Text style={styles.heroValue}>—</Text>
              <Text style={styles.heroUnit}>当日暂无浏览</Text>
            </View>
          </View>
        )}

        {report.hasData && report.deepBrowseBlocks.length > 0 ? (
          <View style={[styles.card, styles.wanderingCard]}>
            <Text style={styles.sectionTitle}>单次沉迷</Text>
            {report.deepBrowseBlocks.map((block) => (
              <View
                key={`${block.startTime}-${block.packageName}`}
                style={[styles.segmentRow, { borderTopWidth: 0, paddingTop: spacing.xs }]}>
                <AppIconBadge
                  packageName={block.packageName}
                  appLabel={block.appLabel}
                  size={28}
                />
                <View style={styles.segmentBody}>
                  <Text style={styles.segmentTitle}>{block.appLabel}</Text>
                  <Text style={styles.segmentMeta}>
                    {formatTime(block.startTime)} 开始 · 超过 30 分钟
                  </Text>
                </View>
                <Text style={styles.segmentDuration}>{formatDuration(block.durationMs)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {report.hasData && report.longestBlock ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>最长连续浏览</Text>
            <View style={[styles.segmentRow, { borderTopWidth: 0, paddingTop: 0 }]}>
              <AppIconBadge
                packageName={report.longestBlock.packageName}
                appLabel={report.longestBlock.appLabel}
                size={32}
              />
              <View style={styles.segmentBody}>
                <Text style={styles.segmentTitle}>{report.longestBlock.appLabel}</Text>
                <Text style={styles.segmentMeta}>
                  {formatTime(report.longestBlock.startTime)} 开始
                </Text>
              </View>
              <Text style={styles.segmentDuration}>
                {formatDuration(report.longestBlock.durationMs)}
              </Text>
            </View>
          </View>
        ) : null}

        {report.hasData && report.topApps.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>各 App 使用</Text>
            {report.topApps.map((app) => (
              <View key={app.packageName} style={styles.segmentRow}>
                <AppIconBadge packageName={app.packageName} appLabel={app.appLabel} size={28} />
                <View style={styles.segmentBody}>
                  <Text style={styles.segmentTitle}>{app.appLabel}</Text>
                  <Text style={styles.segmentMeta}>进入 {app.visitCount} 次</Text>
                </View>
                <Text style={styles.segmentDuration}>{formatDuration(app.durationMs)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {report.hasData && report.wandering.sessionCount > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>游离刷屏</Text>
            <Text style={styles.wanderingStat}>
              {report.wandering.sessionCount} 段 · 合计 {formatDuration(report.wandering.totalMs)}{' '}
              · 切换 {report.wandering.totalSwitchCount} 次 · 最长一段{' '}
              {formatDuration(report.wandering.longestSessionMs)}
            </Text>
          </View>
        ) : null}

        {report.hasData && (report.lostPathTriggers.length > 0 || report.topTriggers.length > 0) ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>迷失链路</Text>
            <Text style={styles.wanderingStat}>
              从社交或上一个娱乐 App 滑进刷屏，往往比主动打开更难察觉。
            </Text>
            {(report.lostPathTriggers.length > 0 ? report.lostPathTriggers : report.topTriggers).map(
              (trigger) => (
                <TriggerRow
                  key={`${trigger.fromPackage}-${trigger.toPackage}`}
                  trigger={trigger}
                />
              ),
            )}
          </View>
        ) : null}

        {report.hasData && report.topBlocks.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>浏览片段</Text>
            {report.topBlocks.map((block) => (
              <View
                key={`${block.startTime}-${block.packageName}`}
                style={styles.segmentRow}>
                <AppIconBadge packageName={block.packageName} appLabel={block.appLabel} size={28} />
                <View style={styles.segmentBody}>
                  <Text style={styles.segmentMeta}>{formatTime(block.startTime)}</Text>
                  <Text style={styles.segmentTitle}>{block.appLabel}</Text>
                </View>
                <Text style={styles.segmentDuration}>{formatDuration(block.durationMs)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>本周（周一至周日）</Text>
          <View style={styles.weekRow}>
            {report.weekDays.map((day) => {
              const ratio = day.browseMs / maxWeekMs;
              const barHeight = Math.max(4, ratio * 44);
              const active = day.browseMs > 0;
              return (
                <View key={day.date} style={styles.weekCell}>
                  <View
                    style={[
                      styles.weekBar,
                      {
                        height: barHeight,
                        opacity: active ? 0.5 + ratio * 0.5 : 0.2,
                        backgroundColor: active ? colors.quickSession : colors.heatEmpty,
                      },
                    ]}
                  />
                  <Text style={styles.weekLabel}>
                    {formatDisplayDate(day.date).replace(/今天\s/, '').slice(-2)}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.trendText}>
            本周合计 {formatDuration(report.weekTotalMs)}，有浏览 {report.weekActiveDays} 天，日均{' '}
            {formatDuration(report.weekAvgMs)}
            {report.weekTrendPercent !== null
              ? ` · 较上周 ${report.weekTrendPercent > 0 ? '+' : ''}${report.weekTrendPercent}%`
              : ''}
          </Text>
        </View>

        <TopicAiPanel
          title="AI 刷屏解读"
          aiConfigured={aiConfigured}
          weeklyRangeLabel={formatWeekRangeLabel(weekMonday)}
          monthlyRangeLabel={formatMonthRangeLabel(selectedDate)}
          weekly={{
            content: weeklyAiSummary,
            loading: weeklyAiLoading,
            onGenerate: handleGenerateWeeklyAi,
          }}
          monthly={{
            content: monthlyAiSummary,
            loading: monthlyAiLoading,
            onGenerate: handleGenerateMonthlyAi,
          }}
        />
    </>
  );

  if (embedded) {
    return <View>{reportBody}</View>;
  }

  return (
    <ScreenContainer style={styles.screen} textured={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>
        <DateNavigator />
        {reportBody}
      </ScrollView>
    </ScreenContainer>
  );
}
