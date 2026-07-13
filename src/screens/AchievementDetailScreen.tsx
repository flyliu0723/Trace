import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  getAchievementDefinition,
  getCategoryLabel,
} from '../analysis/achievements/achievementCatalog';
import { AchievementShareButton } from '../components/AchievementShareButton';
import { AchievementStoryTimeline } from '../components/AchievementStoryTimeline';
import { BreathingLoader } from '../components/BreathingLoader';
import { ScreenContainer } from '../components/ScreenContainer';
import {
  getFirstByRule,
  getLatestByRule,
  getUnlockCountByRule,
  type StoredAchievement,
} from '../db';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { RootStackParamList } from '../navigation/types';
import { radius, spacing, typography } from '../theme';
import { formatDisplayDate } from '../utils/dateUtils';

type Props = NativeStackScreenProps<RootStackParamList, 'AchievementDetail'>;

export function AchievementDetailScreen({ route }: Props) {
  const { ruleId } = route.params;
  const { colors } = useTheme();
  const definition = getAchievementDefinition(ruleId);
  const [loading, setLoading] = useState(true);
  const [latest, setLatest] = useState<StoredAchievement | null>(null);
  const [first, setFirst] = useState<StoredAchievement | null>(null);
  const [count, setCount] = useState(0);

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
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
    hero: {
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    iconWrapLocked: {
      borderStyle: 'dashed',
      borderColor: c.border,
    },
    name: {
      ...typography.title,
      color: c.textPrimary,
      textAlign: 'center',
    },
    category: {
      ...typography.label,
      color: c.accent,
      fontWeight: '700',
    },
    blurb: {
      ...typography.body,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 24,
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      gap: spacing.sm,
      ...shadows.card,
    },
    sectionTitle: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '700',
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    metaLabel: {
      ...typography.caption,
      color: c.textMuted,
    },
    metaValue: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '600',
    },
    empty: {
      ...typography.caption,
      color: c.textMuted,
      textAlign: 'center',
    },
    lockedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.surfaceElevated,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border,
      padding: spacing.md,
    },
    lockedText: {
      ...typography.caption,
      color: c.textMuted,
      flex: 1,
      lineHeight: 20,
    },
  }));

  const load = useCallback(async () => {
    const [storedLatest, storedFirst, unlockCount] = await Promise.all([
      getLatestByRule(ruleId),
      getFirstByRule(ruleId),
      getUnlockCountByRule(ruleId),
    ]);
    setLatest(storedLatest);
    setFirst(storedFirst);
    setCount(unlockCount);
  }, [ruleId]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  if (!definition) {
    return (
      <ScreenContainer textured={false}>
        <View style={styles.center}>
          <Text style={styles.empty}>未找到该成就</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer textured={false}>
        <View style={styles.center}>
          <BreathingLoader text="正在打开故事…" />
        </View>
      </ScreenContainer>
    );
  }

  const unlocked = Boolean(latest);
  const firstDate = first?.evidence?.date;
  const steps = latest?.evidence?.steps ?? [];

  return (
    <ScreenContainer textured={false} style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={[styles.iconWrap, !unlocked && styles.iconWrapLocked]}>
            <Ionicons
              name={definition.icon as 'trophy-outline'}
              size={36}
              color={unlocked ? colors.accent : colors.textMuted}
            />
          </View>
          <Text style={styles.category}>{getCategoryLabel(definition.category)}</Text>
          <Text style={styles.name}>{definition.name}</Text>
          <Text style={styles.blurb}>
            {unlocked ? definition.blurb : definition.hint}
          </Text>
        </View>

        {unlocked ? (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>获得记录</Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>首次获得</Text>
                <Text style={styles.metaValue}>
                  {firstDate ? formatDisplayDate(firstDate) : '—'}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>累计</Text>
                <Text style={styles.metaValue}>
                  {definition.onceOnly ? '仅此一次' : `${count} 次`}
                </Text>
              </View>
            </View>

            {steps.length > 0 ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>最经典一次</Text>
                {latest?.evidence?.summary ? (
                  <Text style={styles.metaLabel}>{latest.evidence.summary}</Text>
                ) : null}
                <AchievementStoryTimeline steps={steps} />
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.empty}>暂无故事细节</Text>
              </View>
            )}

            <AchievementShareButton
              definition={definition}
              latest={latest}
              first={first}
              unlockCount={count}
            />
          </>
        ) : (
          <View style={styles.lockedCard}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
            <Text style={styles.lockedText}>
              还没解锁 · 达成后这里会出现属于你的故事
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
