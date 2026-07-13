import React from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DateNavigator } from './DateNavigator';
import { BreathingLoader } from './BreathingLoader';
import { ScreenContainer } from './ScreenContainer';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

interface TopicReportScaffoldProps {
  embedded?: boolean;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  isEmpty: boolean;
  emptyIcon: React.ComponentProps<typeof Ionicons>['name'];
  emptyMessage: string;
  loadingText?: string;
  children: React.ReactNode;
}

/** 专题报告页共用外壳：加载态、空态、日期切换与下拉刷新 */
export function TopicReportScaffold({
  embedded = false,
  loading,
  refreshing,
  onRefresh,
  isEmpty,
  emptyIcon,
  emptyMessage,
  loadingText = '正在整理专题数据…',
  children,
}: TopicReportScaffoldProps) {
  const { colors } = useTheme();

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
      paddingHorizontal: spacing.lg,
    },
    emptyWrap: {
      alignItems: 'center',
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.md,
      gap: spacing.md,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
      borderWidth: 1,
      borderColor: c.borderLight,
    },
    emptyText: {
      ...typography.body,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 22,
    },
  }));

  if (loading) {
    const loader = (
      <View style={styles.center}>
        <BreathingLoader text={loadingText} />
      </View>
    );
    if (embedded) {
      return loader;
    }
    return (
      <ScreenContainer style={styles.screen} textured={false}>
        {loader}
      </ScreenContainer>
    );
  }

  if (isEmpty) {
    const emptyBody = (
      <View style={styles.emptyWrap}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name={emptyIcon} size={32} color={colors.textMuted} />
        </View>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
    if (embedded) {
      return emptyBody;
    }
    return (
      <ScreenContainer style={styles.screen} textured={false}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
          }>
          <DateNavigator />
          {emptyBody}
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (embedded) {
    return <View>{children}</View>;
  }

  return (
    <ScreenContainer style={styles.screen} textured={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }>
        <DateNavigator />
        {children}
      </ScrollView>
    </ScreenContainer>
  );
}
