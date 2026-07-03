import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { AiSettingsScreen } from '../screens/AiSettingsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import type { SettingsStackParamList } from './types';

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen
        name="AiSettings"
        component={AiSettingsScreen}
        options={{
          headerShown: true,
          title: 'AI 总结助手',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
