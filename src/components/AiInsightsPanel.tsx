import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';
import { parseAiSummarySections } from '../utils/aiSummaryParser';
import { AiSummarySectionView } from './AiSummarySectionView';

export type AiSummaryPeriod = 'daily' | 'weekly' | 'monthly';

interface PeriodConfig {
  key: AiSummaryPeriod;
  label: string;
  subtitle: string;
  icon: string;
}

interface PeriodState {
  content: string | null;
  loading: boolean;
  onGenerate: () => void;
}

interface AiInsightsPanelProps {
  aiConfigured: boolean;
  daily: PeriodState;
  weekly: PeriodState;
  monthly: PeriodState;
}

const PERIODS: PeriodConfig[] = [
  { key: 'daily', label: '今日', subtitle: '今天的发现与明天的小实验', icon: 'sunny-outline' },
  { key: 'weekly', label: '本周', subtitle: '一周规律与长期画像对比', icon: 'calendar-outline' },
  { key: 'monthly', label: '本月', subtitle: '月度趋势与习惯演变', icon: 'albums-outline' },
];

function AiUnconfiguredEmpty({ styles, colors }: {
  styles: ReturnType<typeof useThemedStyles>;
  colors: { accent: string };
}) {
  return (
    <View style={styles.unconfiguredWrap}>
      <View style={styles.unconfiguredGlowTop} />
      <View style={styles.unconfiguredGlowBottom} />
      <View style={styles.unconfiguredContent}>
        <View style={styles.unconfiguredIcon}>
          <Ionicons name="key-outline" size={16} color={colors.accent} />
        </View>
        <Text style={styles.unconfiguredText}>
          让 AI 成为你的数字搭子。填入 API Key 即可唤醒每日意图分析与行为温柔解构。
        </Text>
      </View>
    </View>
  );
}

