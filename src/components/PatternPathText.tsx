import React from 'react';
import { Text } from 'react-native';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { typography } from '../theme';

interface PatternPathTextProps {
  pathLabel: string;
}

export function PatternPathText({ pathLabel }: PatternPathTextProps) {
  const apps = pathLabel.split('→').map((part) => part.trim()).filter(Boolean);

  const styles = useThemedStyles(({ colors }) => ({
    path: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    app: {
      fontWeight: '600',
      color: colors.textPrimary,
    },
    arrow: {
      fontWeight: '400',
      color: colors.labelSecondary,
      letterSpacing: 1,
    },
  }));

  return (
    <Text style={styles.path}>
      {apps.map((app, index) => (
        <React.Fragment key={`${app}-${index}`}>
          {index > 0 ? <Text style={styles.arrow}>  →  </Text> : null}
          <Text style={styles.app}>{app}</Text>
        </React.Fragment>
      ))}
    </Text>
  );
}

interface PatternMetaTextProps {
  occurrenceDays: number;
  totalCount: number;
}

export function PatternMetaText({ occurrenceDays, totalCount }: PatternMetaTextProps) {
  const styles = useThemedStyles(({ colors }) => ({
    meta: {
      ...typography.label,
      fontSize: 12,
      color: colors.labelSecondary,
      marginTop: 4,
    },
  }));

  return (
    <Text style={styles.meta}>
      {occurrenceDays} 天 · {totalCount} 次
    </Text>
  );
}
