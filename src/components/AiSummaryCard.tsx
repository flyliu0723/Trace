import React from 'react';
import { ActivityIndicator, Pressable, Share, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface AiSummaryCardProps {
  title: string;
  content: string | null;
  loading?: boolean;
  emptyHint?: string;
  onGenerate: () => void;
  onRegenerate?: () => void;
}

export function AiSummaryCard({
  title,
  content,
  loading = false,
  emptyHint = '点击生成',
  onGenerate,
  onRegenerate,
}: AiSummaryCardProps) {
  const { colors } = useTheme();

  const styles = useThemedStyles(({ colors: c }) => ({
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.subtitle,
      color: c.textPrimary,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionText: {
      color: c.accent,
      fontSize: 14,
      fontWeight: '500',
    },
    content: {
      ...typography.body,
      color: c.textSecondary,
    },
    empty: {
      ...typography.caption,
      color: c.textMuted,
      marginBottom: spacing.sm,
    },
    loading: {
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    generateButton: {
      backgroundColor: c.accent,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    pressed: {
      opacity: 0.9,
    },
    generateButtonText: {
      color: c.onAccent,
      fontSize: 15,
      fontWeight: '600',
    },
  }));

  const handleShare = async () => {
    if (!content) {
      return;
    }
    try {
      await Share.share({ message: `${title}\n\n${content}` });
    } catch {
      // 用户取消分享
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {content ? (
          <View style={styles.actions}>
            <Pressable onPress={handleShare} hitSlop={8}>
              <Text style={styles.actionText}>分享</Text>
            </Pressable>
            {onRegenerate ? (
              <Pressable onPress={onRegenerate} hitSlop={8}>
                <Text style={styles.actionText}>重写</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : content ? (
        <Text style={styles.content}>{content}</Text>
      ) : (
        <Text style={styles.empty}>{emptyHint}</Text>
      )}

      {!loading && !content ? (
        <Pressable
          style={({ pressed }) => [styles.generateButton, pressed && styles.pressed]}
          onPress={onGenerate}>
          <Text style={styles.generateButtonText}>生成</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
