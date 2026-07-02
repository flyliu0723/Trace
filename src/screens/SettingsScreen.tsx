import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenContainer } from '../components/ScreenContainer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { SettingsStackParamList } from '../navigation/SettingsNavigator';
import {
  getMonitorStatus,
  requestActivityRecognitionPermission,
  requestBatteryOptimization,
  requestMediaPermissions,
  requestPermissions,
  startMonitoring,
  stopMonitoring,
} from '../services/monitorService';
import type { MonitorStatus } from '../native/BehaviorMonitor';
import type { ThemeMode } from '../theme/types';
import { radius, spacing } from '../theme';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors, mode, setMode } = useTheme();
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const styles = useThemedStyles(({ colors: c }) => ({
    screen: {
      paddingHorizontal: 0,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: c.textPrimary,
      fontSize: 24,
      fontWeight: '700',
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      color: c.textSecondary,
      fontSize: 13,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    section: {
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    appearanceRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    appearanceOption: {
      flex: 1,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.borderLight,
      backgroundColor: c.surfaceElevated,
    },
    appearanceOptionActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    appearanceText: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    appearanceTextActive: {
      color: c.onAccent,
      fontWeight: '600',
    },
    button: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    primaryButton: {
      backgroundColor: c.accent,
    },
    primaryButtonText: {
      color: c.onAccent,
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    secondaryButtonText: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    menuLabel: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '500',
    },
    menuArrow: {
      color: c.textMuted,
      fontSize: 22,
      lineHeight: 22,
    },
  }));

  const refreshStatus = useCallback(async () => {
    const data = await getMonitorStatus();
    setStatus(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStatus()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [refreshStatus]),
  );

  const handleRequestMediaPermissions = async () => {
    setActionLoading(true);
    try {
      await requestMediaPermissions();
      await refreshStatus();
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMonitor = async () => {
    setActionLoading(true);
    try {
      if (status?.isRunning) {
        await stopMonitoring();
      } else {
        const started = await startMonitoring();
        if (!started) {
          Alert.alert('启动失败', '请先授予权限');
        }
      }
      await refreshStatus();
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestPermissions = async () => {
    setActionLoading(true);
    try {
      await requestPermissions();
      await refreshStatus();
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatteryOptimization = async () => {
    setActionLoading(true);
    try {
      await requestBatteryOptimization();
      await refreshStatus();
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivityRecognitionPermission = async () => {
    setActionLoading(true);
    try {
      const granted = await requestActivityRecognitionPermission();
      await refreshStatus();
      if (!granted) {
        Alert.alert('未授权', '未授予身体活动权限，将无法检测行走时使用手机等场景。');
      }
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetMode = (next: ThemeMode) => {
    setMode(next);
  };

  if (loading) {
    return (
      <ScreenContainer textured={false}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen} textured={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.title}>设置</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>外观</Text>
          <View style={styles.appearanceRow}>
            <Pressable
              style={[
                styles.appearanceOption,
                mode === 'light' && styles.appearanceOptionActive,
              ]}
              onPress={() => handleSetMode('light')}>
              <Text
                style={[
                  styles.appearanceText,
                  mode === 'light' && styles.appearanceTextActive,
                ]}>
                浅色
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.appearanceOption,
                mode === 'dark' && styles.appearanceOptionActive,
              ]}
              onPress={() => handleSetMode('dark')}>
              <Text
                style={[
                  styles.appearanceText,
                  mode === 'dark' && styles.appearanceTextActive,
                ]}>
                深色
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <StatusRow label="采集" active={status?.isRunning ?? false} />
          <StatusRow label="使用情况" active={status?.hasUsageAccess ?? false} />
          <StatusRow label="通知" active={status?.hasNotificationPermission ?? false} />
          <StatusRow label="通知使用权" active={status?.hasNotificationListenerAccess ?? false} />
          <StatusRow label="电池优化" active={status?.isIgnoringBatteryOptimizations ?? false} />
          <StatusRow label="身体活动" active={status?.hasActivityRecognitionPermission ?? false} />
        </View>

        <Pressable
          style={[styles.button, styles.primaryButton]}
          onPress={handleToggleMonitor}
          disabled={actionLoading}>
          <Text style={styles.primaryButtonText}>
            {status?.isRunning ? '停止' : '开始'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={handleRequestPermissions}
          disabled={actionLoading}>
          <Text style={styles.secondaryButtonText}>基础权限</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={handleRequestMediaPermissions}
          disabled={actionLoading}>
          <Text style={styles.secondaryButtonText}>媒体检测</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={handleActivityRecognitionPermission}
          disabled={actionLoading}>
          <Text style={styles.secondaryButtonText}>场景检测权限</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.secondaryButton]}
          onPress={handleBatteryOptimization}
          disabled={actionLoading}>
          <Text style={styles.secondaryButtonText}>电池优化</Text>
        </Pressable>

        <Pressable
          style={styles.menuRow}
          onPress={() => navigation.navigate('AiSettings')}>
          <Text style={styles.menuLabel}>AI</Text>
          <Text style={styles.menuArrow}>›</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatusRow({ label, active }: { label: string; active: boolean }) {
  const styles = useThemedStyles(({ colors }) => ({
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    statusLabel: {
      color: colors.textPrimary,
      fontSize: 15,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusOn: {
      backgroundColor: colors.success,
    },
    statusOff: {
      backgroundColor: colors.textMuted,
    },
  }));

  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={[styles.statusDot, active ? styles.statusOn : styles.statusOff]} />
    </View>
  );
}
