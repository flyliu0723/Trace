import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { RootNavigator } from './RootNavigator';
import { SettingsNavigator } from './SettingsNavigator';
import { LifeSpectrumHubScreen } from '../screens/LifeSpectrumHubScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStackNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="MainTabs" component={RootNavigator} />
      <Stack.Screen
        name="Settings"
        component={SettingsNavigator}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="LifeSpectrumHub"
        component={LifeSpectrumHubScreen}
        options={{
          animation: 'slide_from_right',
          headerShown: true,
          title: '生活光谱',
          headerBackTitle: '返回',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
