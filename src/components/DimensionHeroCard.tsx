import React from 'react';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, tabularNums, typography } from '../theme';

export type DimensionHeroTone = 'warm' | 'alert' | 'calm' | 'neutral';

interface DimensionHeroCardProps {
  tone: DimensionHeroTone;
  eyebrow: string;
  primaryValue: string;
  primaryLabel: string;
  secondaryValue?: string;
  secondaryLabel?: string;
  insight?: string;
  chips?: string[];
}

export function DimensionHeroCard({
  tone,
  eyebrow,
  primaryValue,
  primaryLabel,
  secondaryValue,
  secondaryLabel,
  insight,
  chips = [],
}: DimensionHeroCardProps) {
  const styles = useThemedStyles(({ colors: c, shadows, isDark }) => {
    const accent = tone === 'warm'
      ? c.media
      : tone === 'alert'
        ? c.quickSession
        : tone === 'calm'
          ? '#6B9E8A'
          : c.warning;
    const surface = tone === 'warm'
      ? (isDark ? c.surface : '#F7FAF6')
      : tone === 'alert'
        ? (isDark ? c.surface : '#FBF7F4')
        : tone === 'calm'
          ? (isDark ? c.surface : '#F5FAF7')
          : (isDark ? c.surface : '#FBF9F4');
    const border = tone === 'alert'
      ? c.warning + '44'
      : accent + '33';

    return {
      card: {
        backgroundColor: surface,
        borderRadius: radius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: border,
        gap: spacing.sm,
        ...shadows.card,
      },
      eyebrow: {
        ...typography.caption,
        color: accent,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase' as const,
      },
      heroRow: {
        flexDirection: 'row' as const,
        alignItems: 'flex-end' as const,
        justifyContent: 'space-between' as const,
        gap: spacing.md,
        paddingVertical: spacing.xs,
      },
      primaryBlock: {
        flex: 1,
        gap: 4,
      },
      primaryValue: {
        fontSize: 36,
        fontWeight: '800',
        color: c.statInk,
        letterSpacing: -1,
        ...tabularNums,
      },
      primaryLabel: {
        ...typography.caption,
        color: c.textMuted,
      },
      secondaryBlock: {
        alignItems: 'flex-end' as const,
        gap: 4,
        minWidth: 88,
      },
      secondaryValue: {
        fontSize: 28,
        fontWeight: '800',
        color: accent,
        letterSpacing: -0.5,
        ...tabularNums,
      },
      secondaryLabel: {
        ...typography.label,
        color: c.textMuted,
        textAlign: 'right' as const,
      },
      insight: {
        ...typography.caption,
        color: c.textSecondary,
        lineHeight: 21,
      },
      chips: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: spacing.xs,
      },
      chip: {
        ...typography.label,
        color: c.textSecondary,
        backgroundColor: c.surfaceElevated,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.pill,
        ...typography.mono,
      },
    };
  });

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>

      <View style={styles.heroRow}>
        <View style={styles.primaryBlock}>
          <Text style={styles.primaryValue}>{primaryValue}</Text>
          <Text style={styles.primaryLabel}>{primaryLabel}</Text>
        </View>

        {secondaryValue ? (
          <View style={styles.secondaryBlock}>
            <Text style={styles.secondaryValue}>{secondaryValue}</Text>
            {secondaryLabel ? (
              <Text style={styles.secondaryLabel}>{secondaryLabel}</Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {insight ? <Text style={styles.insight}>{insight}</Text> : null}

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <Text key={chip} style={styles.chip}>
              {chip}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}
