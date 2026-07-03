import { useCallback, useEffect, useState } from 'react';
import { getMonitorBannerDismissKey, setMonitorBannerDismissKey } from '../db';
import type { MonitorStatus } from '../native/BehaviorMonitor';
import { getMonitorBannerKey, getMonitorBannerMessage } from '../utils/monitorStatusUtils';

export function useMonitorBanner(status: MonitorStatus | null) {
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  const bannerKey = getMonitorBannerKey(status);
  const message = getMonitorBannerMessage(status);
  const visible = ready && !!message && !dismissed;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bannerKey) {
        if (!cancelled) {
          setDismissed(true);
          setReady(true);
        }
        return;
      }
      const stored = await getMonitorBannerDismissKey();
      if (!cancelled) {
        setDismissed(stored === bannerKey);
        setReady(true);
      }
    })().catch(console.error);
    return () => {
      cancelled = true;
    };
  }, [bannerKey]);

  const dismiss = useCallback(async () => {
    if (!bannerKey) {
      return;
    }
    setDismissed(true);
    await setMonitorBannerDismissKey(bannerKey);
  }, [bannerKey]);

  return { visible, message, dismiss };
}
