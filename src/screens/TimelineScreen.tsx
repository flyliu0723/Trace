import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RouteProp } from '@react-navigation/native';
import { buildHourlyTopApps } from '../analysis/hourlyAnalyzer';
import { buildHourlySwitchCounts } from '../analysis/hourlyWanderingAnalyzer';
import { classifyApp, getCategoryColor } from '../analysis/appClassifier';
import { buildDiarySessions, type DiarySessionEntry } from '../analysis/diarySessionBuilder';
import {
  buildWanderingDayView,
  findBundleIdBySessionId,
  findBundleIndexById,
  type WanderingTimelineItem,
} from '../analysis/wanderingViewBuilder';
import { FlowGapDivider, formatFlowGapLabel } from '../components/FlowGapDivider';
import { AppIconBadge } from '../components/HourlyAppRow';
import { DateNavigator } from '../components/DateNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { SessionDiaryCard } from '../components/SessionDiaryCard';
import { WanderingBundleBar } from '../components/WanderingBundleBar';
import { WanderingSummaryCard } from '../components/WanderingSummaryCard';
import { DIARY_PAGE_SIZE, DIARY_SESSION_ITEM_ESTIMATED_HEIGHT, HIGH_HOURLY_SWITCH_THRESHOLD } from '../constants';
import { useSelectedDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { getEventsByDate, getEventsForDates } from '../db';
import { ensureSynced } from '../services/syncCoordinator';
import type { BehaviorEvent } from '../types/event';
import {
  addDays,
  getMondayOfWeek,
  getWeekDatesMondayToSunday,
  isDateInWeek,
  isFutureDate,
  isToday,
} from '../utils/dateUtils';
import { radius, spacing, typography } from '../theme';
import type { RootTabParamList } from '../navigation/types';

type TimelineSubTab = 'hourly' | 'diary' | 'wandering';

interface PendingJump {
  date: string;
  hour: number;
}

interface PendingWanderingJump {
  sessionId?: string;
  bundleId?: string;
}

interface PendingDiaryJump {
  sessionId: string;
}

const HOUR_ROW_STARTS = [18, 12, 6, 0];

interface DailyHourlyGrid {
  date: string;
  weekdayLabel: string;
  dayLabel: string;
  slots: ReturnType<typeof buildHourlyTopApps>;
  switchCounts: number[];
}

export function TimelineScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();
  const route = useRoute<RouteProp<RootTabParamList, 'Timeline'>>();
  const { selectedDate, setSelectedDate } = useSelectedDate();
  const [activeTab, setActiveTab] = useState<TimelineSubTab>('hourly');
  const [weekAnchorDate, setWeekAnchorDate] = useState(() => getMondayOfWeek(selectedDate));
  const [events, setEvents] = useState<BehaviorEvent[]>([]);
  const [yesterdayEvents, setYesterdayEvents] = useState<BehaviorEvent[]>([]);
  const [weekGrid, setWeekGrid] = useState<DailyHourlyGrid[]>([]);
  const [pendingJump, setPendingJump] = useState<PendingJump | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());
  const [expandedBundleIds, setExpandedBundleIds] = useState<Set<string>>(new Set());
  const [pendingWanderingJump, setPendingWanderingJump] = useState<PendingWanderingJump | null>(null);
  const [pendingDiaryJump, setPendingDiaryJump] = useState<PendingDiaryJump | null>(null);
  const [diaryVisibleCount, setDiaryVisibleCount] = useState(DIARY_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<DiarySessionEntry>>(null);
  const wanderingListRef = useRef<FlatList<WanderingTimelineItem>>(null);
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const highlightFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displaySessions = useMemo(
    () => [...buildDiarySessions(events)].reverse(),
    [events],
  );
  const visibleSessions = useMemo(
    () => displaySessions.slice(0, diaryVisibleCount),
    [displaySessions, diaryVisibleCount],
  );
  const hasMoreDiary = diaryVisibleCount < displaySessions.length;
  const wanderingView = useMemo(
    () => buildWanderingDayView(selectedDate, events, { yesterdayEvents }),
    [events, selectedDate, yesterdayEvents],
  );
  const maxGridDurationMs = useMemo(
    () => Math.max(1, ...weekGrid.flatMap((day) => day.slots.map((slot) => slot.durationMs))),
    [weekGrid],
  );

  const styles = useThemedStyles(({ colors: c }) => ({
    screen: {
      paddingHorizontal: 0,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
    diaryList: {
      flex: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing.xs,
      marginBottom: spacing.md,
    },
    segmentItem: {
      flex: 1,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    segmentItemActive: {
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    segmentText: {
      ...typography.label,
      color: c.textMuted,
    },
    segmentTextActive: {
      color: c.textPrimary,
      fontWeight: '600',
    },
    weekNavigator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    weekArrowButton: {
      width: 36,
      height: 36,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surface,
    },
    weekArrowDisabled: {
      opacity: 0.3,
    },
    weekArrow: {
      color: c.textPrimary,
      fontSize: 24,
      lineHeight: 24,
    },
    weekArrowTextDisabled: {
      color: c.textMuted,
    },
    weekRange: {
      ...typography.subtitle,
      color: c.textPrimary,
      ...typography.mono,
    },
    gridCard: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      padding: spacing.md,
      gap: spacing.lg,
    },
    daySection: {
      gap: spacing.sm,
    },
    dayTitle: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
    },
    dayDate: {
      ...typography.caption,
      color: c.textMuted,
    },
    hourRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    hourMarker: {
      width: 24,
      ...typography.label,
      ...typography.mono,
      color: c.textMuted,
    },
    hourCells: {
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
    },
    hourCell: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    hourCellLongDwell: {
      borderWidth: 2,
      borderColor: c.warning,
    },
    hourCellHighSwitch: {
      borderWidth: 2,
      borderColor: c.warning,
      borderStyle: 'dashed',
    },
    switchBadge: {
      position: 'absolute',
      bottom: 3,
      left: 3,
      minWidth: 14,
      height: 14,
      borderRadius: 7,
      paddingHorizontal: 3,
      backgroundColor: c.warning,
      alignItems: 'center',
      justifyContent: 'center',
    },
    switchBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: c.background,
      lineHeight: 12,
    },
    longDwellDot: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.warning,
    },
    hourCellPressed: {
      opacity: 0.75,
    },
    timelineListHeader: {
      height: spacing.sm,
    },
    timelineFooter: {
      height: spacing.lg,
    },
    loadMoreFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    loadMoreText: {
      ...typography.caption,
      color: c.textMuted,
    },
    empty: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
    emptyState: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xl,
    },
    emptyLink: {
      ...typography.label,
      color: c.accent,
    },
    eventFocus: {
      ...StyleSheet.absoluteFill,
      backgroundColor: c.accentSoft,
      borderRadius: radius.sm,
    },
    eventRow: {
      position: 'relative',
      backgroundColor: c.surface,
      paddingHorizontal: spacing.lg,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: c.borderLight,
    },
    eventRowTop: {
      borderTopWidth: 1,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      paddingTop: spacing.lg,
    },
    eventRowBottom: {
      borderBottomWidth: 1,
      borderBottomLeftRadius: radius.lg,
      borderBottomRightRadius: radius.lg,
      paddingBottom: spacing.lg,
    },
  }));

  useEffect(() => {
    if (!isDateInWeek(selectedDate, weekAnchorDate)) {
      setWeekAnchorDate(getMondayOfWeek(selectedDate));
    }
  }, [selectedDate, weekAnchorDate]);

  useEffect(() => {
    setDiaryVisibleCount(DIARY_PAGE_SIZE);
    setHighlightedIndex(null);
    setExpandedSessionIds(new Set());
    setExpandedBundleIds(new Set());
    setPendingJump(null);
    setPendingWanderingJump(null);
    setPendingDiaryJump(null);
  }, [selectedDate, events]);

  useFocusEffect(
    useCallback(() => {
      const params = route.params;
      if (!params?.tab) {
        return;
      }

      setActiveTab(params.tab);

      if (params.sessionId) {
        if (params.tab === 'wandering') {
          setPendingWanderingJump({ sessionId: params.sessionId });
        } else if (params.tab === 'diary') {
          setPendingDiaryJump({ sessionId: params.sessionId });
          setExpandedSessionIds((prev) => new Set(prev).add(params.sessionId as string));
        }
      } else if (params.bundleId && params.tab === 'wandering') {
        setPendingWanderingJump({ bundleId: params.bundleId });
      }

      navigation.setParams({ tab: undefined, sessionId: undefined, bundleId: undefined });
    }, [navigation, route.params]),
  );

  const weekDates = useMemo(
    () => getWeekDatesMondayToSunday(weekAnchorDate),
    [weekAnchorDate],
  );

  const weekRangeLabel = `${formatMonthDay(weekDates[0] ?? weekAnchorDate)} — ${formatMonthDay(
    weekDates[weekDates.length - 1] ?? weekAnchorDate,
  )}`;
  const canGoNextWeek = !isFutureDate(addDays(weekAnchorDate, 7));

  const loadData = useCallback(async (options?: { forceSync?: boolean }) => {
    const weekIncludesToday = weekDates.some((date) => isToday(date));
    if (isToday(selectedDate) || weekIncludesToday) {
      await ensureSynced({ force: options?.forceSync });
    }

    const [dayEvents, weekEventMap, previousDayEvents] = await Promise.all([
      getEventsByDate(selectedDate),
      getEventsForDates(weekDates),
      getEventsByDate(addDays(selectedDate, -1)),
    ]);
    setEvents(dayEvents);
    setYesterdayEvents(previousDayEvents);

    const gridData = weekDates.map((date) => {
      const dayEvents = weekEventMap.get(date) ?? [];
      const dayDate = new Date(`${date}T12:00:00`);
      const dayLabel = `${dayDate.getMonth() + 1}月${dayDate.getDate()}日`;
      const weekLabel = formatWeekday(dayDate);
      return {
        date,
        weekdayLabel: weekLabel,
        dayLabel,
        slots: buildHourlyTopApps(dayEvents),
        switchCounts: buildHourlySwitchCounts(dayEvents),
      };
    });
    setWeekGrid(gridData);
  }, [selectedDate, weekDates]);

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

  const loadMoreDiary = useCallback(() => {
    if (!hasMoreDiary) {
      return;
    }
    setDiaryVisibleCount((count) =>
      Math.min(count + DIARY_PAGE_SIZE, displaySessions.length),
    );
  }, [displaySessions.length, hasMoreDiary]);

  const jumpToDiaryHour = useCallback(
    (date: string, hour: number) => {
      setPendingJump({ date, hour });
      setHighlightedIndex(null);
      setActiveTab('diary');
      setSelectedDate(date);
    },
    [setSelectedDate],
  );

  const jumpToWanderingSession = useCallback((sessionId: string) => {
    setPendingWanderingJump({ sessionId });
    setActiveTab('wandering');
  }, []);

  const jumpToDiarySession = useCallback((sessionId: string) => {
    setPendingDiaryJump({ sessionId });
    setActiveTab('diary');
    setExpandedSessionIds((prev) => new Set(prev).add(sessionId));
  }, []);

  const toggleBundleExpanded = useCallback((bundleId: string) => {
    setExpandedBundleIds((prev) => {
      const next = new Set(prev);
      if (next.has(bundleId)) {
        next.delete(bundleId);
      } else {
        next.add(bundleId);
      }
      return next;
    });
  }, []);

  const scrollToDiaryIndex = useCallback((targetIndex: number) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: true,
        viewOffset: 120,
      });
    });
  }, []);

  useEffect(() => {
    if (!pendingJump || activeTab !== 'diary') {
      return;
    }
    if (selectedDate !== pendingJump.date || displaySessions.length === 0) {
      return;
    }

    const targetIndex = findNearestSessionIndexByHour(displaySessions, pendingJump.hour);
    if (targetIndex < 0) {
      setPendingJump(null);
      return;
    }

    if (targetIndex >= diaryVisibleCount) {
      setDiaryVisibleCount(Math.min(targetIndex + DIARY_PAGE_SIZE, displaySessions.length));
      return;
    }

    scrollToDiaryIndex(targetIndex);
    setHighlightedIndex(targetIndex);
    setPendingJump(null);
  }, [
    activeTab,
    diaryVisibleCount,
    displaySessions,
    pendingJump,
    scrollToDiaryIndex,
    selectedDate,
  ]);

  useEffect(() => {
    if (!pendingDiaryJump || activeTab !== 'diary') {
      return;
    }
    if (displaySessions.length === 0) {
      return;
    }

    const targetIndex = displaySessions.findIndex(
      (entry) => entry.session.id === pendingDiaryJump.sessionId,
    );
    if (targetIndex < 0) {
      setPendingDiaryJump(null);
      return;
    }

    if (targetIndex >= diaryVisibleCount) {
      setDiaryVisibleCount(Math.min(targetIndex + DIARY_PAGE_SIZE, displaySessions.length));
      return;
    }

    scrollToDiaryIndex(targetIndex);
    setHighlightedIndex(targetIndex);
    setPendingDiaryJump(null);
  }, [
    activeTab,
    diaryVisibleCount,
    displaySessions,
    pendingDiaryJump,
    scrollToDiaryIndex,
  ]);

  useEffect(() => {
    if (!pendingWanderingJump || activeTab !== 'wandering') {
      return;
    }

    let bundleId = pendingWanderingJump.bundleId ?? null;
    if (!bundleId && pendingWanderingJump.sessionId) {
      bundleId = findBundleIdBySessionId(wanderingView, pendingWanderingJump.sessionId);
    }

    if (!bundleId) {
      setPendingWanderingJump(null);
      return;
    }

    setExpandedBundleIds((prev) => new Set(prev).add(bundleId as string));

    const targetIndex = findBundleIndexById(wanderingView, bundleId);
    if (targetIndex >= 0) {
      requestAnimationFrame(() => {
        wanderingListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: true,
          viewOffset: 120,
        });
      });
    }

    setPendingWanderingJump(null);
  }, [activeTab, pendingWanderingJump, wanderingView]);

  useEffect(() => {
    if (highlightedIndex === null) {
      highlightOpacity.setValue(0);
      return;
    }

    highlightOpacity.setValue(1);

    if (highlightFadeTimerRef.current) {
      clearTimeout(highlightFadeTimerRef.current);
    }

    highlightFadeTimerRef.current = setTimeout(() => {
      Animated.timing(highlightOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setHighlightedIndex(null);
        }
      });
      highlightFadeTimerRef.current = null;
    }, 800);

    return () => {
      if (highlightFadeTimerRef.current) {
        clearTimeout(highlightFadeTimerRef.current);
        highlightFadeTimerRef.current = null;
      }
      highlightOpacity.stopAnimation();
    };
  }, [highlightOpacity, highlightedIndex]);

  const toggleSessionExpanded = useCallback((sessionId: string) => {
    setExpandedSessionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const renderDiaryItem = useCallback(
    ({ item, index }: { item: DiarySessionEntry; index: number }) => (
      <View
        style={[
          styles.eventRow,
          index === 0 && styles.eventRowTop,
          index === displaySessions.length - 1 && !hasMoreDiary && styles.eventRowBottom,
        ]}>
        {index === highlightedIndex ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.eventFocus, { opacity: highlightOpacity }]}
          />
        ) : null}
        <SessionDiaryCard
          entry={item}
          expanded={expandedSessionIds.has(item.session.id)}
          onToggle={() => toggleSessionExpanded(item.session.id)}
          onWanderingPress={
            item.mood.mood === 'wandering'
              ? () => jumpToWanderingSession(item.session.id)
              : undefined
          }
          isLast={index === displaySessions.length - 1 && !hasMoreDiary}
        />
      </View>
    ),
    [
      displaySessions.length,
      expandedSessionIds,
      hasMoreDiary,
      highlightedIndex,
      highlightOpacity,
      jumpToWanderingSession,
      styles,
      toggleSessionExpanded,
    ],
  );

  const wanderingKeyExtractor = useCallback(
    (item: WanderingTimelineItem) => item.id,
    [],
  );

  const renderWanderingItem = useCallback(
    ({ item }: { item: WanderingTimelineItem }) => {
      if (item.type === 'flow_gap') {
        return (
          <FlowGapDivider
            label={formatFlowGapLabel(item.startTime, item.endTime, item.label)}
          />
        );
      }

      return (
        <WanderingBundleBar
          bundle={item.bundle}
          expanded={expandedBundleIds.has(item.id)}
          onToggle={() => toggleBundleExpanded(item.id)}
          onViewDiary={jumpToDiarySession}
        />
      );
    },
    [expandedBundleIds, jumpToDiarySession, toggleBundleExpanded],
  );

  const diaryKeyExtractor = useCallback((entry: DiarySessionEntry) => entry.session.id, []);

  const renderTabHeader = () => (
    <>
      <ScreenHeader title="时间线" />
      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentItem, activeTab === 'hourly' && styles.segmentItemActive]}
          onPress={() => setActiveTab('hourly')}>
          <Text style={[styles.segmentText, activeTab === 'hourly' && styles.segmentTextActive]}>
            小时
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentItem, activeTab === 'diary' && styles.segmentItemActive]}
          onPress={() => setActiveTab('diary')}>
          <Text style={[styles.segmentText, activeTab === 'diary' && styles.segmentTextActive]}>
            日记
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentItem, activeTab === 'wandering' && styles.segmentItemActive]}
          onPress={() => setActiveTab('wandering')}>
          <Text style={[styles.segmentText, activeTab === 'wandering' && styles.segmentTextActive]}>
            游离
          </Text>
        </Pressable>
      </View>
    </>
  );

  if (loading) {
    return (
      <ScreenContainer textured={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (activeTab === 'diary') {
    return (
      <ScreenContainer style={styles.screen} textured={false}>
        <FlatList
          ref={flatListRef}
          data={visibleSessions}
          keyExtractor={diaryKeyExtractor}
          renderItem={renderDiaryItem}
          initialNumToRender={20}
          maxToRenderPerBatch={15}
          windowSize={8}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              {renderTabHeader()}
              <DateNavigator />
              {displaySessions.length === 0 ? (
                <Text style={styles.empty}>暂无记录</Text>
              ) : (
                <View style={styles.timelineListHeader} />
              )}
            </>
          }
          ListFooterComponent={
            hasMoreDiary ? (
              <View style={styles.loadMoreFooter}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.loadMoreText}>加载更早记录…</Text>
              </View>
            ) : (
              <View style={styles.timelineFooter} />
            )
          }
          onEndReached={loadMoreDiary}
          onEndReachedThreshold={0.4}
          onScrollToIndexFailed={(info) => {
            flatListRef.current?.scrollToOffset({
              offset: DIARY_SESSION_ITEM_ESTIMATED_HEIGHT * info.index,
              animated: true,
            });
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          style={styles.diaryList}
        />
      </ScreenContainer>
    );
  }

  if (activeTab === 'wandering') {
    return (
      <ScreenContainer style={styles.screen} textured={false}>
        <FlatList
          ref={wanderingListRef}
          data={wanderingView.timeline}
          keyExtractor={wanderingKeyExtractor}
          renderItem={renderWanderingItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <>
              {renderTabHeader()}
              <DateNavigator />
              {wanderingView.summary.episodeCount > 0 ? (
                <WanderingSummaryCard
                  summary={wanderingView.summary}
                  onPeakPress={
                    wanderingView.summary.peakBundleId
                      ? () => setPendingWanderingJump({
                          bundleId: wanderingView.summary.peakBundleId,
                        })
                      : undefined
                  }
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.empty}>今天没有检测到明显的游离刷屏</Text>
                  <Pressable onPress={() => setActiveTab('diary')} hitSlop={8}>
                    <Text style={styles.emptyLink}>查看完整日记 →</Text>
                  </Pressable>
                </View>
              )}
            </>
          }
          ListFooterComponent={<View style={styles.timelineFooter} />}
          onScrollToIndexFailed={(info) => {
            wanderingListRef.current?.scrollToOffset({
              offset: 180 * info.index,
              animated: true,
            });
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }
          style={styles.diaryList}
        />
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
        {renderTabHeader()}

        <View style={styles.weekNavigator}>
          <Pressable
            style={styles.weekArrowButton}
            onPress={() => setWeekAnchorDate(addDays(weekAnchorDate, -7))}>
            <Text style={styles.weekArrow}>‹</Text>
          </Pressable>
          <Text style={styles.weekRange}>{weekRangeLabel}</Text>
          <Pressable
            style={[styles.weekArrowButton, !canGoNextWeek && styles.weekArrowDisabled]}
            disabled={!canGoNextWeek}
            onPress={() => setWeekAnchorDate(addDays(weekAnchorDate, 7))}>
            <Text style={[styles.weekArrow, !canGoNextWeek && styles.weekArrowTextDisabled]}>›</Text>
          </Pressable>
        </View>

        <View style={styles.gridCard}>
          {weekGrid.map((day) => (
            <View key={day.date} style={styles.daySection}>
              <Text style={styles.dayTitle}>
                {day.weekdayLabel} <Text style={styles.dayDate}>{day.dayLabel}</Text>
              </Text>
              {HOUR_ROW_STARTS.map((startHour) => (
                <View key={startHour} style={styles.hourRow}>
                  <Text style={styles.hourMarker}>{String(startHour).padStart(2, '0')}</Text>
                  <View style={styles.hourCells}>
                    {[...day.slots.slice(startHour, startHour + 6)].reverse().map((slot) => {
                      const displayLabel = slot.appLabel ?? slot.longDwells[0]?.appLabel;
                      const displayPackage = slot.packageName ?? slot.longDwells[0]?.packageName;
                      const switchCount = day.switchCounts[slot.hour] ?? 0;
                      const isHighSwitch = switchCount >= HIGH_HOURLY_SWITCH_THRESHOLD;
                      const hasLongDwell = slot.longDwells.length > 0;
                      const categoryColor = displayLabel
                        ? getCategoryColor(classifyApp(displayPackage, displayLabel))
                        : undefined;
                      const intensity = slot.durationMs / maxGridDurationMs;
                      const alpha = Math.round(16 + intensity * 56)
                        .toString(16)
                        .padStart(2, '0');

                      return (
                        <Pressable
                          key={`${day.date}-${slot.hour}`}
                          style={({ pressed }) => [
                            styles.hourCell,
                            hasLongDwell && styles.hourCellLongDwell,
                            isHighSwitch && !hasLongDwell && styles.hourCellHighSwitch,
                            categoryColor && {
                              borderColor: hasLongDwell || isHighSwitch
                                ? colors.warning
                                : categoryColor + '55',
                              backgroundColor: isHighSwitch
                                ? colors.warning + Math.round(20 + intensity * 40).toString(16).padStart(2, '0')
                                : categoryColor + alpha,
                            },
                            pressed && styles.hourCellPressed,
                          ]}
                          onPress={() => jumpToDiaryHour(day.date, slot.hour)}
                          onLongPress={() => {
                            setSelectedDate(day.date);
                            setActiveTab('wandering');
                          }}>
                          {displayLabel ? (
                            <AppIconBadge
                              packageName={displayPackage}
                              appLabel={displayLabel}
                              size={30}
                            />
                          ) : null}
                          {hasLongDwell ? <View style={styles.longDwellDot} /> : null}
                          {isHighSwitch ? (
                            <View style={styles.switchBadge}>
                              <Text style={styles.switchBadgeText}>{switchCount}</Text>
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function formatWeekday(date: Date): string {
  const labels = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return labels[date.getDay()] ?? '';
}

function formatMonthDay(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function findNearestSessionIndexByHour(sessions: DiarySessionEntry[], hour: number): number {
  if (sessions.length === 0) {
    return -1;
  }

  let bestIndex = 0;
  let bestDistance = Number.MAX_SAFE_INTEGER;

  for (let i = 0; i < sessions.length; i += 1) {
    const sessionHour = new Date(sessions[i].session.startTime).getHours();
    const distance = Math.abs(sessionHour - hour);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}
