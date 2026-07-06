import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  buildDayCredibility,
  type DayCredibility,
} from '../../analysis/usageCredibilityAnalyzer';
import {
  getEventsByDate,
  getLastEventTimestamp,
  getLastSyncLog,
  getRecentSyncLogs,
  type SyncLogEntry,
} from '../../db';
import { MANUAL_RECONCILE_DAY_OPTIONS } from '../../constants';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import type { MonitorStatus } from '../../native/BehaviorMonitor';
import { ensureSynced, runManualReconcile } from '../../services/syncCoordinator';
import { getPendingEventCount, getPersistedEventCount } from '../../services/monitorService';
import { shouldShowRomKeepAliveHint } from '../../utils/monitorStatusUtils';
import { getTodayDateString } from '../../utils/dateUtils';
import {
  formatAbsoluteTime,
  formatManualReconcileMessage,
  formatRelativeTime,
  formatSyncLogLine,
  formatSyncResultMessage,
} from '../../utils/syncFeedbackUtils';
import { radius, spacing, typography } from '../../theme';

interface DataHealthCardProps {
  status: MonitorStatus;
  onSynced?: (entry: SyncLogEntry) => void;
}

interface HealthSnapshot {
  lastSync: SyncLogEntry | null;
  recentLogs: SyncLogEntry[];
  pendingCount: number;
  persistedCount: number;
  lastEventAt: number;
  credibility: DayCredibility | null;
}

