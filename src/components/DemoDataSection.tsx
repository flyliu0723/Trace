import React, { useCallback, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { clearDemoData, isDemoDataLoaded, loadDemoData } from '../services/demoDataService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing, typography } from '../theme';
import { SettingsGroup } from './settings/SettingsGroup';
import { SettingsRow } from './settings/SettingsRow';

export function DemoDataSection() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles(({ colors }) => ({
    footerNote: {
      ...typography.caption,
      color: colors.textMuted,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      lineHeight: 18,
    },
  }));

  const refresh = useCallback(async () => {
    setLoaded(await isDemoDataLoaded());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(console.error);
    }, [refresh]),
  );

  const handleLoad = async () => {
    setLoading(true);
    try {
      const count = await loadDemoData();
      setLoaded(true);
      Alert.alert(
        '演示数据已加载',
        `已写入 ${count} 条事件（近 7 天）。请切换页面或下拉刷新查看 UI 效果。`,
      );
    } catch (error) {
      Alert.alert('加载失败', String(error));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    Alert.alert('清除演示数据', '将删除所有本地事件和 AI 缓存，确定吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await clearDemoData();
            setLoaded(false);
            Alert.alert('已清除', '所有演示数据已删除');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  if (!__DEV__) {
    return null;
  }

  return (
    <SettingsGroup title="开发者">
      <Text style={styles.footerNote}>
        内置近 7 天假数据，覆盖解锁、App 切换、播客等场景。
        {loaded ? ' 当前已加载演示数据。' : ''}
      </Text>
      <SettingsRow
        label="重新加载演示数据"
        loading={loading}
        onPress={handleLoad}
      />
      <SettingsRow
        label="清除演示数据"
        destructive
        isLast
        disabled={loading}
        onPress={handleClear}
      />
    </SettingsGroup>
  );
}
