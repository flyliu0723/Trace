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
import { buildPodcastReport, buildPodcastPeriodReport, type PodcastReport } from '../analysis/podcastReportAnalyzer';
import {
  formatContextMediaSegmentLine,
  getContextMediaAccentKey,
  type ContextMediaBucket,
} from '../analysis/contextMediaAnalyzer';
import { formatMediaSegmentCountLabel } from '../analysis/mediaSceneAnalyzer';
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
import { generatePodcastMonthlyAiSummary, generatePodcastWeeklyAiSummary } from '../services/aiSummaryService';
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

const CONTEXT_ICONS: Record<string, string> = {
  in_vehicle: 'car-outline',
  walking: 'walk-outline',
  passive: 'headset-outline',
};

function ContextBucketRow({ bucket }: { bucket: ContextMediaBucket }) {
  const { colors } = useTheme();
  const accentKey = getContextMediaAccentKey(bucket.context);
  const accent = colors[accentKey];

  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      backgroundColor: accent + '22',
    },
    badgeText: {
      ...typography.label,
      color: accent,
      fontWeight: '600',
    },
    body: {
      flex: 1,
      gap: 2,
    },
    meta: {
      ...typography.caption,
      color: c.textSecondary,
    },
    duration: {
      ...typography.label,
      color: c.textMuted,
      ...typography.mono,
    },
  }));

  return (
    <View style={styles.row}>
      <Ionicons name={CONTEXT_ICONS[bucket.context] ?? 'headset-outline'} size={18} color={accent} />
      <View style={styles.body}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{bucket.label}</Text>
        </View>
        <Text style={styles.meta}>
          {formatMediaSegmentCountLabel(bucket.segmentCount, bucket.totalPauseCount)} · {bucket.trackCount} 集 · {bucket.apps.join('、')}
        </Text>
      </View>
      <Text style={styles.duration}>{formatDuration(bucket.totalDurationMs)}</Text>
    </View>
  );
}

