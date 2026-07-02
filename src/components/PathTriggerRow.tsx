import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PathTrigger } from '../analysis/pathAnalyzer';
import { classifyApp, getCategoryColor } from '../analysis/appClassifier';
import { useAppDisplay } from '../hooks/useAppDisplay';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { AppIconBadge } from './HourlyAppRow';
import { radius, spacing, typography } from '../theme';

interface PathNodeProps {
  packageName: string;
  appLabel: string;
}

function PathNode({ packageName, appLabel }: PathNodeProps) {
  const { displayLabel } = useAppDisplay(packageName, appLabel);
  const color = getCategoryColor(classifyApp(packageName, displayLabel));

  const styles = useThemedStyles(({ colors }) => ({
    node: {
      alignItems: 'center',
      width: 64,
    },
    nodeLabel: {
      ...typography.label,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
  }));

  return (
    <View style={styles.node}>
      <AppIconBadge packageName={packageName} appLabel={appLabel} size={32} floating />
      <Text style={[styles.nodeLabel, { color }]} numberOfLines={1}>
        {displayLabel}
      </Text>
    </View>
  );
}

interface PathTriggerRowProps {
  trigger: PathTrigger;
}

export function PathTriggerRow({ trigger }: PathTriggerRowProps) {
  const fromColor = getCategoryColor(classifyApp(trigger.fromPackage, trigger.fromLabel));
  const toColor = getCategoryColor(classifyApp(trigger.toPackage, trigger.toLabel));

  const styles = useThemedStyles(({ colors }) => ({
    flow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      gap: spacing.xs,
    },
    connector: {
      flex: 1,
      minWidth: 60,
      alignItems: 'center',
      position: 'relative',
      paddingHorizontal: spacing.xs,
    },
    line: {
      height: 2,
      width: '100%',
      borderRadius: 1,
    },
    arrowHead: {
      position: 'absolute',
      right: 0,
      top: -3,
      width: 0,
      height: 0,
      borderTopWidth: 4,
      borderBottomWidth: 4,
      borderLeftWidth: 6,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
    },
    countBadge: {
      ...typography.label,
      marginTop: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
  }));

  return (
    <View style={styles.flow}>
      <PathNode packageName={trigger.fromPackage} appLabel={trigger.fromLabel} />

      <View style={styles.connector}>
        <View style={[styles.line, { backgroundColor: fromColor + '66' }]} />
        <View style={[styles.arrowHead, { borderLeftColor: toColor }]} />
        <Text style={[styles.countBadge, { color: toColor, backgroundColor: toColor + '22' }]}>
          {trigger.count}次
        </Text>
      </View>

      <PathNode packageName={trigger.toPackage} appLabel={trigger.toLabel} />
    </View>
  );
}
