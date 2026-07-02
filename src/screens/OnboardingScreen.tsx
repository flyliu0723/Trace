import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setOnboardingCompleted } from '../db';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import {
  requestBatteryOptimization,
  requestMediaPermissions,
  requestPermissions,
  startMonitoring,
} from '../services/monitorService';
import { radius, spacing } from '../theme';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const STEPS = [
  { title: '基础权限', action: 'permissions' as const },
  { title: '媒体检测', action: 'media' as const },
  { title: '电池优化', action: 'battery' as const },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles(({ colors: c }) => ({
    container: {
      flex: 1,
      backgroundColor: c.background,
      paddingHorizontal: spacing.lg,
    },
    content: {
      flex: 1,
      paddingTop: spacing.xl,
    },
    stepIndicator: {
      color: c.textMuted,
      fontSize: 13,
      marginBottom: spacing.lg,
    },
    title: {
      color: c.textPrimary,
      fontSize: 28,
      fontWeight: '700',
      marginBottom: spacing.lg,
    },
    actionButton: {
      alignSelf: 'flex-start',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    actionButtonText: {
      color: c.accent,
      fontSize: 15,
      fontWeight: '600',
    },
    footer: {
      gap: spacing.md,
      paddingTop: spacing.md,
    },
    primaryButton: {
      backgroundColor: c.accent,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    primaryButtonText: {
      color: c.onAccent,
      fontSize: 17,
      fontWeight: '600',
    },
    skipText: {
      color: c.textMuted,
      fontSize: 14,
      textAlign: 'center',
    },
  }));

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const runStepAction = useCallback(async () => {
    setLoading(true);
    try {
      if (current.action === 'permissions') {
        await requestPermissions();
      } else if (current.action === 'media') {
        await requestMediaPermissions();
      } else if (current.action === 'battery') {
        await requestBatteryOptimization();
      }
    } finally {
      setLoading(false);
    }
  }, [current.action]);

  const handleNext = async () => {
    if (isLast) {
      setLoading(true);
      try {
        await startMonitoring();
        await setOnboardingCompleted(true);
        onComplete();
      } finally {
        setLoading(false);
      }
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSkip = async () => {
    await setOnboardingCompleted(true);
    onComplete();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.content}>
        <Text style={styles.stepIndicator}>
          {step + 1}/{STEPS.length}
        </Text>
        <Text style={styles.title}>{current.title}</Text>

        <Pressable style={styles.actionButton} onPress={runStepAction} disabled={loading}>
          <Text style={styles.actionButtonText}>去授权</Text>
        </Pressable>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Pressable style={styles.primaryButton} onPress={handleNext} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.primaryButtonText}>{isLast ? '开始' : '下一步'}</Text>
          )}
        </Pressable>
        <Pressable onPress={handleSkip}>
          <Text style={styles.skipText}>跳过</Text>
        </Pressable>
      </View>
    </View>
  );
}
