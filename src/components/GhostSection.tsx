import React from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface GhostSectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}

/** 首页主卡片容器：白底 + 弥散投影，无硬边框 */
export function GhostSection({ title, subtitle, children, style }: GhostSectionProps) {
  const styles = useThemedStyles(({ colors, shadows }) => ({
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.elevated,
    },
    header: {
      marginBottom: subtitle ? spacing.xs : spacing.md,
    },
    title: {
      ...typography.caption,
      color: colors.labelSecondary,
      fontWeight: '600',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    subtitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
  }));

  return (
    <View style={[styles.section, style]}>
      {title ? (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}
