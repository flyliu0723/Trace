import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  getAiAutoDailyEnabled,
  getAiConfig,
  saveAiConfig,
  setAiAutoDailyEnabled,
  type AiConfig,
} from '../db';
import { testAiConnection } from '../services/aiSummaryService';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { radius, spacing, typography } from '../theme';

export function AiConfigSection() {
  const { colors } = useTheme();
  const [config, setConfig] = useState<AiConfig>({
    apiKey: '',
    baseUrl: DEFAULT_AI_BASE_URL,
    model: DEFAULT_AI_MODEL,
  });
  const [autoDaily, setAutoDaily] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const styles = useThemedStyles(({ colors }) => ({
    section: {
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 13,
      marginBottom: spacing.xs,
      marginTop: spacing.sm,
    },
    input: {
      backgroundColor: colors.surfaceElevated,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      fontSize: 15,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    saveButton: {
      backgroundColor: colors.accent,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    testButton: {
      flex: 1,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceElevated,
    },
    testButtonText: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '600',
    },
    saveButtonText: {
      color: colors.onAccent,
      fontSize: 15,
      fontWeight: '600',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      marginTop: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    switchCopy: {
      flex: 1,
      gap: 4,
    },
    switchTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    switchHint: {
      ...typography.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
  }));

  const loadConfig = useCallback(async () => {
    const [saved, enabled] = await Promise.all([getAiConfig(), getAiAutoDailyEnabled()]);
    setConfig(saved);
    setAutoDaily(enabled);
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    loadConfig().catch(console.error);
  }, [loadConfig]);

  const handleTest = async () => {
    setTesting(true);
    try {
      const reply = await testAiConnection(config);
      Alert.alert('连接成功', reply.slice(0, 120));
    } catch (error) {
      Alert.alert('连接失败', String(error));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([saveAiConfig(config), setAiAutoDailyEnabled(autoDaily)]);
      Alert.alert('已保存');
    } catch (error) {
      Alert.alert('失败', String(error));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>API Key</Text>
      <TextInput
        style={styles.input}
        value={config.apiKey}
        onChangeText={(apiKey) => setConfig((c) => ({ ...c, apiKey }))}
        placeholder="sk-..."
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>API 地址</Text>
      <TextInput
        style={styles.input}
        value={config.baseUrl}
        onChangeText={(baseUrl) => setConfig((c) => ({ ...c, baseUrl }))}
        placeholder={DEFAULT_AI_BASE_URL}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>模型</Text>
      <TextInput
        style={styles.input}
        value={config.model}
        onChangeText={(model) => setConfig((c) => ({ ...c, model }))}
        placeholder={DEFAULT_AI_MODEL}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchTitle}>自动补写昨日日报</Text>
          <Text style={styles.switchHint}>
            打开 App 或回到前台时，若昨日尚无日报且已配置 API，将自动生成并缓存。
          </Text>
        </View>
        <Switch
          value={autoDaily}
          onValueChange={setAutoDaily}
          trackColor={{ false: colors.border, true: colors.accent + '88' }}
          thumbColor={autoDaily ? colors.accent : colors.surfaceElevated}
        />
      </View>

      <View style={styles.buttonRow}>
        <Pressable style={styles.testButton} onPress={handleTest} disabled={testing || saving}>
          <Text style={styles.testButtonText}>{testing ? '测试中…' : '测试连接'}</Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, { flex: 1, marginTop: 0 }]}
          onPress={handleSave}
          disabled={saving || testing}>
          <Text style={styles.saveButtonText}>{saving ? '保存中' : '保存'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
