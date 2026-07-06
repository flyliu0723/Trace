/** 已知 Launcher / 系统桌面包名 */
const LAUNCHER_PACKAGES = new Set([
  'com.android.launcher',
  'com.android.launcher3',
  'com.google.android.apps.nexuslauncher',
  'com.miui.home',
  'com.mi.android.globallauncher',
  'com.oppo.launcher',
  'com.coloros.launcher',
  'com.realme.launcher',
  'com.bbk.launcher2',
  'com.huawei.android.launcher',
  'com.hihonor.android.launcher',
  'com.sec.android.app.launcher',
  'com.samsung.android.app.launcher',
  'com.meizu.flyme.launcher',
  'com.zui.launcher',
  'com.nothing.launcher',
]);

/** 桌面类应用标签关键词 */
const LAUNCHER_LABEL_KEYWORDS = [
  '系统桌面',
  '桌面',
  'launcher',
  'realme ui',
  '一加桌面',
  '华为桌面',
  '小米桌面',
  'oppo桌面',
  'vivo桌面',
  '三星桌面',
];

/** 判断是否为 Launcher / 系统桌面（切换中间态，非用户行为） */
export function isLauncherApp(packageName?: string, appLabel?: string): boolean {
  if (packageName) {
    if (LAUNCHER_PACKAGES.has(packageName)) {
      return true;
    }
    const lower = packageName.toLowerCase();
    if (lower.includes('launcher') || lower.endsWith('.home')) {
      return true;
    }
  }

  if (appLabel) {
    const normalized = appLabel.trim().toLowerCase();
    if (LAUNCHER_LABEL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      return true;
    }
  }

  return false;
}
