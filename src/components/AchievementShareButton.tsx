import React, { useCallback, useRef, useState } from 'react';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  buildAchievementSharePayload,
  formatShareAchievementText,
  type ShareAchievement,
} from '../analysis/achievementShareFormatter';
import type { AchievementDefinition } from '../analysis/achievements/achievementCatalog';
import { AchievementShareCard } from './AchievementShareCard';
import { useTheme } from '../context/ThemeContext';
import type { StoredAchievement } from '../db/achievementRepository';
import { useThemedStyles } from '../hooks/useThemedStyles';
import {
  ACHIEVEMENT_CAPTURE_OPTIONS,
  getAchievementShareTitle,
  shareAchievementImageUri,
} from '../utils/achievementShare';
import { radius, spacing, typography } from '../theme';

interface AchievementShareButtonProps {
  definition: AchievementDefinition;
  latest: StoredAchievement | null;
  first: StoredAchievement | null;
  unlockCount: number;
}

interface CaptureTask {
  resolve: (uri: string) => void;
  reject: (error: Error) => void;
  started: boolean;
}

function waitForNextFrames(frameCount = 2): Promise<void> {
  return new Promise((resolve) => {
    let remaining = frameCount;
    const tick = () => {
      remaining -= 1;
      if (remaining <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function AchievementShareButton({
  definition,
  latest,
  first,
  unlockCount,
}: AchievementShareButtonProps) {
  const { colors } = useTheme();
  const viewShotRef = useRef<ViewShotRef>(null);
  const captureTaskRef = useRef<CaptureTask | null>(null);
  const [sharing, setSharing] = useState(false);
  const [capturePayload, setCapturePayload] = useState<ShareAchievement | null>(null);

  const styles = useThemedStyles(({ colors: c, shadows }) => ({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: c.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: c.borderLight,
      paddingVertical: spacing.md,
      ...shadows.card,
    },
    pressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.6,
    },
    shareText: {
      ...typography.caption,
      color: c.textPrimary,
      fontWeight: '700',
    },
    modalRoot: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    captureStage: {
      position: 'absolute',
      top: 0,
      left: 0,
      opacity: 1,
      transform: [{ translateY: -10000 }],
    },
  }));

  const clearCaptureTask = useCallback((error?: Error) => {
    const task = captureTaskRef.current;
    captureTaskRef.current = null;
    if (task && error) {
      task.reject(error);
    }
  }, []);

  const captureAchievementImage = useCallback((payload: ShareAchievement): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearCaptureTask(new Error('成就卡片渲染超时'));
        setCapturePayload(null);
      }, 6000);

      captureTaskRef.current = {
        resolve: (uri) => {
          clearTimeout(timeout);
          resolve(uri);
        },
        reject: (error) => {
          clearTimeout(timeout);
          reject(error);
        },
        started: false,
      };

      setCapturePayload(payload);
    });
  }, [clearCaptureTask]);

  const handleCaptureLayout = useCallback(async () => {
    const task = captureTaskRef.current;
    if (!task || task.started || !viewShotRef.current) {
      return;
    }

    task.started = true;

    try {
      await waitForNextFrames(3);
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 120);
      });

      const uri = await viewShotRef.current.capture();
      if (!uri) {
        throw new Error('截图结果为空');
      }

      task.resolve(uri);
    } catch (error) {
      task.reject(toError(error));
    } finally {
      captureTaskRef.current = null;
      setCapturePayload(null);
    }
  }, []);

  const handleShare = useCallback(async () => {
    const payload = buildAchievementSharePayload(definition, latest, first, unlockCount);

    setSharing(true);
    try {
      const uri = await captureAchievementImage(payload);
      try {
        await shareAchievementImageUri(uri, payload);
      } catch (shareError) {
        const message = toError(shareError).message.toLowerCase();
        if (message.includes('cancel') || message.includes('dismiss')) {
          return;
        }
        throw shareError;
      }
    } catch (captureError) {
      console.warn('[AchievementShare] image capture failed, fallback to text', captureError);
      try {
        await Share.share({
          message: formatShareAchievementText(payload),
          title: getAchievementShareTitle(payload),
        });
      } catch {
        // 用户取消分享
      }
    } finally {
      setCapturePayload(null);
      captureTaskRef.current = null;
      setSharing(false);
    }
  }, [captureAchievementImage, definition, first, latest, unlockCount]);

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          sharing && styles.disabled,
          pressed && !sharing && styles.pressed,
        ]}
        onPress={() => {
          handleShare().catch(console.error);
        }}
        disabled={sharing}
        accessibilityLabel="分享成就故事"
        accessibilityRole="button">
        {sharing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons name="share-social-outline" size={18} color={colors.accent} />
        )}
        <Text style={styles.shareText}>
          {sharing ? '正在生成分享卡片…' : '分享这段故事'}
        </Text>
      </Pressable>

      <Modal
        visible={capturePayload !== null}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => clearCaptureTask(new Error('分享已取消'))}>
        <View style={styles.modalRoot} pointerEvents="none" collapsable={false}>
          <ViewShot
            ref={viewShotRef}
            style={styles.captureStage}
            options={ACHIEVEMENT_CAPTURE_OPTIONS}
            onLayout={handleCaptureLayout}>
            {capturePayload ? <AchievementShareCard payload={capturePayload} /> : null}
          </ViewShot>
        </View>
      </Modal>
    </>
  );
}