export function DataHealthCard({ status, onSynced }: DataHealthCardProps) {
  const { colors } = useTheme();
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  const styles = useThemedStyles(({ colors: c }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    headerTitle: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
    },
    headerSubtitle: {
      ...typography.caption,
      color: c.textSecondary,
      marginTop: 2,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: c.accent + '14',
    },
    actionButtonSecondary: {
      backgroundColor: c.surfaceElevated,
    },
    actionButtonPressed: {
      opacity: 0.85,
    },
    actionButtonText: {
      ...typography.caption,
      color: c.accent,
      fontWeight: '600',
    },
    actionButtonTextSecondary: {
      color: c.textSecondary,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      gap: spacing.md,
    },
    rowLabel: {
      ...typography.caption,
      color: c.textSecondary,
      flex: 1,
    },
    rowValue: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '500',
      textAlign: 'right',
      flexShrink: 1,
    },
    rowValueWarn: {
      color: c.warning,
    },
    rowValueGood: {
      color: c.success,
    },
    rowValuePoor: {
      color: c.danger,
    },
    historyBlock: {
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    historyTitle: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '600',
    },
    historyLine: {
      ...typography.caption,
      color: c.textMuted,
      lineHeight: 18,
    },
    hintBox: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: c.warning + '14',
      flexDirection: 'row',
      gap: spacing.sm,
    },
    hintText: {
      ...typography.caption,
      color: c.textSecondary,
      flex: 1,
      lineHeight: 18,
    },
    feedback: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    feedbackText: {
      ...typography.caption,
      color: c.success,
    },
    center: {
      padding: spacing.lg,
      alignItems: 'center',
    },
  }));

  const loadSnapshot = useCallback(async () => {
    const today = getTodayDateString();
    const [lastSync, recentLogs, pendingCount, persistedCount, lastEventAt, todayEvents] =
      await Promise.all([
        getLastSyncLog(),
        getRecentSyncLogs(3),
        getPendingEventCount(),
        getPersistedEventCount(),
        getLastEventTimestamp(),
        getEventsByDate(today),
      ]);
    const credibility = await buildDayCredibility(today, todayEvents, status.hasUsageAccess);
    setSnapshot({
      lastSync,
      recentLogs,
      pendingCount,
      persistedCount,
      lastEventAt,
      credibility,
    });
  }, [status.hasUsageAccess]);

  React.useEffect(() => {
    loadSnapshot().catch(console.error);
  }, [loadSnapshot, status.isRunning]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await ensureSynced({ force: true });
      const message = formatSyncResultMessage(result);
      setLastFeedback(message);
      onSynced?.(result);
      await loadSnapshot();
      if (
        result.ran &&
        result.synced + result.reconciled + result.mediaReconciled + result.repaired > 0
      ) {
        Alert.alert('同步完成', message);
      }
    } catch (error) {
      Alert.alert('同步失败', String(error));
    } finally {
      setSyncing(false);
    }
  };

  const handleManualReconcile = async (lookbackDays: number) => {
    setReconciling(true);
    try {
      const result = await runManualReconcile(lookbackDays);
      const message = formatManualReconcileMessage(result.reconciled, lookbackDays);
      setLastFeedback(message);
      onSynced?.(result);
      await loadSnapshot();
      Alert.alert('对账完成', message);
    } catch (error) {
      Alert.alert('对账失败', String(error));
    } finally {
      setReconciling(false);
    }
  };

  const showManualReconcilePicker = () => {
    Alert.alert(
      '历史对账',
      '从系统 UsageStats 回溯补全遗漏事件，不会删除已有数据。',
      [
        ...MANUAL_RECONCILE_DAY_OPTIONS.map((days) => ({
          text: `近 ${days} 天`,
          onPress: () => {
            handleManualReconcile(days).catch(console.error);
          },
        })),
        { text: '取消', style: 'cancel' as const },
      ],
    );
  };

  const showRomHint = shouldShowRomKeepAliveHint(status);
  const lastSyncAt = snapshot?.lastSync?.at ?? 0;
  const credibilityStyle =
    snapshot?.credibility?.level === 'good'
      ? styles.rowValueGood
      : snapshot?.credibility?.level === 'poor'
        ? styles.rowValuePoor
        : snapshot?.credibility?.level === 'fair'
          ? styles.rowValueWarn
          : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="pulse-outline" size={20} color={colors.accent} />
          <View>
            <Text style={styles.headerTitle}>数据健康</Text>
            <Text style={styles.headerSubtitle}>
              {snapshot ? `最近同步 ${formatRelativeTime(lastSyncAt)}` : '加载中…'}
            </Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              styles.actionButtonSecondary,
              pressed && styles.actionButtonPressed,
            ]}
            onPress={showManualReconcilePicker}
            disabled={syncing || reconciling || !status.hasUsageAccess}>
            {reconciling ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                历史对账
              </Text>
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={handleSync}
            disabled={syncing || reconciling}>
            {syncing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Ionicons name="refresh" size={14} color={colors.accent} />
                <Text style={styles.actionButtonText}>立即同步</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {!snapshot ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>今日可信度</Text>
            <Text style={[styles.rowValue, credibilityStyle]}>
              {snapshot.credibility?.summary ?? '—'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>同步时间</Text>
            <Text style={styles.rowValue}>{formatAbsoluteTime(lastSyncAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>内存待同步</Text>
            <Text
              style={[styles.rowValue, snapshot.pendingCount > 0 && styles.rowValueWarn]}>
              {snapshot.pendingCount > 0 ? `${snapshot.pendingCount} 条` : '无积压'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>磁盘缓冲</Text>
            <Text
              style={[
                styles.rowValue,
                snapshot.persistedCount > 0 && styles.rowValueWarn,
              ]}>
              {snapshot.persistedCount > 0
                ? `${snapshot.persistedCount} 条待写入`
                : '无积压'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>最近一条事件</Text>
            <Text style={styles.rowValue}>
              {snapshot.lastEventAt > 0
                ? formatAbsoluteTime(snapshot.lastEventAt)
                : '暂无记录'}
            </Text>
          </View>
          {snapshot.lastSync?.ran ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>上次同步补充</Text>
              <Text style={styles.rowValue}>
                {[
                  snapshot.lastSync.synced > 0 ? `实时 ${snapshot.lastSync.synced}` : null,
                  snapshot.lastSync.reconciled > 0 ? `对账 ${snapshot.lastSync.reconciled}` : null,
                  snapshot.lastSync.mediaReconciled > 0
                    ? `媒体 ${snapshot.lastSync.mediaReconciled}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || '无新数据'}
              </Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>采集服务</Text>
            <Text style={styles.rowValue}>
              {status.isRunning ? '运行中' : '已暂停'}
            </Text>
          </View>
          {snapshot.recentLogs.length > 0 ? (
            <View style={styles.historyBlock}>
              <Text style={styles.historyTitle}>最近同步记录</Text>
              {snapshot.recentLogs.map((log) => (
                <Text key={log.id ?? log.at} style={styles.historyLine}>
                  {formatAbsoluteTime(log.at)} · {formatSyncLogLine(log)}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}

      {lastFeedback ? (
        <View style={styles.feedback}>
          <Text style={styles.feedbackText}>{lastFeedback}</Text>
        </View>
      ) : null}

      {showRomHint ? (
        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.hintText}>{status.romKeepAliveHint}</Text>
        </View>
      ) : null}
    </View>
  );
}
