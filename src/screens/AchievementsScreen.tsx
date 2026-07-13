import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import {
  ACHIEVEMENT_TOTAL,
  type AchievementDefinition,
} from '../analysis/achievements/achievementCatalog';
import {
  AchievementWallGrid,
  type AchievementWallFilter,
} from '../components/AchievementWallGrid';
import { BreathingLoader } from '../components/BreathingLoader';
import { ScreenContainer } from '../components/ScreenContainer';
import {
  getAchievementsSeenAt,
  getLatestUnlockPerRule,
  setAchievementsSeenAt,
  type StoredAchievement,
} from '../db';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useRootNavigation } from '../hooks/useRootNavigation';
import { maybeEvaluateAchievements } from '../services/achievementService';
import { radius, spacing, typography } from '../theme';

const FILTERS: Array<{ id: AchievementWallFilter; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'unlocked', label: '已解锁' },
  { id: 'locked', label: '未解锁' },
];

export function AchievementsScreen() {
  const rootNavigation = useRootNavigation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<AchievementWallFilter>('all');
  const [unlocks, setUnlocks] = useState<StoredAchievement[]>([]);
  const [seenAt, setSeenAtState] = useState(0);

  const styles = useThemedStyles(({ colors: c }) => ({
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBlock: {
      gap: spacing.sm,
    },
    progressTrack: {
      height: 6,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceElevated,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    title: {
      ...typography.title,
      color: c.textPrimary,
    },
    subtitle: {
      ...typography.caption,
      color: c.textMuted,
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: c.surfaceElevated,
      borderRadius: radius.md,
      padding: spacing.xs,
      gap: spacing.xs,
    },
    segment: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
    },
    segmentActive: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    segmentText: {
      ...typography.label,
      color: c.textMuted,
      fontWeight: '500',
    },
    segmentTextActive: {
      color: c.textPrimary,
      fontWeight: '700',
    },
    footer: {
      ...typography.caption,
      color: c.textMuted,
      lineHeight: 20,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
  }));

  const load = useCallback(async () => {
    await maybeEvaluateAchievements();
    const [latest, seen] = await Promise.all([
      getLatestUnlockPerRule(),
      getAchievementsSeenAt(),
    ]);
    setUnlocks(latest);
    setSeenAtState(seen);
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  // 已读标记延后到离开页面，避免刚进墙红点就被清、看不清哪些是新发现
  useEffect(() => {
    return () => {
      setAchievementsSeenAt(Date.now()).catch(console.error);
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load()
      .catch(console.error)
      .finally(() => setRefreshing(false));
  }, [load]);

  const unlocksByRule = new Map(unlocks.map((item) => [item.ruleId, item]));
  const unlockedCount = unlocksByRule.size;

  const handlePress = (definition: AchievementDefinition) => {
    rootNavigation.navigate('AchievementDetail', { ruleId: definition.id });
  };

  if (loading) {
    return (
      <ScreenContainer textured={false}>
        <View style={styles.center}>
          <BreathingLoader text="正在整理成就…" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer textured={false} style={{ paddingHorizontal: 0 }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>
        <View style={styles.headerBlock}>
          <Text style={styles.subtitle}>
            发现你的使用节奏 · 已解锁 {unlockedCount} / {ACHIEVEMENT_TOTAL}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(unlockedCount / ACHIEVEMENT_TOTAL) * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.segmentRow}>
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                style={[styles.segment, active && styles.segmentActive]}
                onPress={() => setFilter(item.id)}>
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <AchievementWallGrid
          filter={filter}
          unlocksByRule={unlocksByRule}
          seenAt={seenAt}
          onPressItem={handlePress}
        />

        <Text style={styles.footer}>成就来自日常行为的自然发现，不是任务。</Text>
      </ScrollView>
    </ScreenContainer>
  );
}
