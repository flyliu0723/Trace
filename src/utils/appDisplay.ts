/** 判断 appLabel 是否实为包名，需要重新解析 */
export function needsLabelResolve(appLabel?: string, packageName?: string): boolean {
  if (!packageName) {
    return false;
  }
  if (!appLabel || appLabel === packageName) {
    return true;
  }
  return /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i.test(appLabel);
}

export function getFallbackLabel(appLabel?: string, packageName?: string): string {
  return appLabel ?? packageName ?? '?';
}
