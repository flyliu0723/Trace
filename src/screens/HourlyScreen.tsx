import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { buildHourlyTopApps } from '../analysis/hourlyAnalyzer';
import { HourlyAppRow } from '../components/HourlyAppRow';
import { DateNavigator } from '../components/DateNavigator';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { useSelectedDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import { getEventsByDate } from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing } from '../theme';

export function HourlyScreen() {
  const { colors } = useTheme();
  const { selectedDate, dataRevision } = useSelectedDate();
  const [hourlySlots, setHourlySlots] = useState<ReturnType<typeof buildHourlyTopApps>>([]);
  const [loading, setLoading] = useState(true);

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
    },
    card: {
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: c.borderLight,
      position: 'relative',
    },
    axisLine: {
      position: 'absolute',
      left: 68,
      top: spacing.md,
      bottom: spacing.md,
      width: 1,
      backgroundColor: c.border,
      opacity: 0.5,
    },
    empty: {
      paddingVertical: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      color: c.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
    hint: {
      color: c.textMuted,
      fontSize: 12,
      textAlign: 'center',
      marginTop: spacing.lg,
      lineHeight: 18,
    },
  }));

  const loadData = useCallback(async () => {
    const events = await getEventsByDate(selectedDate);
    setHourlySlots(buildHourlyTopApps(events));
  }, [selectedDate, dataRevision]);

  useEffect(() => {
    setLoading(true);
    loadData()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [loadData]);

  const maxDurationMs = Math.max(...hourlySlots.map((s) => s.durationMs), 1);
  const activeHours = hourlySlots.filter((slot) => slot.durationMs > 0 || slot.openCount > 0).length;

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
    <ScreenContainer style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <ScreenHeader title="一天的时间轴" subtitle="0–23 点，每小时使用时长与长时间停留" />
        <DateNavigator />

        {activeHours === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>这一天很安静，还没有应用使用记录</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.axisLine} />
            {hourlySlots.map((slot) => (
              <HourlyAppRow
                key={slot.hour}
                hour={slot.hour}
                packageName={slot.packageName ?? slot.longDwells[0]?.packageName}
                appLabel={slot.appLabel ?? slot.longDwells[0]?.appLabel}
                openCount={slot.openCount}
                durationMs={slot.durationMs || slot.longDwells[0]?.durationMs || 0}
                maxDurationMs={maxDurationMs}
                longDwells={slot.longDwells}
                isEmpty={
                  slot.durationMs === 0 &&
                  slot.openCount === 0 &&
                  slot.longDwells.length === 0
                }
              />
            ))}
          </View>
        )}

        <Text style={styles.hint}>
          条形长度代表该小时使用时长 · 单次连续停留 ≥5 分钟会单独标出
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}
