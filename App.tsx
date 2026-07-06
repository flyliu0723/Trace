/**
 * SpendWhere - 手机行为时间线统计
 * @format
 */

import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DateProvider } from './src/context/DateContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { isOnboardingCompleted, setOnboardingCompleted } from './src/db';
import { RootStackNavigator } from './src/navigation/RootStackNavigator';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { ensureDemoDataInDev } from './src/services/demoDataService';
import { initAppCategoryOverrides } from './src/services/appCategoryOverrides';
import { scheduleBackgroundSync } from './src/services/syncCoordinator';

function AppContent() {
  const { colors, isDark } = useTheme();
  const [booting, setBooting] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

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
