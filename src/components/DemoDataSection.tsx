import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { clearDemoData, isDemoDataLoaded, loadDemoData } from '../services/demoDataService';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing } from '../theme';

export function DemoDataSection() {
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles(({ colors }) => ({
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    hint: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    button: {
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    primaryButton: {
      backgroundColor: colors.accent,
    },
    primaryButtonText: {
      color: colors.onAccent,
      fontSize: 15,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: colors.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.textPrimary,
      fontSize: 15,
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>演示数据（开发）</Text>
      <Text style={styles.hint}>
        内置近 7 天假数据，覆盖解锁、App 切换、播客、触发器路径等，方便在模拟器预览 UI。
        {loaded ? ' 当前已加载演示数据。' : ' 首次启动已自动加载。'}
      </Text>

      <Pressable
        style={[styles.button, styles.primaryButton]}
        onPress={handleLoad}
        disabled={loading}>
        <Text style={styles.primaryButtonText}>
          {loading ? '处理中…' : '重新加载演示数据'}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.secondaryButton]}
        onPress={handleClear}
        disabled={loading}>
        <Text style={styles.secondaryButtonText}>清除所有数据</Text>
      </Pressable>
    </View>
  );
}
