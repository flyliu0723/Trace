import { useCallback, useEffect, useState } from 'react';
import {
  getCredibilityBannerKey,
  getCredibilityBannerMessage,
  type DayCredibility,
} from '../analysis/usageCredibilityAnalyzer';
import { getMonitorBannerDismissKey, setMonitorBannerDismissKey } from '../db';
import type { MonitorStatus } from '../native/BehaviorMonitor';
import { getMonitorBannerKey, getMonitorBannerMessage } from '../utils/monitorStatusUtils';

export type HomeBannerType = 'monitor' | 'credibility' | null;

export function useHomeBanner(
  monitorStatus: MonitorStatus | null,
  credibility: DayCredibility | null,
  enableCredibility: boolean,
) {
  const [monitorDismissed, setMonitorDismissed] = useState(true);
  const [credDismissed, setCredDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  const monitorKey = getMonitorBannerKey(monitorStatus);
  const monitorMessage = getMonitorBannerMessage(monitorStatus);
  const credKey = enableCredibility ? getCredibilityBannerKey(credibility) : null;
  const credMessage = enableCredibility ? getCredibilityBannerMessage(credibility) : null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getMonitorBannerDismissKey();
      if (cancelled) {
        return;
      }
      setMonitorDismissed(monitorKey ? stored === monitorKey : true);
      setCredDismissed(credKey ? stored === credKey : true);
      setReady(true);
    })().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [monitorKey, credKey]);

  const dismiss = useCallback(async () => {
    const activeKey = monitorKey && !monitorDismissed ? monitorKey : credKey;
    if (!activeKey) {
      return;
    }
    if (monitorKey && !monitorDismissed) {
      setMonitorDismissed(true);
    } else {
      setCredDismissed(true);
    }
    await setMonitorBannerDismissKey(activeKey);
  }, [monitorKey, credKey, monitorDismissed]);

  const monitorVisible = ready && !!monitorMessage && !monitorDismissed;
  const credVisible = ready && !!credMessage && !credDismissed && !monitorVisible;

  if (monitorVisible) {
    return {
      visible: true,
      message: monitorMessage!,
      type: 'monitor' as const,
      dismiss,
    };
  }

  if (credVisible) {
    return {
      visible: true,
      message: credMessage!,
      type: 'credibility' as const,
      dismiss,
    };
  }

  return {
    visible: false,
    message: null,
    type: null,
    dismiss,
  };
}
