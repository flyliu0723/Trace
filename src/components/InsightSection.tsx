import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing, typography } from '../theme';

interface InsightSectionProps {
  title: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** 洞察页数据区块：轻量标题 + 子卡片列表 */
export function InsightSection({ title, children, style }: InsightSectionProps) {
  const styles = useThemedStyles(({ colors }) => ({
    block: {
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    title: {
      ...typography.caption,
      color: colors.labelSecondary,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
  }));

  return (
    <View style={[styles.block, style]}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}
