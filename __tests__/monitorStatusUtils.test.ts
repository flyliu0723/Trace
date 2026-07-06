import type { MonitorStatus } from '../src/native/BehaviorMonitor';
import {
  buildPermissionItems,
  countMissingEnhancedPermissions,
  getMonitorBannerMessage,
  getMonitorHealth,
  shouldShowRomKeepAliveHint,
} from '../src/utils/monitorStatusUtils';

function makeStatus(overrides: Partial<MonitorStatus> = {}): MonitorStatus {
  return {
    isRunning: true,
    hasUsageAccess: true,
    hasNotificationPermission: true,
    hasNotificationListenerAccess: true,
    isIgnoringBatteryOptimizations: true,
    hasActivityRecognitionPermission: true,
    hasStepCounterSensor: true,
    isStepCounterActive: true,
    hasGooglePlayServices: false,
    manufacturer: 'xiaomi',
    romKeepAliveHint: '请在小米管家中将本应用设为无限制后台',
    ...overrides,
  };
}

describe('monitorStatusUtils', () => {
  it('核心权限齐全但增强权限缺失时返回 partial', () => {
    const status = makeStatus({
      hasNotificationListenerAccess: false,
      isIgnoringBatteryOptimizations: false,
    });
    expect(getMonitorHealth(status)).toBe('partial');
    expect(countMissingEnhancedPermissions(status)).toBe(2);
  });

  it('服务未运行时返回 paused', () => {
    expect(getMonitorHealth(makeStatus({ isRunning: false }))).toBe('paused');
  });

  it('缺少使用情况访问时返回 incomplete', () => {
    expect(getMonitorHealth(makeStatus({ hasUsageAccess: false }))).toBe('incomplete');
  });

  it('全部权限就绪时返回 ok', () => {
    expect(getMonitorHealth(makeStatus())).toBe('ok');
  });

  it('partial 状态展示增强权限提示', () => {
    const status = makeStatus({ hasNotificationListenerAccess: false });
    expect(getMonitorBannerMessage(status)).toContain('增强权限');
  });

  it('通知权限文案描述后台服务通知', () => {
    const notification = buildPermissionItems(makeStatus()).find((item) => item.key === 'notification');
    expect(notification?.hint).toContain('后台采集服务通知');
  });

  it('未豁免电池优化且有机型提示时展示保活建议', () => {
    const status = makeStatus({ isIgnoringBatteryOptimizations: false });
    expect(shouldShowRomKeepAliveHint(status)).toBe(true);
  });

  it('已豁免电池优化时不展示保活建议', () => {
    expect(shouldShowRomKeepAliveHint(makeStatus())).toBe(false);
  });
});
