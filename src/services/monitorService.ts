import { PermissionsAndroid, Platform } from 'react-native';
import { BehaviorMonitor } from '../native/BehaviorMonitor';
import {
  fixMislabeledAppEvents,
  getLastEventTimestamp,
  getMislabeledPackageNames,
  getOpenMediaPackageNames,
  insertEvents,
} from '../db';
import { FIRST_INSTALL_RECONCILE_LOOKBACK_MS, RECONCILE_OVERLAP_MS } from '../constants';
import type { BehaviorEvent } from '../types/event';

async function repairMislabeledAppEvents(): Promise<number> {
  if (Platform.OS !== 'android') {
    return 0;
  }

  try {
    const packageNames = await getMislabeledPackageNames();
    if (packageNames.length === 0) {
      return 0;
    }

    const labelMap = await BehaviorMonitor.resolveAppLabels(packageNames);
    return fixMislabeledAppEvents(labelMap);
  } catch (error) {
    console.error('repairMislabeledAppEvents failed:', error);
    return 0;
  }
}

export async function startMonitoring(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  return BehaviorMonitor.startMonitor();
}

export async function stopMonitoring(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  return BehaviorMonitor.stopMonitor();
}

/** 对比 DB 中未闭合的媒体片段与当前实际播放状态，补全 media_stop */
async function reconcileOpenMediaFromDb(): Promise<BehaviorEvent[]> {
  if (Platform.OS !== 'android') {
    return [];
  }

  try {
    const [openPackages, playingNow] = await Promise.all([
      getOpenMediaPackageNames(),
      BehaviorMonitor.getActiveMediaPackages(),
    ]);
    const playingSet = new Set(playingNow);
    const now = Date.now();
    const events: BehaviorEvent[] = [];

    for (const packageName of openPackages) {
      if (playingSet.has(packageName)) {
        continue;
      }
      events.push({
        type: 'media_stop',
        timestamp: now,
        packageName,
        source: 'reconcile',
        metadata: { reconciled: 'db' },
      });
    }

    return events;
  } catch (error) {
    console.error('reconcileOpenMediaFromDb failed:', error);
    return [];
  }
}

/** 同步内存事件并执行 UsageStats 对账补全 */
export async function syncAndReconcileEvents(): Promise<{
  synced: number;
  reconciled: number;
  mediaReconciled: number;
  repaired: number;
  events: BehaviorEvent[];
}> {
  if (Platform.OS !== 'android') {
    return { synced: 0, reconciled: 0, mediaReconciled: 0, repaired: 0, events: [] };
  }

  const memoryEvents = await BehaviorMonitor.syncEvents();
  const synced = memoryEvents.length > 0 ? await insertEvents(memoryEvents) : 0;

  const lastTimestamp = await getLastEventTimestamp();
  const since =
    lastTimestamp > 0
      ? Math.max(0, lastTimestamp - RECONCILE_OVERLAP_MS)
      : Date.now() - FIRST_INSTALL_RECONCILE_LOOKBACK_MS;

  const reconciledEvents = await BehaviorMonitor.reconcileEvents(since);
  const reconciled = reconciledEvents.length > 0 ? await insertEvents(reconciledEvents) : 0;

  const nativeMediaEvents = await BehaviorMonitor.reconcileMediaState();
  const nativeStoppedPackages = new Set(
    nativeMediaEvents.filter((e) => e.type === 'media_stop' && e.packageName).map((e) => e.packageName!),
  );
  const nativeMediaInserted = nativeMediaEvents.length > 0 ? await insertEvents(nativeMediaEvents) : 0;

  const dbMediaEvents = (await reconcileOpenMediaFromDb()).filter(
    (event) => !event.packageName || !nativeStoppedPackages.has(event.packageName),
  );
  const dbMediaInserted = dbMediaEvents.length > 0 ? await insertEvents(dbMediaEvents) : 0;
  const mediaReconciled = nativeMediaInserted + dbMediaInserted;

  const repaired = await repairMislabeledAppEvents();

  return {
    synced,
    reconciled,
    mediaReconciled,
    repaired,
    events: [...memoryEvents, ...reconciledEvents, ...nativeMediaEvents, ...dbMediaEvents],
  };
}

/** @deprecated 请使用 syncAndReconcileEvents */
export async function syncNativeEvents(): Promise<BehaviorEvent[]> {
  const result = await syncAndReconcileEvents();
  return result.events;
}

export async function getPendingEventCount(): Promise<number> {
  if (Platform.OS !== 'android') {
    return 0;
  }
  return BehaviorMonitor.getPendingEventCount();
}

export async function getPersistedEventCount(): Promise<number> {
  if (Platform.OS !== 'android') {
    return 0;
  }
  return BehaviorMonitor.getPersistedEventCount();
}

/** 手动按天数回溯 UsageStats 对账 */
export async function manualReconcileEvents(lookbackDays: number): Promise<{
  reconciled: number;
  events: BehaviorEvent[];
}> {
  if (Platform.OS !== 'android') {
    return { reconciled: 0, events: [] };
  }

  const since = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const reconciledEvents = await BehaviorMonitor.reconcileEvents(since);
  const reconciled = reconciledEvents.length > 0 ? await insertEvents(reconciledEvents) : 0;
  return { reconciled, events: reconciledEvents };
}

export async function getMonitorStatus() {
  if (Platform.OS !== 'android') {
    return {
      isRunning: false,
      hasUsageAccess: false,
      hasNotificationPermission: false,
      hasNotificationListenerAccess: false,
      isIgnoringBatteryOptimizations: true,
      hasActivityRecognitionPermission: false,
      hasStepCounterSensor: false,
      isStepCounterActive: false,
      hasGooglePlayServices: false,
      manufacturer: '',
      romKeepAliveHint: '',
    };
  }
  return BehaviorMonitor.getMonitorStatus();
}

export async function requestPermissions(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await BehaviorMonitor.requestNotificationPermission();
  await BehaviorMonitor.requestUsageAccess();
}

export async function requestMediaPermissions(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await BehaviorMonitor.requestNotificationListenerAccess();
}

export async function requestBatteryOptimization(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }
  await BehaviorMonitor.requestBatteryOptimizationExemption();
}

export async function requestActivityRecognitionPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (typeof Platform.Version === 'number' && Platform.Version < 29) {
    await BehaviorMonitor.refreshContextSensors();
    return true;
  }

  const current = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
  );
  if (current) {
    await BehaviorMonitor.refreshContextSensors();
    return true;
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    {
      title: '身体活动权限',
      message: '用于检测行走时使用手机、躺卧使用手机等场景',
      buttonPositive: '允许',
      buttonNegative: '拒绝',
    },
  );

  const granted = result === PermissionsAndroid.RESULTS.GRANTED;
  if (granted) {
    await BehaviorMonitor.refreshContextSensors();
  }
  return granted;
}
