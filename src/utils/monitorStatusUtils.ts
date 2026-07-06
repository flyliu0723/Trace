import type { MonitorStatus } from '../native/BehaviorMonitor';

export type MonitorHealth = 'ok' | 'partial' | 'paused' | 'incomplete';

export type PermissionTier = 'core' | 'enhanced';

export interface PermissionItem {
  key: string;
  label: string;
  hint?: string;
  active: boolean;
  tier: PermissionTier;
  action: 'basic' | 'media' | 'activity' | 'battery' | 'none';
}

const CORE_KEYS = new Set(['usage']);
const ENHANCED_KEYS = new Set(['notification', 'media', 'activity', 'battery']);

export function buildPermissionItems(status: MonitorStatus): PermissionItem[] {
  return [
    {
      key: 'usage',
      label: '使用情况访问',
      hint: '记录 App 打开、切换与使用时长（必需）',
      active: status.hasUsageAccess,
      tier: 'core',
      action: 'basic',
    },
    {
      key: 'notification',
      label: '通知权限',
      hint: '用于显示后台采集服务通知，避免系统回收进程',
      active: status.hasNotificationPermission,
      tier: 'enhanced',
      action: 'basic',
    },
    {
      key: 'media',
      label: '媒体被动听歌',
      hint: '通过通知监听感知锁屏播客/音乐播放状态',
      active: status.hasNotificationListenerAccess,
      tier: 'enhanced',
      action: 'media',
    },
    {
      key: 'activity',
      label: '场景感知',
      hint: buildActivityPermissionHint(status),
      active: status.hasActivityRecognitionPermission,
      tier: 'enhanced',
      action: 'activity',
    },
    {
      key: 'battery',
      label: '电池后台优化',
      hint: '避免系统在后台停止采集服务',
      active: status.isIgnoringBatteryOptimizations,
      tier: 'enhanced',
      action: 'battery',
    },
  ];
}

export function getMonitorHealth(status: MonitorStatus | null): MonitorHealth {
  if (!status) {
    return 'incomplete';
  }
  if (!status.isRunning) {
    return 'paused';
  }
  if (!status.hasUsageAccess) {
    return 'incomplete';
  }
  if (countMissingEnhancedPermissions(status) > 0) {
    return 'partial';
  }
  return 'ok';
}

export function isCoreReady(status: MonitorStatus): boolean {
  return status.isRunning && status.hasUsageAccess;
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
  return `${health}:${missing}`;
}

export function getMonitorBannerMessage(status: MonitorStatus | null): string | null {
  const health = getMonitorHealth(status);
  if (health === 'ok') {
    return null;
  }
  if (health === 'paused') {
    return '轨迹记录已暂停，轻触以继续捕捉';
  }
  if (health === 'partial') {
    const missing = countMissingEnhancedPermissions(status!);
    return `基础采集正常，还有 ${missing} 项增强权限可提升数据完整度`;
  }
  return '开启轨迹记录，捕捉今天的注意力印迹';
}

export function countMissingPermissions(status: MonitorStatus): number {
  return buildPermissionItems(status).filter((item) => !item.active).length;
}

export function countMissingCorePermissions(status: MonitorStatus): number {
  return buildPermissionItems(status).filter((item) => item.tier === 'core' && !item.active)
    .length;
}

export function countMissingEnhancedPermissions(status: MonitorStatus): number {
  return buildPermissionItems(status).filter((item) => item.tier === 'enhanced' && !item.active)
    .length;
}

export function shouldShowRomKeepAliveHint(status: MonitorStatus): boolean {
  return (
    status.romKeepAliveHint.length > 0 &&
    !status.isIgnoringBatteryOptimizations &&
    status.isRunning
  );
}

export function getHealthSummary(status: MonitorStatus): string {
  const health = getMonitorHealth(status);
  if (health === 'ok') {
    return '全部权限就绪，数据采集中';
  }
  if (health === 'partial') {
    return `基础采集正常，${countMissingEnhancedPermissions(status)} 项增强权限待开启`;
  }
  if (health === 'paused') {
    return '采集已暂停';
  }
  return `缺少 ${countMissingCorePermissions(status)} 项核心权限`;
}

function buildActivityPermissionHint(status: MonitorStatus): string {
  if (!status.hasActivityRecognitionPermission) {
    return '授权后通过计步传感器推断步行，不依赖 Google 服务';
  }

  const channels: string[] = [];
  if (status.isStepCounterActive) {
    channels.push('计步检测运行中');
  } else if (status.hasStepCounterSensor) {
    channels.push('计步传感器可用');
  } else {
    channels.push('本机无计步传感器');
  }

  if (status.hasGooglePlayServices) {
    channels.push('Google 活动识别');
  } else {
    channels.push('无 Google 服务，步行靠计步');
  }

  return channels.join(' · ');
}

export { CORE_KEYS, ENHANCED_KEYS };
