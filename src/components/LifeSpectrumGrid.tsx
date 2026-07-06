import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { AppCategory } from '../analysis/appClassifier';
import type { DailyLifeSpectrum, LifeSpectrumTile } from '../analysis/lifeSpectrumAnalyzer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';
import { AppIconBadge } from './HourlyAppRow';

interface LifeSpectrumGridProps {
  spectrum: DailyLifeSpectrum;
  onTilePress?: (category: AppCategory, tile: LifeSpectrumTile) => void;
  onViewAllPress?: () => void;
}

function SpectrumTile({
  tile,
  onPress,
}: {
  tile: LifeSpectrumTile;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const isPressable = Boolean(onPress);

  const styles = useThemedStyles(({ colors: c, shadows, isDark }) => ({
    tile: {
      flexBasis: '47%',
      flexGrow: 1,
      minHeight: 112,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: isDark ? c.borderLight : tile.color + '22',
      gap: spacing.sm,
      ...shadows.elevatedSubtle,
    },
    tilePressed: {
      opacity: 0.9,
    },
    tileStatic: {
      opacity: 0.94,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    labelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
      minWidth: 0,
    },
    iconWrap: {
      width: 24,
      height: 24,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tile.color + '20',
    },
    label: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '600',
      letterSpacing: 0.4,
    },
    duration: {
      fontSize: 24,
      fontWeight: '800',
      color: c.statInk,
      letterSpacing: -0.5,
    },
    highlightRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      minWidth: 0,
    },
    highlight: {
      ...typography.label,
      color: c.textMuted,
      flex: 1,
    },
  }));

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={tile.icon} size={14} color={tile.color} />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {tile.label}
          </Text>
        </View>
        {isPressable ? (
          <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
        ) : null}
      </View>

      <Text style={styles.duration}>{tile.durationLabel}</Text>

      <View style={styles.highlightRow}>
        <AppIconBadge
          packageName={tile.topAppPackageName}
          appLabel={tile.topAppLabel}
          size={20}
        />
        <Text style={styles.highlight} numberOfLines={2}>
          {tile.highlight}
        </Text>
      </View>
    </>
  );

  if (isPressable) {
    return (
      <Pressable
        style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.tile, styles.tileStatic]}>{content}</View>;
}

export function LifeSpectrumGrid({ spectrum, onTilePress, onViewAllPress }: LifeSpectrumGridProps) {
  const styles = useThemedStyles(({ colors: c }) => ({
    section: {
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingHorizontal: 2,
    },
    headerPressable: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: spacing.sm,
      flex: 1,
      paddingHorizontal: 2,
    },
    viewAll: {
      ...typography.label,
      color: c.accent,
      fontWeight: '600',
    },
    title: {
      ...typography.caption,
      color: c.labelSecondary,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    subtitle: {
      ...typography.label,
      color: c.textMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    empty: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      borderStyle: 'dashed',
      paddingVertical: spacing.xl,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
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
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [styles.headerPressable, pressed && { opacity: 0.85 }]}
          onPress={onViewAllPress}
          disabled={!onViewAllPress}>
          <Text style={styles.title}>今日生活光谱</Text>
          {onViewAllPress ? <Text style={styles.viewAll}>查看全部</Text> : null}
        </Pressable>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>今天还没有可归档的生活维度数据</Text>
          <Text style={styles.emptyText}>收听、浏览或打开应用后，这里会出现模块化入口</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Pressable
        style={({ pressed }) => [styles.headerPressable, pressed && { opacity: 0.85 }]}
        onPress={onViewAllPress}
        disabled={!onViewAllPress}>
        <Text style={styles.title}>今日生活光谱</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <Text style={styles.subtitle}>{spectrum.tiles.length} 个维度</Text>
          {onViewAllPress ? <Text style={styles.viewAll}>查看全部</Text> : null}
        </View>
      </Pressable>

      <View style={styles.grid}>
        {spectrum.tiles.map((tile) => (
          <SpectrumTile
            key={tile.category}
            tile={tile}
            onPress={
              onTilePress
                ? () => onTilePress(tile.category, tile)
                : undefined
            }
          />
        ))}
      </View>
    </View>
  );
}
