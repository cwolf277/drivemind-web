import { useEffect, useRef } from 'react';

export function useWakeLock(active) {
  const lockRef = useRef(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return undefined;
    }

    let cancelled = false;

    const release = () => {
      const lock = lockRef.current;
      lockRef.current = null;
      if (lock) {
        lock.release().catch(() => {});
      }
    };

    if (!active) {
      release();
      return undefined;
    }

    const acquire = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        lockRef.current = lock;
        lock.addEventListener('release', () => {
          if (lockRef.current === lock) lockRef.current = null;
        });
      } catch (err) {
        console.warn('wakeLock failed', err);
      }
    };

    acquire();

    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !lockRef.current && !cancelled) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
  }, [active]);
}
