import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { AppCategory } from '../analysis/appClassifier';
import type { DailyLifeSpectrum, LifeSpectrumTile } from '../analysis/lifeSpectrumAnalyzer';
import { formatDuration } from '../analysis/sessionAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, tabularNums, typography } from '../theme';
import { AppIconBadge } from './HourlyAppRow';

interface LifeSpectrumOverviewPanelProps {
  spectrum: DailyLifeSpectrum;
  onDimensionPress: (category: AppCategory) => void;
}

function ProportionBar({ tiles, totalMs }: { tiles: LifeSpectrumTile[]; totalMs: number }) {
  if (totalMs <= 0) {
    return null;
  }

  return (
    <View
      style={{
        flexDirection: 'row',
        height: 10,
        borderRadius: radius.pill,
        overflow: 'hidden',
        gap: 2,
      }}>
      {tiles.map((tile) => {
        const flex = Math.max(tile.durationMs / totalMs, 0.04);
        return (
          <View
            key={tile.category}
            style={{
              flex,
              backgroundColor: tile.color,
              opacity: 0.85,
            }}
          />
        );
      })}
    </View>
  );
}

interface OverviewRowProps {
  tile: LifeSpectrumTile;
  percent: number;
  isFirst: boolean;
  onPress: () => void;
}

function OverviewRow({ tile, percent, isFirst, onPress }: OverviewRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderTopWidth: isFirst ? 0 : 1,
      borderTopColor: c.borderLight,
      paddingTop: isFirst ? 0 : spacing.sm,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tile.color + '20',
    },
    body: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    label: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '600',
    },
    percent: {
      ...typography.label,
      color: tile.color,
      fontWeight: '700',
      ...tabularNums,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    meta: {
      ...typography.label,
      color: c.textMuted,
      flex: 1,
    },
    duration: {
      ...typography.label,
      color: c.textSecondary,
      fontWeight: '600',
      ...tabularNums,
    },
    pressed: {
      opacity: 0.88,
    },
  }));

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name={tile.icon} size={16} color={tile.color} />
      </View>
      <View style={styles.body}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{tile.label}</Text>
          <Text style={styles.percent}>{percent}%</Text>
        </View>
        <View style={styles.labelRow}>
          <View style={styles.metaRow}>
            <AppIconBadge
              packageName={tile.topAppPackageName}
              appLabel={tile.topAppLabel}
              size={18}
            />
            <Text style={styles.meta} numberOfLines={1}>
              {tile.highlight}
            </Text>
          </View>
          <Text style={styles.duration}>{tile.durationLabel}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );
}

export function LifeSpectrumOverviewPanel({
  spectrum,
  onDimensionPress,
}: LifeSpectrumOverviewPanelProps) {
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
    heroValue: {
      fontSize: 36,
      fontWeight: '800',
      color: c.statInk,
      letterSpacing: -1,
      ...tabularNums,
    },
    heroLabel: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 4,
    },
    hint: {
      ...typography.caption,
      color: c.textMuted,
      lineHeight: 20,
      marginTop: spacing.sm,
    },
    empty: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.xs,
    },
    emptyText: {
      ...typography.caption,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },
  }));

  if (spectrum.tiles.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>今日占比</Text>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>今天还没有可归档的生活维度数据</Text>
        </View>
      </View>
    );
  }

  const totalMs = spectrum.totalTrackedMs;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>今日占比</Text>
        <Text style={styles.heroValue}>{formatDuration(totalMs)}</Text>
        <Text style={styles.heroLabel}>已追踪生活维度合计</Text>
        <View style={{ marginTop: spacing.md }}>
          <ProportionBar tiles={spectrum.tiles} totalMs={totalMs} />
        </View>
        <Text style={styles.hint}>
          播客为后台收听，其余多为前台使用；占比反映今日各维度的相对投入，不代表全天手机总时长。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>各维度明细</Text>
        {spectrum.tiles.map((tile, index) => {
          const percent = totalMs > 0 ? Math.round((tile.durationMs / totalMs) * 100) : 0;
          return (
            <OverviewRow
              key={tile.category}
              tile={tile}
              percent={percent}
              isFirst={index === 0}
              onPress={() => onDimensionPress(tile.category)}
            />
          );
        })}
      </View>
    </>
  );
}
