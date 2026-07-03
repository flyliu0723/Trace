import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { MonitorStatus } from '../../native/BehaviorMonitor';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  buildPermissionItems,
  countMissingPermissions,
  getMonitorHealth,
} from '../../utils/monitorStatusUtils';
import { radius, spacing, typography } from '../../theme';
import { SettingsRow } from './SettingsRow';
import { StatusDot } from './StatusDot';

interface MonitorStatusCardProps {
  status: MonitorStatus;
  actionLoading?: boolean;
  onToggleMonitor: () => void;
  onPermissionAction: (action: 'basic' | 'media' | 'activity' | 'battery') => void;
}

export function MonitorStatusCard({
  status,
  actionLoading = false,
  onToggleMonitor,
  onPermissionAction,
}: MonitorStatusCardProps) {
  const { colors } = useTheme();
  const health = getMonitorHealth(status);
  const permissions = buildPermissionItems(status);
  const missingCount = countMissingPermissions(status);
  const [expanded, setExpanded] = useState(health !== 'ok');

  useEffect(() => {
    if (health !== 'ok') {
      setExpanded(true);
    }
  }, [health]);

  const styles = useThemedStyles(({ colors: c }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    cardOk: {
      borderColor: c.success + '33',
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
      flex: 1,
      gap: spacing.sm,
    },
    headerText: {
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    toggleButton: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.sm,
      minWidth: 44,
      alignItems: 'center',
    },
    toggleButtonPressed: {
      backgroundColor: c.surfaceElevated,
    },
    toggleText: {
      ...typography.caption,
      color: c.accent,
      fontWeight: '600',
    },
    expandButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    expandPressed: {
      backgroundColor: c.surfaceElevated,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    summaryText: {
      ...typography.caption,
      color: c.textSecondary,
    },
    badge: {
      backgroundColor: c.success + '22',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    badgeText: {
      ...typography.label,
      color: c.success,
      fontWeight: '600',
    },
    loadingOverlay: {
      ...StyleSheetAbsolute,
      backgroundColor: c.background + 'AA',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg,
    },
  }));

  const statusText =
    health === 'ok'
      ? '正在守护你的注意力轨迹'
      : health === 'paused'
        ? '采集已暂停'
        : `还有 ${missingCount} 项权限待开启`;

  const dotVariant = health === 'ok' ? 'ok' : health === 'paused' ? 'paused' : 'incomplete';

  return (
    <View style={[styles.card, health === 'ok' && styles.cardOk]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <StatusDot variant={dotVariant} pulse={health === 'ok' && status.isRunning} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>监控中心</Text>
            <Text style={styles.headerSubtitle}>{statusText}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [styles.toggleButton, pressed && styles.toggleButtonPressed]}
            onPress={onToggleMonitor}
            disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Text style={styles.toggleText}>{status.isRunning ? '暂停' : '开启'}</Text>
            )}
          </Pressable>
          {health === 'ok' ? (
            <Pressable
              style={({ pressed }) => [styles.expandButton, pressed && styles.expandPressed]}
              onPress={() => setExpanded((prev) => !prev)}
              hitSlop={4}
              accessibilityLabel={expanded ? '收起权限详情' : '展开权限详情'}>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      {health === 'ok' && !expanded ? (
        <Pressable
          style={({ pressed }) => [styles.summaryRow, pressed && { opacity: 0.8 }]}
          onPress={() => setExpanded(true)}>
          <Text style={styles.summaryText}>全部 {permissions.length} 项权限均已就绪</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>正常</Text>
          </View>
        </Pressable>
      ) : (
        permissions.map((item, index) => (
          <SettingsRow
            key={item.key}
            label={item.label}
            hint={item.hint}
            isLast={index === permissions.length - 1}
            showChevron={!item.active && item.action !== 'none'}
            value={item.active ? undefined : '去授权'}
            valueAccent={!item.active}
            disabled={actionLoading}
            onPress={
              item.active || item.action === 'none' || actionLoading
                ? undefined
                : () => onPermissionAction(item.action as 'basic' | 'media' | 'activity' | 'battery')
            }
            trailing={
              item.active ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>已开启</Text>
                </View>
              ) : undefined
            }
          />
        ))
      )}

      {actionLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

const StyleSheetAbsolute = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
