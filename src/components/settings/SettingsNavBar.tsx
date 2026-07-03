import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../context/ThemeContext';
import { useRootNavigation } from '../../hooks/useRootNavigation';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { radius, spacing, typography } from '../../theme';

interface SettingsNavBarProps {
  title: string;
}

export function SettingsNavBar({ title }: SettingsNavBarProps) {
  const navigation = useRootNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(({ colors: c }) => ({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      marginLeft: -spacing.sm,
    },
    backPressed: {
      backgroundColor: c.surfaceElevated,
    },
    title: {
      ...typography.title,
      color: c.textPrimary,
      flex: 1,
    },
  }));

  return (
    <View style={styles.bar}>
      <Pressable
        style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
        onPress={() => navigation.goBack()}
        hitSlop={8}
        accessibilityLabel="返回">
        <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}
