import React from 'react';
import { Text, View } from 'react-native';
import type { AiSummarySection } from '../utils/aiSummaryParser';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { ThemeColors } from '../theme';
import { radius, spacing, typography } from '../theme';

interface AiSummarySectionViewProps {
  sections: AiSummarySection[];
}

function getSectionAccent(title: string, colors: ThemeColors): string {
  if (title.includes('发现')) {
    return colors.accent;
  }
  if (title.includes('为什么')) {
    return colors.quickSession;
  }
  if (title.includes('做得好') || title.includes('亮点')) {
    return colors.success;
  }
  if (title.includes('实验')) {
    return colors.warning;
  }
  return colors.media;
}

export function AiSummarySectionView({ sections }: AiSummarySectionViewProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles(({ colors: c }) => ({
    container: {
      gap: spacing.md,
    },
    section: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    rail: {
      width: 3,
      borderRadius: radius.pill,
      marginTop: 4,
    },
    bodyWrap: {
      flex: 1,
      gap: spacing.xs,
    },
    title: {
      ...typography.label,
      color: c.textPrimary,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    body: {
      ...typography.body,
      color: c.textSecondary,
      lineHeight: 23,
    },
  }));

  if (sections.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {sections.map((section) => {
        const accent = getSectionAccent(section.title, colors);
        return (
          <View key={section.title} style={styles.section}>
            <View style={[styles.rail, { backgroundColor: accent }]} />
            <View style={styles.bodyWrap}>
              <Text style={styles.title}>{section.title}</Text>
              <Text style={styles.body}>{section.body}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
