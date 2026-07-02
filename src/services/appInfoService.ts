import { Platform } from 'react-native';
import { BehaviorMonitor } from '../native/BehaviorMonitor';
import { getFallbackLabel, needsLabelResolve } from '../utils/appDisplay';

const labelCache = new Map<string, string>();
const iconCache = new Map<string, string | null>();
const labelBatchQueue = new Set<string>();
let labelBatchTimer: ReturnType<typeof setTimeout> | null = null;
let labelBatchPromise: Promise<void> | null = null;
let labelBatchResolvers: Array<() => void> = [];

function scheduleLabelBatch(): Promise<void> {
  if (Platform.OS !== 'android') {
    return Promise.resolve();
  }

  if (labelBatchPromise) {
    return labelBatchPromise;
  }

  labelBatchPromise = new Promise((resolve) => {
    labelBatchResolvers.push(resolve);

    if (labelBatchTimer) {
      return;
    }

    labelBatchTimer = setTimeout(async () => {
      const packages = Array.from(labelBatchQueue);
      labelBatchQueue.clear();
      labelBatchTimer = null;

      try {
        if (packages.length > 0) {
          const labels = await BehaviorMonitor.resolveAppLabels(packages);
          for (const pkg of packages) {
            labelCache.set(pkg, labels[pkg] ?? pkg);
          }
        }
      } catch (error) {
        console.error('resolveAppLabels failed:', error);
        for (const pkg of packages) {
          if (!labelCache.has(pkg)) {
            labelCache.set(pkg, pkg);
          }
        }
      } finally {
        const resolvers = labelBatchResolvers;
        labelBatchResolvers = [];
        labelBatchPromise = null;
        resolvers.forEach((done) => done());
      }
    }, 16);
  });

  return labelBatchPromise;
}

export async function resolveAppLabel(
  packageName: string,
  currentLabel?: string,
): Promise<string> {
  if (!needsLabelResolve(currentLabel, packageName)) {
    return currentLabel as string;
  }

  const cached = labelCache.get(packageName);
  if (cached) {
    return cached;
  }

  if (Platform.OS !== 'android') {
    return getFallbackLabel(currentLabel, packageName);
  }

  labelBatchQueue.add(packageName);
  await scheduleLabelBatch();
  return labelCache.get(packageName) ?? getFallbackLabel(currentLabel, packageName);
}

export async function resolveAppLabels(
  entries: Array<{ packageName: string; appLabel?: string }>,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (const entry of entries) {
    if (!needsLabelResolve(entry.appLabel, entry.packageName)) {
      result.set(entry.packageName, entry.appLabel as string);
      continue;
    }
    result.set(entry.packageName, await resolveAppLabel(entry.packageName, entry.appLabel));
  }

  return result;
}

const iconBatchQueue = new Set<string>();
let iconBatchTimer: ReturnType<typeof setTimeout> | null = null;
let iconBatchPromise: Promise<void> | null = null;
let iconBatchResolvers: Array<() => void> = [];

function scheduleIconBatch(): Promise<void> {
  if (Platform.OS !== 'android') {
    return Promise.resolve();
  }

  if (iconBatchPromise) {
    return iconBatchPromise;
  }

  iconBatchPromise = new Promise((resolve) => {
    iconBatchResolvers.push(resolve);

    if (iconBatchTimer) {
      return;
    }

    iconBatchTimer = setTimeout(async () => {
      const packages = Array.from(iconBatchQueue);
      iconBatchQueue.clear();
      iconBatchTimer = null;

      try {
        if (packages.length > 0) {
          const icons = await BehaviorMonitor.getAppIcons(packages);
          for (const pkg of packages) {
            iconCache.set(pkg, icons[pkg] ?? null);
          }
        }
      } catch (error) {
        console.error('getAppIcons failed:', error);
        for (const pkg of packages) {
          if (!iconCache.has(pkg)) {
            iconCache.set(pkg, null);
          }
        }
      } finally {
        const resolvers = iconBatchResolvers;
        iconBatchResolvers = [];
        iconBatchPromise = null;
        resolvers.forEach((done) => done());
      }
    }, 16);
  });

  return iconBatchPromise;
}

export async function getAppIconUri(packageName: string): Promise<string | null> {
  if (iconCache.has(packageName)) {
    return iconCache.get(packageName) ?? null;
  }

  if (Platform.OS !== 'android') {
    return null;
  }

  iconBatchQueue.add(packageName);
  await scheduleIconBatch();
  return iconCache.get(packageName) ?? null;
}

export async function loadAppDisplayInfo(
  packageName?: string,
  appLabel?: string,
): Promise<{ displayLabel: string; iconUri: string | null }> {
  if (!packageName) {
    return { displayLabel: getFallbackLabel(appLabel), iconUri: null };
  }

  const [displayLabel, iconUri] = await Promise.all([
    resolveAppLabel(packageName, appLabel),
    getAppIconUri(packageName),
  ]);

  return { displayLabel, iconUri };
}
