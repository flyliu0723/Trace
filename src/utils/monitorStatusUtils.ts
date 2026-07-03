import type { MonitorStatus } from '../native/BehaviorMonitor';

export interface PermissionItem {
  key: string;
  label: string;
  hint?: string;
  active: boolean;
  action: 'basic' | 'media' | 'activity' | 'battery' | 'none';
}

export function buildPermissionItems(status: MonitorStatus): PermissionItem[] {
  return [
    {
      key: 'usage',
      label: '使用情况访问',
      hint: '记录 App 打开、切换与使用时长',
      active: status.hasUsageAccess,
      action: 'basic',
    },
    {
      key: 'notification',
      label: '通知权限',
      hint: '感知通知到达与跳转行为',
      active: status.hasNotificationPermission,
      action: 'basic',
    },
    {
      key: 'media',
      label: '媒体被动听歌',
      hint: '仅用于区分锁屏时是否在听播客或音乐',
      active: status.hasNotificationListenerAccess,
      action: 'media',
    },
    {
      key: 'activity',
      label: '场景感知',
      hint: '检测行走、躺卧时使用手机等场景',
      active: status.hasActivityRecognitionPermission,
      action: 'activity',
    },
    {
      key: 'battery',
      label: '电池后台优化',
      hint: '避免系统在后台停止采集服务',
      active: status.isIgnoringBatteryOptimizations,
      action: 'battery',
    },
  ];
}

export function getMonitorHealth(status: MonitorStatus | null): 'ok' | 'paused' | 'incomplete' {
  if (!status) {
    return 'incomplete';
  }
  if (!status.isRunning) {
    return 'paused';
  }
  if (!status.hasUsageAccess) {
    return 'incomplete';
  }
  return 'ok';
}

export function getMonitorBannerKey(status: MonitorStatus | null): string | null {
  const health = getMonitorHealth(status);
  if (health === 'ok' || !status) {
    return null;
  }
  if (health === 'paused') {
    return 'paused';
  }
  const missing = buildPermissionItems(status)
    .filter((item) => !item.active)
    .map((item) => item.key)
    .sort()
    .join(',');
  return `incomplete:${missing}`;
}

export function getMonitorBannerMessage(status: MonitorStatus | null): string | null {
  const health = getMonitorHealth(status);
  if (health === 'ok') {
    return null;
  }
  if (health === 'paused') {
    return '轨迹记录已暂停，轻触以继续捕捉';
  }
  return '开启轨迹记录，捕捉今天的注意力印迹';
}

export function countMissingPermissions(status: MonitorStatus): number {
  return buildPermissionItems(status).filter((item) => !item.active).length;
}
