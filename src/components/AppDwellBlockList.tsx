import React from 'react';
import { Text, View } from 'react-native';
import type { AppDwellBlock } from '../analysis/pathAnalyzer';
import { formatDuration } from '../analysis/sessionAnalyzer';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing, typography } from '../theme';
import { AppIconBadge } from './HourlyAppRow';

interface AppDwellBlockListProps {
  blocks: AppDwellBlock[];
  iconSize?: number;
  compact?: boolean;
  maxVisible?: number;
}

export function AppDwellBlockList({
  blocks,
  iconSize = 24,
  compact = false,
  maxVisible,
}: AppDwellBlockListProps) {
  const visibleBlocks = maxVisible ? blocks.slice(0, maxVisible) : blocks;
  const hiddenCount = maxVisible ? Math.max(0, blocks.length - maxVisible) : 0;

  const styles = useThemedStyles(({ colors: c }) => ({
    list: {
      gap: compact ? spacing.xs : spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    body: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      minWidth: 0,
    },
    label: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '500',
      flex: 1,
    },
    duration: {
      ...typography.label,
      color: c.textMuted,
      ...typography.mono,
      flexShrink: 0,
    },
    divider: {
      height: 1,
      backgroundColor: c.borderLight,
      marginLeft: iconSize + spacing.sm,
    },
    more: {
      ...typography.label,
      color: c.textMuted,
      marginLeft: iconSize + spacing.sm,
    },
  }));

  if (blocks.length === 0) {
    return null;
  }

  return (
    <View style={styles.list}>
      {visibleBlocks.map((block, index) => (
        <React.Fragment key={`${block.packageName}-${block.startTime}-${index}`}>
          {index > 0 && !compact ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <AppIconBadge
              packageName={block.packageName}
              appLabel={block.appLabel}
              size={iconSize}
            />
            <View style={styles.body}>
              <Text style={styles.label} numberOfLines={1}>
                {block.appLabel}
              </Text>
              <Text style={styles.duration}>
                {block.durationMs < 60_000 && block.durationMs > 0
                  ? '< 1 分'
                  : formatDuration(block.durationMs)}
              </Text>
            </View>
          </View>
        </React.Fragment>
      ))}
      {hiddenCount > 0 ? (
        <Text style={styles.more}>还有 {hiddenCount} 段</Text>
      ) : null}
    </View>
  );
}
