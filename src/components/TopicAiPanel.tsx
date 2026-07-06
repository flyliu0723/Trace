import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';
import { parseAiSummarySections } from '../utils/aiSummaryParser';
import { AiSummarySectionView } from './AiSummarySectionView';

export type TopicAiPeriod = 'weekly' | 'monthly';

interface PeriodState {
  content: string | null;
  loading: boolean;
  onGenerate: () => void;
}

interface TopicAiPanelProps {
  title: string;
  aiConfigured: boolean;
  weekly: PeriodState;
  monthly: PeriodState;
  weeklyRangeLabel: string;
  monthlyRangeLabel: string;
}

export function TopicAiPanel({
  title,
  aiConfigured,
  weekly,
  monthly,
  weeklyRangeLabel,
  monthlyRangeLabel,
}: TopicAiPanelProps) {
  const { colors } = useTheme();
  const [activePeriod, setActivePeriod] = useState<TopicAiPeriod>('weekly');

  const periodMap = useMemo(
    () => ({ weekly, monthly }),
    [monthly, weekly],
  );

  const activeState = periodMap[activePeriod];
  const rangeLabel = activePeriod === 'weekly' ? weeklyRangeLabel : monthlyRangeLabel;
  const sections = useMemo(() => {
    if (!activeState.content?.trim()) {
      return [];
    }
    const parsed = parseAiSummarySections(activeState.content);
    if (parsed.length > 0) {
      return parsed;
    }
    return [{ title: '总结', body: activeState.content.trim() }];
  }, [activeState.content]);

  const styles = useThemedStyles(({ colors: c }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
      gap: spacing.sm,
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
    actions: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.border,
    },
    chipText: {
      ...typography.label,
      color: c.accent,
      fontWeight: '600',
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
    rangeLabel: {
      ...typography.caption,
      color: c.textMuted,
      ...typography.mono,
    },
    hint: {
      ...typography.caption,
      color: c.textMuted,
      lineHeight: 20,
    },
    center: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
      gap: spacing.sm,
    },
    generateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: c.accent,
    },
    generateText: {
      ...typography.label,
      color: c.onAccent,
      fontWeight: '600',
    },
  }));

  const handleShare = async () => {
    if (!activeState.content) {
      return;
    }
    const periodLabel = activePeriod === 'weekly' ? '本周' : '本月';
    try {
      await Share.share({
        message: `${title} · ${periodLabel}（${rangeLabel}）\n\n${activeState.content}`,
      });
    } catch {
      // 用户取消
    }
  };

  const renderBody = () => {
    if (activeState.loading) {
      return (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.hint}>正在分析…</Text>
        </View>
      );
    }

    if (!aiConfigured) {
      return (
        <Text style={styles.hint}>请前往 设置 → AI 总结助手 配置 API Key 后生成解读。</Text>
      );
    }

    if (!activeState.content?.trim()) {
      return (
        <>
          <Text style={styles.hint}>
            {activePeriod === 'weekly'
              ? '基于本周一至周日的数据生成解读。'
              : '基于本月 1 日至月底（或今天）的数据生成解读。'}
          </Text>
          <Pressable style={styles.generateButton} onPress={activeState.onGenerate}>
            <Ionicons name="sparkles" size={14} color={colors.onAccent} />
            <Text style={styles.generateText}>
              生成{activePeriod === 'weekly' ? '本周' : '本月'}解读
            </Text>
          </Pressable>
        </>
      );
    }

    return <AiSummarySectionView sections={sections} />;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles-outline" size={18} color={colors.accent} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {activeState.content?.trim() && !activeState.loading ? (
          <View style={styles.actions}>
            <Pressable style={styles.chip} onPress={handleShare}>
              <Ionicons name="share-outline" size={14} color={colors.accent} />
              <Text style={styles.chipText}>分享</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={activeState.onGenerate}>
              <Ionicons name="refresh-outline" size={14} color={colors.accent} />
              <Text style={styles.chipText}>重写</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.segmentRow}>
        {(['weekly', 'monthly'] as const).map((period) => {
          const isActive = period === activePeriod;
          const isLoading = periodMap[period].loading;
          const label = period === 'weekly' ? '本周' : '本月';
          return (
            <Pressable
              key={period}
              style={[styles.segment, isActive && styles.segmentActive]}
              onPress={() => setActivePeriod(period)}>
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {label}
              </Text>
              {isLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.rangeLabel}>{rangeLabel}</Text>
      {renderBody()}
    </View>
  );
}
