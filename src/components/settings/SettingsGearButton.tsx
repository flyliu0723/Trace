import React from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useRootNavigation } from '../../hooks/useRootNavigation';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { radius } from '../../theme';

interface SettingsGearButtonProps {
  showBadge?: boolean;
}

export function SettingsGearButton({ showBadge = false }: SettingsGearButtonProps) {
  const navigation = useRootNavigation();
  const { colors } = useTheme();
  const styles = useThemedStyles(({ colors: c }) => ({
    button: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
    },
    pressed: {
      backgroundColor: c.surfaceElevated,
      transform: [{ scale: 0.95 }],
    },
    badge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: 3.5,
      backgroundColor: c.warning,
      borderWidth: 1.5,
      borderColor: c.background,
    },
  }));

  return (
    <Pressable
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      onPress={() => navigation.navigate('Settings')}
      hitSlop={8}
      accessibilityLabel="设置">
      <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
      {showBadge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}
