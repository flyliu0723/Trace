import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { spacing, typography } from '../../theme';

interface SettingsRowProps {
  label: string;
  hint?: string;
  value?: string;
  showChevron?: boolean;
  valueAccent?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
  isLast?: boolean;
  onPress?: () => void;
  trailing?: React.ReactNode;
}

export function SettingsRow({
  label,
  hint,
  value,
  showChevron = false,
  valueAccent = false,
  destructive = false,
  disabled = false,
  loading = false,
  isLast = false,
  onPress,
  trailing,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(({ colors: c }) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: hint ? spacing.sm + 2 : spacing.md,
      minHeight: 48,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: c.borderLight,
    },
    rowPressed: {
      backgroundColor: c.surfaceElevated,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    content: {
      flex: 1,
      marginRight: spacing.sm,
    },
    label: {
      ...typography.body,
      color: destructive ? c.danger : c.textPrimary,
      fontWeight: '500',
    },
    hint: {
      ...typography.caption,
      color: c.textMuted,
      marginTop: 2,
    },
    value: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '500',
    },
    valueAccent: {
      color: c.accent,
      fontWeight: '600',
    },
    chevron: {
      marginLeft: spacing.xs,
    },
    trailingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
  }));

  const inner = (
    <>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        trailing ?? (
          <View style={styles.trailingRow}>
            {value ? (
              <Text style={[styles.value, valueAccent && styles.valueAccent]}>{value}</Text>
            ) : null}
            {showChevron ? (
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
                style={styles.chevron}
              />
            ) : null}
          </View>
        )
      )}
    </>
  );

  if (!onPress || disabled || loading) {
    return (
      <View style={[styles.row, (disabled || loading) && styles.rowDisabled]}>{inner}</View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      disabled={disabled}>
      {inner}
    </Pressable>
  );
}
