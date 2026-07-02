import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BehaviorInsight, InsightType } from '../analysis/insightEngine';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

const TYPE_LABELS: Record<InsightType, string> = {
  summary: '摘要',
  trigger: '触发器',
  pattern: '模式',
  session: '会话',
  time: '时段',
  highlight: '亮点',
  context: '场景',
};

interface InsightCardProps {
  insight: BehaviorInsight;
  compact?: boolean;
}

export function InsightCard({ insight, compact = false }: InsightCardProps) {
  const { colors } = useTheme();

  const TYPE_COLORS: Record<InsightType, string> = {
    summary: colors.accent,
    trigger: colors.quickSession,
    pattern: colors.unlock,
    session: colors.appForeground,
    time: colors.warning,
    highlight: colors.success,
    context: colors.warning,
  };

  const styles = useThemedStyles(({ colors: c }) => ({
    card: {
      backgroundColor: 'transparent',
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      marginRight: spacing.md,
      width: 280,
      overflow: 'hidden',
    },
    cardCompact: {
      width: '100%',
      marginRight: 0,
      marginBottom: spacing.md,
    },
    topRow: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 4,
    },
    badgeText: {
      ...typography.label,
      fontWeight: '600',
    },
    body: {
      padding: spacing.md,
      paddingTop: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      marginTop: spacing.sm,
    },
    title: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
      fontSize: 16,
      marginBottom: spacing.xs,
    },
    description: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 22,
    },
    highlight: {
      color: c.textPrimary,
      fontWeight: '600',
    },
  }));

  const accent = TYPE_COLORS[insight.type];

  const highlightKeywords = (text: string): React.ReactNode[] => {
    const parts = text.split(/(→|「[^」]+」|\d+[%次天项分钟小时]+)/g);
    return parts.map((part, index) => {
      const isHighlight = part.includes('→') || part.startsWith('「') || /^\d/.test(part);
      if (isHighlight && part.length > 0) {
        return (
          <Text key={index} style={styles.highlight}>
            {part}
          </Text>
        );
      }
      return part;
    });
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact, { borderColor: accent + '44' }]}>
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: accent + '22' }]}>
          <Text style={[styles.badgeText, { color: accent }]}>{TYPE_LABELS[insight.type]}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{insight.title}</Text>
        <Text style={styles.description}>
          {highlightKeywords(insight.description)}
        </Text>
      </View>
    </View>
  );
}
