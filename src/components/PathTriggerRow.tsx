import React from 'react';
import { Text, View } from 'react-native';
import type { PathTrigger } from '../analysis/pathAnalyzer';
import { useAppDisplay } from '../hooks/useAppDisplay';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { AppIconBadge } from './HourlyAppRow';
import { radius, spacing } from '../theme';

interface PathNodeProps {
  packageName: string;
  appLabel: string;
}

function PathNode({ packageName, appLabel }: PathNodeProps) {
  const { displayLabel } = useAppDisplay(packageName, appLabel);

  const styles = useThemedStyles(({ colors }) => ({
    node: {
      alignItems: 'center',
      width: 56,
    },
    nodeLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textPrimary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
  }));

  return (
    <View style={styles.node}>
      <AppIconBadge packageName={packageName} appLabel={appLabel} size={32} />
      <Text style={styles.nodeLabel} numberOfLines={1}>
        {displayLabel}
      </Text>
    </View>
  );
}

interface PathTriggerRowProps {
  trigger: PathTrigger;
}

export function PathTriggerRow({ trigger }: PathTriggerRowProps) {
  const styles = useThemedStyles(({ colors, shadows, isDark }) => ({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.sm,
      ...shadows.elevatedSubtle,
      ...(isDark ? { borderWidth: 1, borderColor: colors.borderLight } : {}),
    },
    connector: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: spacing.xs,
    },
    arrow: {
      fontSize: 13,
      color: colors.labelSecondary,
      letterSpacing: 2,
    },
    countBadge: {
      fontSize: 11,
      fontWeight: '600',
      color: '#4A69BB',
      backgroundColor: isDark ? colors.accent + '22' : '#E8EDF9',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
  }));

  return (
    <View style={styles.card}>
      <PathNode packageName={trigger.fromPackage} appLabel={trigger.fromLabel} />

      <View style={styles.connector}>
        <Text style={styles.arrow}>→</Text>
        <Text style={styles.countBadge}>{trigger.count} 次跳转</Text>
      </View>

      <PathNode packageName={trigger.toPackage} appLabel={trigger.toLabel} />
    </View>
  );
}
