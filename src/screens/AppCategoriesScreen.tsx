import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  CATEGORY_LEGEND,
  classifyApp,
  getCategoryLabel,
} from '../analysis/appClassifier';
import { ScreenContainer } from '../components/ScreenContainer';
import { SettingsGroup } from '../components/settings/SettingsGroup';
import { SettingsRow } from '../components/settings/SettingsRow';
import { useSelectedDate } from '../context/DateContext';
import { getDistinctAppUsage, type AppUsageRecord } from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import {
  clearAppCategoryOverride,
  getAllAppCategoryOverrides,
  setAppCategoryOverride,
} from '../services/appCategoryOverrides';
import { spacing, typography } from '../theme';

const CATEGORY_OPTIONS = CATEGORY_LEGEND;

export function AppCategoriesScreen() {
  const { refreshData } = useSelectedDate();
  const [apps, setApps] = useState<AppUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [overrideCount, setOverrideCount] = useState(0);

  const styles = useThemedStyles(({ colors: c }) => ({
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
      padding: spacing.xl,
    },
    intro: {
      ...typography.caption,
      color: c.textSecondary,
      lineHeight: 20,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    emptyText: {
      ...typography.body,
      color: c.textMuted,
      textAlign: 'center',
    },
  }));

  const loadApps = useCallback(async () => {
    const [records, overrides] = await Promise.all([
      getDistinctAppUsage(100),
      Promise.resolve(getAllAppCategoryOverrides()),
    ]);
    setApps(records);
    setOverrideCount(Object.keys(overrides).length);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadApps()
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [loadApps]),
  );

  const pickCategory = (app: AppUsageRecord) => {
    const current = classifyApp(app.packageName, app.appLabel ?? undefined);
    const override = getAllAppCategoryOverrides()[app.packageName];
    const buttons = [
      ...CATEGORY_OPTIONS.map((category) => ({
        text: getCategoryLabel(category),
        onPress: async () => {
          try {
            await setAppCategoryOverride(
              app.packageName,
              category,
              app.appLabel ?? undefined,
            );
            refreshData();
            await loadApps();
          } catch (error) {
            Alert.alert('保存失败', String(error));
          }
        },
      })),
      ...(override
        ? [
            {
              text: '恢复默认',
              onPress: async () => {
                try {
                  await clearAppCategoryOverride(app.packageName);
                  refreshData();
                  await loadApps();
                } catch (error) {
                  Alert.alert('操作失败', String(error));
                }
              },
            },
          ]
        : []),
      { text: '取消', style: 'cancel' as const },
    ];

    Alert.alert(
      app.appLabel ?? app.packageName,
      `当前：${getCategoryLabel(current)}${override ? '（已自定义）' : ''}`,
      buttons,
    );
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.screen} textured={false}>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen} textured={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          自定义 App 分类后，生活光谱、娱乐/阅读报告与热力图将按你的定义重新归类。已自定义
          {overrideCount} 个应用。
        </Text>

        {apps.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>暂无 App 使用记录，使用一段时间后再来设置。</Text>
          </View>
        ) : (
          <SettingsGroup title="最近使用的应用">
            {apps.map((app, index) => {
              const category = classifyApp(app.packageName, app.appLabel ?? undefined);
              const hasOverride = !!getAllAppCategoryOverrides()[app.packageName];
              return (
                <SettingsRow
                  key={app.packageName}
                  label={app.appLabel ?? app.packageName}
                  hint={app.appLabel ? app.packageName : undefined}
                  value={getCategoryLabel(category)}
                  valueAccent={hasOverride}
                  showChevron
                  isLast={index === apps.length - 1}
                  onPress={() => pickCategory(app)}
                />
              );
            })}
          </SettingsGroup>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
