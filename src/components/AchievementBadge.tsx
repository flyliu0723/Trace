import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import type { AchievementDefinition } from '../analysis/achievements/achievementCatalog';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface AchievementBadgeProps {
  definition: AchievementDefinition;
  unlocked: boolean;
  compact?: boolean;
  showNew?: boolean;
  onPress?: () => void;
}

export function AchievementBadge({
  definition,
  unlocked,
  compact = false,
  showNew = false,
  onPress,
}: AchievementBadgeProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles(({ colors: c }) => ({
    wrap: {
      alignItems: 'center',
      gap: spacing.xs,
      width: compact ? 72 : undefined,
    },
    iconWrap: {
      width: compact ? 48 : 64,
      height: compact ? 48 : 64,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: unlocked ? c.borderLight : c.border,
      backgroundColor: unlocked ? c.surfaceElevated : c.surface,
      opacity: unlocked ? 1 : 0.45,
    },
    name: {
      ...typography.label,
      color: unlocked ? c.textPrimary : c.textMuted,
      textAlign: 'center',
      fontWeight: unlocked ? '600' : '500',
    },
    newDot: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    newText: {
      fontSize: 9,
      color: c.onAccent,
      fontWeight: '700',
    },
  }));

  const content = (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={definition.icon as 'trophy-outline'}
          size={compact ? 22 : 28}
          color={unlocked ? colors.accent : colors.textMuted}
        />
        {showNew ? (
          <View style={styles.newDot}>
            <Text style={styles.newText}>新</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {definition.name}
      </Text>
    </View>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}
