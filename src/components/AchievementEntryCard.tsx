import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  ACHIEVEMENT_TOTAL,
  getAchievementDefinition,
} from '../analysis/achievements/achievementCatalog';
import { AchievementBadge } from './AchievementBadge';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useRootNavigation } from '../hooks/useRootNavigation';
import type { StoredAchievement } from '../db/achievementRepository';
import { radius, spacing, typography } from '../theme';

interface AchievementEntryCardProps {
  unlocks: StoredAchievement[];
  hasNew: boolean;
}

export function AchievementEntryCard({ unlocks, hasNew }: AchievementEntryCardProps) {
  const { colors } = useTheme();
  const rootNavigation = useRootNavigation();

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      gap: spacing.sm,
      ...shadows.card,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '700',
    },
    meta: {
      ...typography.caption,
      color: c.textMuted,
    },
    newPill: {
      backgroundColor: c.accent + '22',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    newPillText: {
      ...typography.label,
      color: c.accent,
      fontWeight: '700',
    },
    empty: {
      ...typography.caption,
      color: c.textMuted,
      lineHeight: 20,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
      paddingTop: spacing.xs,
    },
    chevron: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    link: {
      ...typography.label,
      color: c.accent,
      fontWeight: '600',
    },
  }));

  const recent = unlocks.slice(0, 3);
  const unlockedCount = new Set(unlocks.map((item) => item.ruleId)).size;

  return (
    <Pressable style={styles.card} onPress={() => rootNavigation.navigate('Achievements')}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="trophy-outline" size={18} color={colors.accent} />
          <Text style={styles.title}>成就</Text>
          {hasNew ? (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>新</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.chevron}>
          <Text style={styles.link}>
            {unlockedCount}/{ACHIEVEMENT_TOTAL}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.accent} />
        </View>
      </View>

      {recent.length === 0 ? (
        <Text style={styles.empty}>开始记录后会出现发现。成就来自日常节奏，不是任务。</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.row}>
            {recent.map((item) => {
              const definition = getAchievementDefinition(item.ruleId);
              if (!definition) {
                return null;
              }
              return (
                <AchievementBadge
                  key={item.ruleId}
                  definition={definition}
                  unlocked
                  compact
                />
              );
            })}
          </View>
        </ScrollView>
      )}
      <Text style={styles.meta}>查看徽章墙</Text>
    </Pressable>
  );
}
