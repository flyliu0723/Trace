import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DemoDataSection } from '../components/DemoDataSection';
import { ScreenContainer } from '../components/ScreenContainer';
import { MonitorStatusCard } from '../components/settings/MonitorStatusCard';
import { SegmentControl } from '../components/settings/SegmentControl';
import { SettingsGroup } from '../components/settings/SettingsGroup';
import { SettingsNavBar } from '../components/settings/SettingsNavBar';
import { SettingsRow } from '../components/settings/SettingsRow';
import { useTheme } from '../context/ThemeContext';
import { clearAllEvents, getEventsInRange, isAiConfigured } from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import type { SettingsStackParamList } from '../navigation/types';
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
import { APP_VERSION } from '../constants';
import { getTodayDateString } from '../utils/dateUtils';
import { spacing, typography } from '../theme';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors, mode, setMode } = useTheme();
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const styles = useThemedStyles(({ colors }) => ({
    screen: {
      paddingHorizontal: 0,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xxl,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appearanceSection: {
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
      gap: spacing.sm,
    },
    appearanceLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '500',
    },
  }));

  const refreshStatus = useCallback(async () => {
    const [monitorStatus, configured] = await Promise.all([
      getMonitorStatus(),
      isAiConfigured(),
    ]);
    setStatus(monitorStatus);
    setAiConfigured(configured);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshStatus()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [refreshStatus]),
  );

  const runAction = async (action: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await action();
      await refreshStatus();
    } catch (error) {
      Alert.alert('操作失败', String(error));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleMonitor = () =>
    runAction(async () => {
      if (status?.isRunning) {
        await stopMonitoring();
        return;
      }
      const started = await startMonitoring();
      if (!started) {
        Alert.alert('启动失败', '请先完成基础权限授权');
      }
    });

  const handlePermissionAction = (action: 'basic' | 'media' | 'activity' | 'battery') => {
    const handlers = {
      basic: requestPermissions,
      media: requestMediaPermissions,
      activity: async () => {
        const granted = await requestActivityRecognitionPermission();
        if (!granted) {
          Alert.alert('未授权', '未授予场景感知权限，将无法检测行走时使用手机等场景。');
        }
      },
      battery: requestBatteryOptimization,
    };
    runAction(handlers[action]);
  };

  const handleExportData = async () => {
    try {
      const events = await getEventsInRange('2020-01-01', getTodayDateString());
      await Share.share({
        message: JSON.stringify(events, null, 2),
        title: 'SpendWhere 数据备份',
      });
    } catch (error) {
      Alert.alert('导出失败', String(error));
    }
  };

  const handleClearData = () => {
    Alert.alert('清除所有数据', '此操作不可撤销，将删除本机全部历史记录。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: () => {
          runAction(async () => {
            await clearAllEvents();
            Alert.alert('已清除', '本机历史数据已全部删除');
          });
        },
      },
    ]);
  };

  const handleSetMode = (next: ThemeMode) => {
    setMode(next);
  };

  if (loading || !status) {
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
        <SettingsNavBar title="设置" />

        <MonitorStatusCard
          status={status}
          actionLoading={actionLoading}
          onToggleMonitor={handleToggleMonitor}
          onPermissionAction={handlePermissionAction}
        />

        <SettingsGroup
          title="个性化"
          footer="数据默认仅存储于本机，绝不上传云端。">
          <View style={styles.appearanceSection}>
            <Text style={styles.appearanceLabel}>外观界面</Text>
            <SegmentControl
              options={[
                { value: 'light', label: '浅色' },
                { value: 'dark', label: '深色' },
              ]}
              value={mode}
              onChange={handleSetMode}
            />
          </View>
          <SettingsRow
            label="AI 总结助手"
            hint="配置 API Key 以生成每日行为洞察"
            showChevron
            isLast
            value={aiConfigured ? '已配置' : '未配置'}
            onPress={() => navigation.navigate('AiSettings')}
          />
        </SettingsGroup>

        <SettingsGroup title="数据管理">
          <SettingsRow
            label="导出本地备份"
            hint="以 JSON 格式分享本机全部事件数据"
            showChevron
            onPress={handleExportData}
          />
          <SettingsRow
            label="清除本机所有历史数据"
            hint="不可逆操作，请谨慎执行"
            destructive
            isLast
            onPress={handleClearData}
          />
        </SettingsGroup>

        <SettingsGroup title="关于" footer="SpendWhere — 看清无意识刷屏，找回注意力。">
          <SettingsRow label="版本" value={`v${APP_VERSION}`} isLast />
        </SettingsGroup>

        {__DEV__ ? <DemoDataSection /> : null}
      </ScrollView>
    </ScreenContainer>
  );
}
