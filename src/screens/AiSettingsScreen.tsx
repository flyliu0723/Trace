import React from 'react';
import { ScrollView } from 'react-native';
import { AiConfigSection } from '../components/AiConfigSection';
import { ScreenContainer } from '../components/ScreenContainer';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing } from '../theme';

export function AiSettingsScreen() {
  const styles = useThemedStyles(() => ({
    screen: {
      paddingHorizontal: 0,
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
    },
  }));

  return (
    <ScreenContainer style={styles.screen} textured={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <AiConfigSection />
      </ScrollView>
    </ScreenContainer>
  );
}
