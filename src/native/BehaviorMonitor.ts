import { NativeModules, Platform } from 'react-native';
import type { BehaviorEvent } from '../types/event';

export interface MonitorStatus {
  isRunning: boolean;
  hasUsageAccess: boolean;
  hasNotificationPermission: boolean;
  hasNotificationListenerAccess: boolean;
  isIgnoringBatteryOptimizations: boolean;
  hasActivityRecognitionPermission: boolean;
  manufacturer: string;
  romKeepAliveHint: string;
}

export interface BehaviorMonitorNative {
  startMonitor(): Promise<boolean>;
  stopMonitor(): Promise<boolean>;
  getMonitorStatus(): Promise<MonitorStatus>;
  requestUsageAccess(): Promise<void>;
  requestNotificationPermission(): Promise<void>;
  requestNotificationListenerAccess(): Promise<void>;
  requestBatteryOptimizationExemption(): Promise<void>;
  refreshContextSensors(): Promise<boolean>;
  syncEvents(): Promise<BehaviorEvent[]>;
  reconcileEvents(sinceTimestamp: number): Promise<BehaviorEvent[]>;
  reconcileMediaState(): Promise<BehaviorEvent[]>;
  getActiveMediaPackages(): Promise<string[]>;
  resolveAppLabels(packageNames: string[]): Promise<Record<string, string>>;
  getAppIcons(packageNames: string[]): Promise<Record<string, string>>;
}

const LINKING_ERROR =
  "BehaviorMonitor 原生模块未链接。请确认 Android 工程已正确配置。";

const BehaviorMonitorModule: BehaviorMonitorNative =
  NativeModules.BehaviorMonitor ??
  new Proxy(
    {},
    {
      get() {
        if (Platform.OS !== 'android') {
          return () => Promise.resolve(Platform.OS === 'ios' ? false : []);
        }
        throw new Error(LINKING_ERROR);
      },
    },
  );

export const BehaviorMonitor = BehaviorMonitorModule;
