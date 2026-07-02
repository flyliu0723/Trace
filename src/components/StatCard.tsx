import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accentColor?: string;
  featured?: boolean;
  onPress?: () => void;
}

export function StatCard({
  label,
  value,
  hint,
  accentColor,
  featured = false,
  onPress,
}: StatCardProps) {
  const { colors } = useTheme();
  const resolvedAccent = accentColor ?? colors.accent;

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    card: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: 'transparent',
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    cardFeatured: {
      minWidth: '100%',
      padding: spacing.lg,
      ...shadows.glow,
      backgroundColor: c.glow,
    },
    cardPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    label: {
      ...typography.label,
      color: c.textSecondary,
      marginBottom: spacing.xs,
    },
    labelFeatured: {
      fontSize: 14,
    },
    value: {
      ...typography.stat,
      color: c.textPrimary,
    },
    valueFeatured: {
      ...typography.statHero,
    },
    hint: {
      ...typography.label,
      color: c.textMuted,
      marginTop: spacing.xs,
    },
  }));

  const content = (
    <>
      <Text style={[styles.label, featured && styles.labelFeatured]}>{label}</Text>
      <Text style={[styles.value, featured && styles.valueFeatured, { color: resolvedAccent }]}>
        {value}
      </Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          featured && styles.cardFeatured,
          { borderColor: resolvedAccent + '55' },
          pressed && styles.cardPressed,
        ]}
        onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        featured && styles.cardFeatured,
        { borderColor: resolvedAccent + '55' },
      ]}>
      {content}
    </View>
  );
}
