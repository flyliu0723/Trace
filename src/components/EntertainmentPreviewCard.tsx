import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { EntertainmentReport } from '../analysis/entertainmentReportAnalyzer';
import { formatEntertainmentPreviewLine } from '../analysis/entertainmentReportAnalyzer';
import { formatDuration } from '../analysis/sessionAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';
import { AppIconBadge } from './HourlyAppRow';

interface EntertainmentPreviewCardProps {
  report: EntertainmentReport | null;
  onReportPress?: () => void;
}

export function EntertainmentPreviewCard({
  report,
  onReportPress,
}: EntertainmentPreviewCardProps) {
  const { colors } = useTheme();
  const previewLine = report ? formatEntertainmentPreviewLine(report) : null;

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.xl,
      gap: spacing.sm,
      ...shadows.elevatedSubtle,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerIcon: {
      width: 28,
      height: 28,
      borderRadius: radius.sm,
      backgroundColor: c.quickSession + '22',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      ...typography.caption,
      color: c.labelSecondary,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      flex: 1,
    },
    summary: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 20,
    },
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: c.ghostBorder,
    },
    appMeta: {
      flex: 1,
      gap: 2,
    },
    appLabel: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '500',
    },
    appDuration: {
      ...typography.label,
      color: c.textMuted,
      ...typography.mono,
    },
    wanderingNote: {
      ...typography.label,
      color: c.warning,
    },
    reportLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: spacing.xs,
    },
    reportLinkText: {
      ...typography.label,
      color: c.quickSession,
      fontWeight: '600',
    },
  }));

  if (!report?.hasData || !previewLine) {
    return null;
  }

  const topApps = report.topApps.slice(0, 3);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Ionicons name="phone-portrait-outline" size={15} color={colors.quickSession} />
        </View>
        <Text style={styles.title}>娱乐浏览</Text>
      </View>

      <Text style={styles.summary}>{previewLine}</Text>

      {topApps.length > 0 ? (
        <View style={styles.appRow}>
          {topApps.map((app) => (
            <AppIconBadge
              key={app.packageName}
              packageName={app.packageName}
              appLabel={app.appLabel}
              size={24}
            />
          ))}
          <View style={styles.appMeta}>
            <Text style={styles.appLabel}>
              {topApps.map((app) => app.appLabel).join('、')}
            </Text>
            <Text style={styles.appDuration}>
              共 {formatDuration(report.totalBrowseMs)} · 进入 {report.totalVisitCount} 次
            </Text>
          </View>
        </View>
      ) : null}

      {report.wandering.sessionCount > 0 ? (
        <Text style={styles.wanderingNote}>
          含 {report.wandering.sessionCount} 段游离刷屏，切换 {report.wandering.totalSwitchCount} 次
        </Text>
      ) : null}

      {onReportPress ? (
        <Pressable style={styles.reportLink} onPress={onReportPress} hitSlop={8}>
          <Text style={styles.reportLinkText}>查看刷屏报告</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.quickSession} />
        </Pressable>
      ) : null}
    </View>
  );
}
