/**
 * SpendWhere - 手机行为时间线统计
 * @format
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DateProvider } from './src/context/DateContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { isOnboardingCompleted, setOnboardingCompleted } from './src/db';
import { RootStackNavigator } from './src/navigation/RootStackNavigator';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { maybeEvaluateAchievements } from './src/services/achievementService';
import { maybeAutoGenerateYesterdayDailySummary } from './src/services/autoDailySummaryService';
import { ensureDemoDataInDev } from './src/services/demoDataService';
import { initAppCategoryOverrides } from './src/services/appCategoryOverrides';
import { scheduleBackgroundSync } from './src/services/syncCoordinator';

function AppContent() {
  const { colors, isDark } = useTheme();
  const [booting, setBooting] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const foregroundJobsStarted = useRef(false);

  const bootstrap = useCallback(async () => {
    await initAppCategoryOverrides();
    await ensureDemoDataInDev();

    let completed = await isOnboardingCompleted();
    if (__DEV__ && !completed) {
      await setOnboardingCompleted(true);
      completed = true;
    }

    setShowOnboarding(!completed);
    scheduleBackgroundSync();
  }, []);

  useEffect(() => {
    bootstrap()
      .catch(console.error)
      .finally(() => setBooting(false));
  }, [bootstrap]);

  useEffect(() => {
    if (booting || showOnboarding) {
      return;
    }

    const runForegroundJobs = () => {
      maybeAutoGenerateYesterdayDailySummary().catch(console.warn);
      maybeEvaluateAchievements().catch(console.warn);
    };

    if (!foregroundJobsStarted.current) {
      foregroundJobsStarted.current = true;
      runForegroundJobs();
    }

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        runForegroundJobs();
      }
    });
    return () => subscription.remove();
  }, [booting, showOnboarding]);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    scheduleBackgroundSync();
  }, []);

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.accent,
    },
  };

  if (booting) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </>
    );
  }

  return (
    <DateProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor={colors.background}
        />
        <RootStackNavigator />
      </NavigationContainer>
    </DateProvider>
  );
}

function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