export function AiInsightsPanel({
  aiConfigured,
  daily,
  weekly,
  monthly,
}: AiInsightsPanelProps) {
  const { colors, shadows } = useTheme();
  const [activePeriod, setActivePeriod] = useState<AiSummaryPeriod>('daily');

  const periodMap = useMemo(
    () => ({
      daily,
      weekly,
      monthly,
    }),
    [daily, monthly, weekly],
  );

  const activeConfig = PERIODS.find((period) => period.key === activePeriod) ?? PERIODS[0];
  const activeState = periodMap[activePeriod];
  const sections = useMemo(
    () => (activeState.content ? parseAiSummarySections(activeState.content) : []),
    [activeState.content],
  );
  const showActions = aiConfigured && activeState.content && !activeState.loading;

  const styles = useThemedStyles(({ colors: c, isDark }) => ({
    panel: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      marginBottom: spacing.lg,
      overflow: 'hidden',
      ...shadows.card,
    },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: spacing.xs,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '700',
      fontSize: 17,
    },
    headerSubtitle: {
      ...typography.caption,
      color: c.textMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.pill,
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.border,
    },
    actionChipPressed: {
      opacity: 0.8,
    },
    actionText: {
      ...typography.label,
      color: c.accent,
      fontWeight: '600',
    },
    segmentRow: {
      flexDirection: 'row',
      padding: spacing.sm,
      gap: spacing.xs,
      backgroundColor: c.surfaceElevated,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderRadius: radius.md,
    },
    segment: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
    },
    segmentActive: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    segmentPressed: {
      opacity: 0.85,
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
    body: {
      padding: spacing.md,
      minHeight: 120,
    },
    periodHint: {
      ...typography.caption,
      color: c.textMuted,
      marginBottom: spacing.sm,
    },
    unconfiguredWrap: {
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: isDark ? c.surfaceElevated : '#F4F7FF',
      minHeight: 140,
    },
    unconfiguredGlowTop: {
      position: 'absolute',
      top: -24,
      right: -16,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: isDark ? c.accent + '18' : '#FFFFFF',
      opacity: isDark ? 1 : 0.9,
    },
    unconfiguredGlowBottom: {
      position: 'absolute',
      bottom: -32,
      left: -20,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? c.accent + '10' : '#E8EDF9',
      opacity: 0.7,
    },
    unconfiguredContent: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    unconfiguredIcon: {
      width: 32,
      height: 32,
      borderRadius: radius.pill,
      backgroundColor: isDark ? c.accentSoft : '#E8EDF9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    unconfiguredText: {
      ...typography.caption,
      color: isDark ? c.textSecondary : '#5C6370',
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 280,
    },
    emptyWrap: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: c.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    emptyTitle: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
    },
    emptyText: {
      ...typography.caption,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: spacing.md,
    },
    generateButton: {
      marginTop: spacing.sm,
      backgroundColor: c.accent,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      minWidth: 140,
      alignItems: 'center',
    },
    generateButtonPressed: {
      opacity: 0.9,
    },
    generateButtonText: {
      color: c.onAccent,
      fontSize: 15,
      fontWeight: '600',
    },
    loadingWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    loadingText: {
      ...typography.caption,
      color: c.textMuted,
    },
    footerNote: {
      ...typography.label,
      color: c.textMuted,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      textAlign: 'center',
    },
  }));

  const handleShare = async () => {
    if (!activeState.content) {
      return;
    }
    try {
      await Share.share({
        message: `${activeConfig.label} AI 洞察\n\n${activeState.content}`,
      });
    } catch {
      // 用户取消分享
    }
  };

  const renderBody = () => {
    if (activeState.loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>正在分析行为数据…</Text>
        </View>
      );
    }

    if (!aiConfigured) {
      return <AiUnconfiguredEmpty styles={styles} colors={colors} />;
    }

    if (!activeState.content) {
      return (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name={activeConfig.icon} size={22} color={colors.accent} />
          </View>
          <Text style={styles.emptyTitle}>生成{activeConfig.label}洞察</Text>
          <Text style={styles.emptyText}>{activeConfig.subtitle}</Text>
          <Pressable
            style={({ pressed }) => [styles.generateButton, pressed && styles.generateButtonPressed]}
            onPress={activeState.onGenerate}>
            <Text style={styles.generateButtonText}>开始生成</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <>
        <Text style={styles.periodHint}>{activeConfig.subtitle}</Text>
        <AiSummarySectionView sections={sections} />
      </>
    );
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <View style={styles.headerIcon}>
              <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
            </View>
            <Text style={styles.headerTitle}>AI 洞察</Text>
          </View>
          {showActions ? (
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}
                onPress={handleShare}
                hitSlop={6}>
                <Ionicons name="share-outline" size={14} color={colors.accent} />
                <Text style={styles.actionText}>分享</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}
                onPress={activeState.onGenerate}
                hitSlop={6}>
                <Ionicons name="refresh-outline" size={14} color={colors.accent} />
                <Text style={styles.actionText}>重写</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <Text style={styles.headerSubtitle}>基于行为时间线的温柔分析，不说教、只发现</Text>
      </View>

      <View style={styles.segmentRow}>
        {PERIODS.map((period) => {
          const isActive = period.key === activePeriod;
          const isLoading = periodMap[period.key].loading;
          return (
            <Pressable
              key={period.key}
              style={({ pressed }) => [
                styles.segment,
                isActive && styles.segmentActive,
                pressed && styles.segmentPressed,
              ]}
              onPress={() => setActivePeriod(period.key)}>
              <Ionicons
                name={period.icon}
                size={14}
                color={isActive ? colors.textPrimary : colors.textMuted}
              />
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {period.label}
              </Text>
              {isLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.body}>{renderBody()}</View>

      {showActions ? (
        <Text style={styles.footerNote}>内容由 AI 生成，请结合下方数据详情理解</Text>
      ) : null}
    </View>
  );
}
