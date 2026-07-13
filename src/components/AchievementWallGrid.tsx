import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  ACHIEVEMENT_CATALOG,
  getCategoryLabel,
  type AchievementCategory,
  type AchievementDefinition,
  type AchievementRarity,
} from '../analysis/achievements/achievementCatalog';
import type { StoredAchievement } from '../db/achievementRepository';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

export type AchievementWallFilter = 'all' | 'unlocked' | 'locked';

const CATEGORY_ORDER: AchievementCategory[] = [
  'first_time',
  'rhythm',
  'humor',
  'streak',
];

/** 稀有度视觉：仅稀有/史诗展示角标，普通不打扰 */
const RARITY_META: Record<AchievementRarity, { label: string; color: string } | null> = {
  common: null,
  rare: { label: '稀有', color: '#5B8DEF' },
  epic: { label: '史诗', color: '#D9A441' },
};

interface AchievementWallGridProps {
  filter: AchievementWallFilter;
  unlocksByRule: Map<string, StoredAchievement>;
  seenAt: number;
  onPressItem: (definition: AchievementDefinition, unlocked: boolean) => void;
}

export function AchievementWallGrid({
  filter,
  unlocksByRule,
  seenAt,
  onPressItem,
}: AchievementWallGridProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    groups: {
      gap: spacing.lg,
    },
    group: {
      gap: spacing.sm,
    },
    groupTitle: {
      ...typography.label,
      color: c.textMuted,
      fontWeight: '700',
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    cell: {
      width: '47%',
      flexGrow: 1,
      minHeight: 96,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      gap: spacing.sm,
      ...shadows.elevatedSubtle,
    },
    cellLocked: {
      backgroundColor: c.surfaceElevated,
      borderStyle: 'dashed',
      borderColor: c.border,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
    },
    newDot: {
      position: 'absolute',
      top: -3,
      right: -3,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.accent,
      borderWidth: 2,
      borderColor: c.surface,
    },
    body: {
      flex: 1,
      gap: 2,
      minWidth: 0,
    },
    name: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '700',
    },
    hint: {
      ...typography.label,
      color: c.textMuted,
    },
    tag: {
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.pill,
    },
    tagText: {
      ...typography.label,
      fontWeight: '700',
    },
    empty: {
      width: '100%',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xxl,
    },
    emptyTitle: {
      ...typography.caption,
      color: c.textSecondary,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyHint: {
      ...typography.label,
      color: c.textMuted,
      textAlign: 'center',
    },
  }));

  const items = ACHIEVEMENT_CATALOG.filter((definition) => {
    const unlocked = unlocksByRule.has(definition.id);
    if (filter === 'unlocked') {
      return unlocked;
    }
    if (filter === 'locked') {
      return !unlocked;
    }
    return true;
  });

  if (items.length === 0) {
    const emptyCopy =
      filter === 'unlocked'
        ? { title: '还没有已解锁的成就', hint: '继续记录几天，成就会在日常里自然出现' }
        : { title: '全部收集完成', hint: '你已经点亮了所有成就，了不起' };
    return (
      <View style={styles.empty}>
        <Ionicons
          name={filter === 'unlocked' ? 'sparkles-outline' : 'ribbon-outline'}
          size={28}
          color={colors.textMuted}
        />
        <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
        <Text style={styles.emptyHint}>{emptyCopy.hint}</Text>
      </View>
    );
  }

  const renderCell = (definition: AchievementDefinition) => {
    const stored = unlocksByRule.get(definition.id);
    const unlocked = Boolean(stored);
    const isNew = unlocked && (stored?.unlockedAt ?? 0) > seenAt;
    const rarity = unlocked ? RARITY_META[definition.rarity] : null;
    return (
      <Pressable
        key={definition.id}
        style={[styles.cell, !unlocked && styles.cellLocked]}
        onPress={() => onPressItem(definition, unlocked)}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={definition.icon as 'trophy-outline'}
              size={22}
              color={unlocked ? colors.accent : colors.textMuted}
            />
            {isNew ? <View style={styles.newDot} /> : null}
          </View>
          <View style={styles.body}>
            <Text style={styles.name} numberOfLines={1}>
              {definition.name}
            </Text>
            <Text style={styles.hint} numberOfLines={2}>
              {unlocked ? definition.blurb : definition.hint}
            </Text>
          </View>
        </View>
        {rarity ? (
          <View style={[styles.tag, { backgroundColor: rarity.color + '22' }]}>
            <Text style={[styles.tagText, { color: rarity.color }]}>
              {rarity.label}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    entries: items.filter((definition) => definition.category === category),
  })).filter((group) => group.entries.length > 0);

  return (
    <View style={styles.groups}>
      {groups.map((group) => (
        <View key={group.category} style={styles.group}>
          <Text style={styles.groupTitle}>{getCategoryLabel(group.category)}</Text>
          <View style={styles.grid}>{group.entries.map(renderCell)}</View>
        </View>
      ))}
    </View>
  );
}
