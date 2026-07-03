import React from 'react';
import { Text, View } from 'react-native';
import type { BehaviorInsight, InsightType } from '../analysis/insightEngine';
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

const BADGE_PALETTE: Record<InsightType, { bg: string; text: string }> = {
  summary: { bg: '#E8EDF9', text: '#4A69BB' },
  highlight: { bg: '#E5EDE8', text: '#4A7A5E' },
  trigger: { bg: '#F5EDE8', text: '#9A6B4A' },
  pattern: { bg: '#EDE8F0', text: '#6B4A8A' },
  session: { bg: '#E8EDF9', text: '#4A69BB' },
  time: { bg: '#F5F0E5', text: '#8A734A' },
  context: { bg: '#F5F0E5', text: '#8A734A' },
};

interface InsightCardProps {
  insight: BehaviorInsight;
  compact?: boolean;
}

export function InsightCard({ insight, compact = false }: InsightCardProps) {
  const badge = BADGE_PALETTE[insight.type];

  const styles = useThemedStyles(({ colors: c, shadows, isDark }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      marginRight: spacing.md,
      width: 280,
      overflow: 'hidden',
      ...shadows.elevatedSubtle,
      ...(isDark ? { borderWidth: 1, borderColor: c.borderLight } : {}),
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
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: isDark ? badge.text + '22' : badge.bg,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: badge.text,
    },
    body: {
      padding: spacing.md,
      paddingTop: spacing.sm,
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
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{TYPE_LABELS[insight.type]}</Text>
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
