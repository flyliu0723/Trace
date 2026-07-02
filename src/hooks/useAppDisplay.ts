import { useEffect, useState } from 'react';
import { loadAppDisplayInfo } from '../services/appInfoService';
import { getFallbackLabel } from '../utils/appDisplay';

export function useAppDisplay(packageName?: string, appLabel?: string) {
  const fallback = getFallbackLabel(appLabel, packageName);
  const [displayLabel, setDisplayLabel] = useState(fallback);
  const [iconUri, setIconUri] = useState<string | null>(null);

  useEffect(() => {
    if (!packageName) {
      setDisplayLabel(fallback);
      setIconUri(null);
      return;
    }

    let cancelled = false;
    setDisplayLabel(fallback);

    loadAppDisplayInfo(packageName, appLabel).then((info) => {
      if (!cancelled) {
        setDisplayLabel(info.displayLabel);
        setIconUri(info.iconUri);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [packageName, appLabel, fallback]);

  return { displayLabel, iconUri };
}