export function PodcastReportScreen({ embedded = false }: { embedded?: boolean } = {}) {
  const { colors } = useTheme();
  const rootNavigation = useRootNavigation();
  const { selectedDate, dataRevision } = useSelectedDate();

  const [report, setReport] = useState<PodcastReport | null>(null);
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
      alignItems: 'flex-start',
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
      backgroundColor: c.media,
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
    aiHint: {
      ...typography.caption,
      color: c.textMuted,
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

    setReport(buildPodcastReport(selectedDate, dayEvents, weekPairs));

    const [configured, cachedWeekly, cachedMonthly] = await Promise.all([
      isAiConfigured(),
      getCachedSummary(weekSunday, 'podcast_weekly'),
      getCachedSummary(monthEnd, 'podcast_monthly'),
    ]);
    setAiConfigured(configured);
    setWeeklyAiSummary(cachedWeekly);
    setMonthlyAiSummary(cachedMonthly);
  }, [selectedDate, fetchDates, weekDates, prevWeekDates, weekSunday, monthEnd, dataRevision]);

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
      const periodReport = buildPodcastPeriodReport(
        weekSunday,
        toPairs(weekDates),
        toPairs(prevWeekDates),
      );
      if (!periodReport.hasData) {
        Alert.alert('暂无数据', '本周暂无播客/音乐收听记录');
        return;
      }
      const config = await getAiConfig();
      const content = await generatePodcastWeeklyAiSummary(config, weekMonday, periodReport);
      await saveCachedSummary(weekSunday, 'podcast_weekly', content);
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
      const periodReport = buildPodcastPeriodReport(
        monthEnd,
        toPairs(monthDates),
        toPairs(prevMonthDates),
      );
      if (!periodReport.hasData) {
        Alert.alert('暂无数据', '本月暂无播客/音乐收听记录');
        return;
      }
      const config = await getAiConfig();
      const content = await generatePodcastMonthlyAiSummary(config, selectedDate, periodReport);
      await saveCachedSummary(monthEnd, 'podcast_monthly', content);
      setMonthlyAiSummary(content);
    } catch (error) {
      Alert.alert('生成失败', String(error));
    } finally {
      setMonthlyAiLoading(false);
    }
  };

  const maxWeekMs = Math.max(...(report?.weekDays.map((day) => day.listeningMs) ?? [1]), 1);

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
        <Ionicons name="headset-outline" size={40} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          {formatDisplayDate(selectedDate)} 没有检测到播客或音乐播放记录。{'\n'}
          请确认已开启通知使用权，并使用支持 MediaSession 的播放器（如小宇宙、网易云）。
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
            tone="warm"
            eyebrow="心流与陪伴"
            primaryValue={formatDuration(report.totalListeningMs)}
            primaryLabel="总收听时长"
            secondaryValue={
              report.companion ? `${report.companion.companionRatePercent}%` : undefined
            }
            secondaryLabel="伴随率"
            insight={report.companion?.insight}
            chips={[
              formatMediaSegmentCountLabel(report.segmentCount, report.totalPauseCount),
              `${report.trackCount} 集`,
              report.peakHourLabel ? `高峰 ${report.peakHourLabel}` : '',
            ].filter(Boolean)}
          />
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>当日收听</Text>
            <View style={styles.hero}>
              <Text style={styles.heroValue}>—</Text>
              <Text style={styles.heroUnit}>当日暂无收听</Text>
            </View>
          </View>
        )}

        {report.hasData && report.companion && report.companion.contextualMs > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>陪伴画像</Text>
            <Text style={styles.trendText}>
              行进/步行伴随 {formatDuration(report.companion.contextualMs)}，后台陪伴{' '}
              {formatDuration(report.companion.passiveMs)}。这些时段里，音频更像生活配乐，而不是刻意刷手机。
            </Text>
          </View>
        ) : null}

        {report.hasData && report.contextMedia && report.contextMedia.buckets.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>收听场景</Text>
            {report.contextMedia.buckets.map((bucket) => (
              <ContextBucketRow key={bucket.context} bucket={bucket} />
            ))}
            {!report.hasActivityData ? (
              <Text style={styles.aiHint}>
                开启身体活动权限后，可区分行进、步行与纯后台陪伴收听。
              </Text>
            ) : null}
          </View>
        ) : null}

        {report.hasData && report.mediaScenes && report.mediaScenes.scenes.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>生活时段</Text>
            {report.mediaScenes.scenes.map((scene) => (
              <View key={scene.scene} style={styles.segmentRow}>
                <View style={styles.segmentBody}>
                  <Text style={styles.segmentTitle}>{scene.label}</Text>
                  <Text style={styles.segmentMeta}>{scene.apps.join('、')}</Text>
                </View>
                <Text style={styles.segmentDuration}>{formatDuration(scene.durationMs)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {report.hasData && report.topTitles.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>主要节目</Text>
            {report.topTitles.map((item) => (
              <View key={`${item.appLabel}-${item.title}`} style={styles.segmentRow}>
                <AppIconBadge appLabel={item.appLabel} size={28} />
                <View style={styles.segmentBody}>
                  <Text style={styles.segmentTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.segmentMeta}>
                    {item.appLabel} · {item.playCount} 次
                  </Text>
                </View>
                <Text style={styles.segmentDuration}>{formatDuration(item.durationMs)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {report.hasData && report.topSegments.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>播放片段</Text>
            {report.topSegments.map((segment) => (
              <View
                key={`${segment.startTime}-${segment.appLabel}-${segment.title ?? ''}`}
                style={styles.segmentRow}>
                <AppIconBadge
                  packageName={segment.packageName}
                  appLabel={segment.appLabel}
                  size={28}
                />
                <View style={styles.segmentBody}>
                  <Text style={styles.segmentMeta}>{formatTime(segment.startTime)}</Text>
                  <Text style={styles.segmentTitle} numberOfLines={2}>
                    {segment.title ?? segment.appLabel}
                  </Text>
                  <Text style={styles.segmentMeta}>
                    {formatContextMediaSegmentLine(segment).split('：')[1] ?? ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>本周（周一至周日）</Text>
          <View style={styles.weekRow}>
            {report.weekDays.map((day) => {
              const ratio = day.listeningMs / maxWeekMs;
              const barHeight = Math.max(4, ratio * 44);
              const active = day.listeningMs > 0;
              return (
                <View key={day.date} style={styles.weekCell}>
                  <View
                    style={[
                      styles.weekBar,
                      {
                        height: barHeight,
                        opacity: active ? 0.5 + ratio * 0.5 : 0.2,
                        backgroundColor: active ? colors.media : colors.heatEmpty,
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
            本周合计 {formatDuration(report.weekTotalMs)}，有收听 {report.weekActiveDays} 天，日均{' '}
            {formatDuration(report.weekAvgMs)}
            {report.weekTrendPercent !== null
              ? ` · 较上周 ${report.weekTrendPercent > 0 ? '+' : ''}${report.weekTrendPercent}%`
              : ''}
          </Text>
        </View>

        <TopicAiPanel
          title="AI 收听解读"
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
