import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { PathTrigger } from '../analysis/pathAnalyzer';
import { buildShoppingReport, type ShoppingReport } from '../analysis/shoppingReportAnalyzer';
import { formatDuration, formatTime } from '../analysis/sessionAnalyzer';
import { AppIconBadge } from '../components/HourlyAppRow';
import { DateNavigator } from '../components/DateNavigator';
import { DimensionHeroCard } from '../components/DimensionHeroCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { useSelectedDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import { getEventsForDates } from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { ensureSynced } from '../services/syncCoordinator';
import { radius, spacing, tabularNums, typography } from '../theme';
import {
  addDays,
  formatDisplayDate,
  getMondayOfWeek,
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

export function ShoppingReportScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { colors } = useTheme();
  const { selectedDate, dataRevision } = useSelectedDate();

  const [report, setReport] = useState<ShoppingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const weekMonday = useMemo(() => getMondayOfWeek(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => getWeekDatesMondayToSunday(weekMonday), [weekMonday]);
  const prevWeekMonday = useMemo(() => addDays(weekMonday, -7), [weekMonday]);
  const prevWeekDates = useMemo(
    () => getWeekDatesMondayToSunday(prevWeekMonday),
    [prevWeekMonday],
  );
  const fetchDates = useMemo(() => {
    const dates = new Set([selectedDate, ...weekDates, ...prevWeekDates]);
    return [...dates];
  }, [prevWeekDates, selectedDate, weekDates]);

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
    highlightCard: {
      backgroundColor: c.warning + '14',
      borderColor: c.warning + '44',
    },
    hintText: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 20,
      marginBottom: spacing.sm,
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

    setReport(buildShoppingReport(selectedDate, dayEvents, weekPairs));
  }, [selectedDate, fetchDates, prevWeekDates, weekDates, dataRevision]);

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

  const maxWeekMs = Math.max(...(report?.weekDays.map((day) => day.durationMs) ?? [1]), 1);

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
        <Ionicons name="bag-outline" size={40} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          {formatDisplayDate(selectedDate)} 没有检测到购物 App 使用记录。{'\n'}
          淘宝、京东等使用后会出现在这里。
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
            tone="neutral"
            eyebrow="消费决策清醒"
            primaryValue={formatDuration(report.totalBrowseMs)}
            primaryLabel="逛店时长"
            secondaryValue={
              report.decisionSessionCount > 0
                ? String(report.decisionSessionCount)
                : undefined
            }
            secondaryLabel="决策 ≥5 分钟"
            insight={report.insight}
            chips={[
              `进入 ${report.totalVisitCount} 次`,
              `切换 ${report.compareSwitchCount} 次`,
              report.peakHourLabel ? `高峰 ${report.peakHourLabel}` : '',
            ].filter(Boolean)}
          />
        ) : null}

        {report.hasData && report.decisionBlocks.length > 0 ? (
          <View style={[styles.card, styles.highlightCard]}>
            <Text style={styles.sectionTitle}>决策停留</Text>
            {report.decisionBlocks.map((block) => (
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
                    {formatTime(block.startTime)} 开始 · 超过 5 分钟
                  </Text>
                </View>
                <Text style={styles.segmentDuration}>{formatDuration(block.durationMs)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {report.hasData && report.compareTriggers.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>跨 App 比价</Text>
            <Text style={styles.hintText}>
              在淘宝和京东之间来回切换，往往意味着你还在权衡要不要买。
            </Text>
            {report.compareTriggers.map((trigger) => (
              <TriggerRow
                key={`${trigger.fromPackage}-${trigger.toPackage}`}
                trigger={trigger}
              />
            ))}
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

        {report.hasData && report.topBlocks.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>浏览片段</Text>
            {report.topBlocks.map((block) => (
              <View key={`${block.startTime}-${block.packageName}`} style={styles.segmentRow}>
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
              const ratio = day.durationMs / maxWeekMs;
              const barHeight = Math.max(4, ratio * 44);
              const active = day.durationMs > 0;
              return (
                <View key={day.date} style={styles.weekCell}>
                  <View
                    style={[
                      styles.weekBar,
                      {
                        height: barHeight,
                        opacity: active ? 0.5 + ratio * 0.5 : 0.2,
                        backgroundColor: active ? colors.warning : colors.heatEmpty,
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
            本周合计 {formatDuration(report.weekTotalMs)}，有逛店 {report.weekActiveDays} 天，日均{' '}
            {formatDuration(report.weekAvgMs)}
            {report.weekTrendPercent !== null
              ? ` · 较上周 ${report.weekTrendPercent > 0 ? '+' : ''}${report.weekTrendPercent}%`
              : ''}
          </Text>
        </View>
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
