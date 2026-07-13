import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Text,
  View,
} from 'react-native';
import { buildReadingReport, type ReadingReport } from '../analysis/readingReportAnalyzer';
import { formatDuration, formatTime } from '../analysis/sessionAnalyzer';
import { AppIconBadge } from '../components/HourlyAppRow';
import { DimensionHeroCard } from '../components/DimensionHeroCard';
import { TopicReportScaffold } from '../components/TopicReportScaffold';
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

export function ReadingReportScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { colors } = useTheme();
  const { selectedDate, dataRevision } = useSelectedDate();

  const [report, setReport] = useState<ReadingReport | null>(null);
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
      backgroundColor: '#6B9E8A14',
      borderColor: '#6B9E8A44',
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

    setReport(buildReadingReport(selectedDate, dayEvents, weekPairs));
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
  const isEmpty = !report || (!report.hasData && report.weekTotalMs === 0);

  return (
    <TopicReportScaffold
      embedded={embedded}
      loading={loading}
      refreshing={refreshing}
      onRefresh={onRefresh}
      isEmpty={isEmpty}
      emptyIcon="book-outline"
      emptyMessage={`${formatDisplayDate(selectedDate)} 没有检测到阅读 App 使用记录。\n微信读书、得到等使用后会出现在这里。`}
      loadingText="正在整理阅读数据…">
      {report ? (

    <>
        {report.hasData ? (
          <DimensionHeroCard
            tone="calm"
            eyebrow="数字绿洲"
            primaryValue={formatDuration(report.totalReadingMs)}
            primaryLabel="阅读时长"
            secondaryValue={
              report.immersionCount > 0 ? String(report.immersionCount) : undefined
            }
            secondaryLabel="沉浸 ≥15 分钟"
            insight={report.insight}
            chips={[
              `进入 ${report.totalVisitCount} 次`,
              report.peakHourLabel ? `高峰 ${report.peakHourLabel}` : '',
            ].filter(Boolean)}
          />
        ) : null}

        {report.hasData && report.immersionBlocks.length > 0 ? (
          <View style={[styles.card, styles.highlightCard]}>
            <Text style={styles.sectionTitle}>沉浸式阅读</Text>
            {report.immersionBlocks.map((block) => (
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
                    {formatTime(block.startTime)} 开始 · 连续 ≥15 分钟
                  </Text>
                </View>
                <Text style={styles.segmentDuration}>{formatDuration(block.durationMs)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {report.hasData && report.longestBlock ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>最长连续阅读</Text>
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

        {report.hasData && report.topBlocks.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>阅读片段</Text>
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
                        backgroundColor: active ? '#6B9E8A' : colors.heatEmpty,
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
            本周合计 {formatDuration(report.weekTotalMs)}，有阅读 {report.weekActiveDays} 天，日均{' '}
            {formatDuration(report.weekAvgMs)}
            {report.weekTrendPercent !== null
              ? ` · 较上周 ${report.weekTrendPercent > 0 ? '+' : ''}${report.weekTrendPercent}%`
              : ''}
          </Text>
        </View>
    </>
      ) : null}
    </TopicReportScaffold>
  );
}
