import React from 'react';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { radius, spacing, typography } from '../../theme';

interface SettingsGroupProps {
  title?: string;
  footer?: string;
  children: React.ReactNode;
}

export function SettingsGroup({ title, footer, children }: SettingsGroupProps) {
  const styles = useThemedStyles(({ colors }) => ({
    wrapper: {
      marginBottom: spacing.lg,
    },
    title: {
      ...typography.label,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.sm,
      marginLeft: spacing.xs,
    },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      overflow: 'hidden',
    },
    footer: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: spacing.sm,
      marginHorizontal: spacing.xs,
      lineHeight: 18,
    },
  }));

  return (
    <View style={styles.wrapper}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}
