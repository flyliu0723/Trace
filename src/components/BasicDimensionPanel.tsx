import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { LifeSpectrumTile } from '../analysis/lifeSpectrumAnalyzer';
import { getDimensionLabel } from '../analysis/lifeSpectrumAnalyzer';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';
import { AppIconBadge } from './HourlyAppRow';
import { DimensionHeroCard } from './DimensionHeroCard';

interface BasicDimensionPanelProps {
  tile: LifeSpectrumTile;
}

export function BasicDimensionPanel({ tile }: BasicDimensionPanelProps) {
  const styles = useThemedStyles(({ colors: c, shadows }) => ({
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
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    body: {
      flex: 1,
      gap: 2,
    },
    appLabel: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '500',
    },
    meta: {
      ...typography.label,
      color: c.textMuted,
    },
    hint: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 20,
    },
  }));

  return (
    <>
      <DimensionHeroCard
        tone="neutral"
        eyebrow={getDimensionLabel(tile.category)}
        primaryValue={tile.durationLabel}
        primaryLabel="前台使用时长"
        insight={`今天主要在 ${tile.topAppLabel} 上花费时间。这类维度目前提供基础统计，后续会补充更细的专题分析。`}
        chips={[tile.topAppLabel]}
      />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>主要应用</Text>
        <View style={styles.row}>
          <AppIconBadge
            packageName={tile.topAppPackageName}
            appLabel={tile.topAppLabel}
            size={32}
          />
          <View style={styles.body}>
            <Text style={styles.appLabel}>{tile.topAppLabel}</Text>
            <Text style={styles.meta}>{tile.durationLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>说明</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
          <Ionicons name="information-circle-outline" size={18} color={tile.color} />
          <Text style={styles.hint}>
            {getDimensionLabel(tile.category)}维度统计的是前台亮屏使用时长。与工作、社交等场景相关的深度报告仍在建设中。
          </Text>
        </View>
      </View>
    </>
  );
}
