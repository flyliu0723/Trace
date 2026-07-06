import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import {
  buildDailyReceipt,
  buildWeeklyReceipt,
  formatShareReceiptText,
  type ShareReceipt,
} from '../analysis/receiptShareFormatter';
import { ReceiptShareCard } from './ReceiptShareCard';
import { useTheme } from '../context/ThemeContext';
import { getEventsForDates } from '../db';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { ensureSynced } from '../services/syncCoordinator';
import type { BehaviorEvent, DailySummary } from '../types/event';
import {
  getReceiptShareTitle,
  RECEIPT_CAPTURE_OPTIONS,
  shareReceiptImageUri,
} from '../utils/receiptShare';
import {
  addDays,
  getMondayOfWeek,
  getWeekDatesMondayToSunday,
  isToday,
} from '../utils/dateUtils';
import { radius, spacing } from '../theme';

interface ReceiptShareButtonProps {
  date: string;
  events: BehaviorEvent[];
  summary?: DailySummary | null;
  disabled?: boolean;
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

export function ReceiptShareButton({
  date,
  events,
  summary,
  disabled = false,
}: ReceiptShareButtonProps) {
  const { colors } = useTheme();
  const viewShotRef = useRef<ViewShotRef>(null);
  const captureTaskRef = useRef<CaptureTask | null>(null);
  const [sharing, setSharing] = useState(false);
  const [captureReceipt, setCaptureReceipt] = useState<ShareReceipt | null>(null);

  const styles = useThemedStyles(({ colors: c }) => ({
    button: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: c.borderLight,
      marginBottom: spacing.lg,
    },
    pressed: {
      backgroundColor: c.surface,
      transform: [{ scale: 0.95 }],
    },
    disabled: {
      opacity: 0.35,
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

  const captureReceiptImage = useCallback((receipt: ShareReceipt): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        clearCaptureTask(new Error('小票渲染超时'));
        setCaptureReceipt(null);
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

      setCaptureReceipt(receipt);
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
      setCaptureReceipt(null);
    }
  }, []);

  const shareReceiptWithFallback = useCallback(async (receipt: ShareReceipt) => {
    if (!receipt.hasData) {
      const emptyHint = receipt.kind === 'weekly'
        ? '本周还没有可分享的使用记录'
        : '当天还没有可分享的使用记录';
      Alert.alert('暂无数据', emptyHint);
      return;
    }

    setSharing(true);
    try {
      const uri = await captureReceiptImage(receipt);
      try {
        await shareReceiptImageUri(uri, receipt);
      } catch (shareError) {
        const message = toError(shareError).message.toLowerCase();
        if (message.includes('cancel') || message.includes('dismiss')) {
          return;
        }
        throw shareError;
      }
    } catch (captureError) {
      console.warn('[ReceiptShare] image capture failed, fallback to text', captureError);
      try {
        await Share.share({
          message: formatShareReceiptText(receipt),
          title: getReceiptShareTitle(receipt),
        });
      } catch {
        // 用户取消分享
      }
    } finally {
      setCaptureReceipt(null);
      captureTaskRef.current = null;
      setSharing(false);
    }
  }, [captureReceiptImage]);

  const shareDaily = useCallback(async () => {
    const receipt = buildDailyReceipt(date, events, summary);
    await shareReceiptWithFallback(receipt);
  }, [date, events, shareReceiptWithFallback, summary]);

  const shareWeekly = useCallback(async () => {
    const weekMonday = getMondayOfWeek(date);
    const prevWeekMonday = addDays(weekMonday, -7);
    const weekDates = getWeekDatesMondayToSunday(weekMonday);
    const prevWeekDates = getWeekDatesMondayToSunday(prevWeekMonday);
    const fetchDates = [...new Set([...weekDates, ...prevWeekDates])];

    if (weekDates.some((weekDate) => isToday(weekDate))) {
      await ensureSynced();
    }

    const eventsMap = await getEventsForDates(fetchDates);
    const toPairs = (dates: string[]) =>
      dates.map((weekDate) => ({
        date: weekDate,
        events: eventsMap.get(weekDate) ?? [],
      }));

    const receipt = buildWeeklyReceipt(date, toPairs(weekDates), toPairs(prevWeekDates));
    await shareReceiptWithFallback(receipt);
  }, [date, shareReceiptWithFallback]);

  const handleShare = useCallback(() => {
    Alert.alert('分享小票', '选择要分享的范围', [
      { text: '今日小票', onPress: () => { shareDaily().catch(console.error); } },
      { text: '本周小票', onPress: () => { shareWeekly().catch(console.error); } },
      { text: '取消', style: 'cancel' },
    ]);
  }, [shareDaily, shareWeekly]);

  return (
    <>
      <Pressable
        style={({ pressed }) => [
          styles.button,
          (disabled || sharing) && styles.disabled,
          pressed && !disabled && !sharing && styles.pressed,
        ]}
        onPress={handleShare}
        disabled={disabled || sharing}
        hitSlop={8}
        accessibilityLabel="分享使用小票"
        accessibilityRole="button">
        {sharing ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Ionicons name="share-outline" size={20} color={colors.accent} />
        )}
      </Pressable>

      <Modal
        visible={captureReceipt !== null}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => clearCaptureTask(new Error('分享已取消'))}>
        <View style={styles.modalRoot} pointerEvents="none" collapsable={false}>
          <ViewShot
            ref={viewShotRef}
            style={styles.captureStage}
            options={RECEIPT_CAPTURE_OPTIONS}
            onLayout={handleCaptureLayout}>
            {captureReceipt ? <ReceiptShareCard receipt={captureReceipt} /> : null}
          </ViewShot>
        </View>
      </Modal>
    </>
  );
}
