import { useCallback, useEffect, useState } from 'react';
import { APP_VERSION } from '~/constants/app-version';

const APP_VERSION_STORAGE_KEY = 'app-version';

export function useNewVersionNudge() {
  const [newVersionNudgeActive, setNewVersionNudgeActive] = useState(false);

  useEffect(() => {
    const storedVersion = localStorage.getItem(APP_VERSION_STORAGE_KEY);

    const firstTimeVisitorOrStoredVersionIsFresh =
      !storedVersion || storedVersion === APP_VERSION;

    if (firstTimeVisitorOrStoredVersionIsFresh) {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
      return;
    }

    setNewVersionNudgeActive(true);
  }, []);

  const dismissNudge = useCallback(() => {
    localStorage.setItem(APP_VERSION_STORAGE_KEY, APP_VERSION);
    setNewVersionNudgeActive(false);
  }, []);

  return { newVersionNudgeActive, dismissNudge };
}
