import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { formatDuration } from '../analysis/sessionAnalyzer';
import { AppIconBadge } from './HourlyAppRow';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { FocusAppChip } from '../analysis/wanderingViewBuilder';
import { radius, spacing, typography } from '../theme';

interface FocusChipsWallProps {
  apps: FocusAppChip[];
}

export function FocusChipsWall({ apps }: FocusChipsWallProps) {
  const validApps = apps.filter(
    (app) => app.appLabel.trim().length > 0 && app.durationMs > 0,
  );

  const styles = useThemedStyles(({ colors, shadows }) => ({
    section: {
      marginTop: spacing.md,
      width: '100%',
      gap: spacing.sm,
    },
    title: {
      ...typography.caption,
      color: colors.labelSecondary,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
    },
    scrollView: {
      flexGrow: 0,
    },
    scrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      alignSelf: 'flex-start',
      ...shadows.elevatedSubtle,
    },
    chipText: {
      gap: 2,
    },
    chipLabel: {
      ...typography.caption,
      color: colors.textPrimary,
      fontWeight: '600',
      maxWidth: 96,
    },
    chipMeta: {
      fontSize: 11,
      color: colors.labelSecondary,
      ...typography.mono,
    },
    emptyBox: {
      width: '100%',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.ghostBorder,
      borderStyle: 'dashed',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  }));

  return (
    <View style={styles.section}>
      <Text style={styles.title}>专注勋章墙</Text>
      {validApps.length > 0 ? (
        <>
          <Text style={styles.subtitle}>今天这些 App 陪你进入了心流</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}>
            {validApps.map((app) => (
              <View key={app.packageName} style={styles.chip}>
                <AppIconBadge
                  packageName={app.packageName}
                  appLabel={app.appLabel}
                  size={32}
                />
                <View style={styles.chipText}>
                  <Text style={styles.chipLabel} numberOfLines={1}>
                    {app.appLabel}
                  </Text>
                  <Text style={styles.chipMeta}>
                    {formatDuration(app.durationMs)}
                    {app.sessionCount > 1 ? ` · ${app.sessionCount} 次` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            还没有专注勋章
          </Text>
          <Text style={styles.emptyText}>
            当你在某 App 里连续专注 ≥10 分钟，它会出现在这里
          </Text>
        </View>
      )}
    </View>
  );
}
