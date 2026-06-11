import { useEffect } from "react";

// Keeps the screen awake while `active`. The OS releases the lock whenever the
// page loses visibility, so it is re-acquired on return; if the request is
// rejected (Low Power Mode, unsupported browser) the screen just sleeps normally.
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;

    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const acquired = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await acquired.release();
        } else {
          lock?.release();
          lock = acquired;
        }
      } catch {
        // degrade silently
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") acquire();
    }

    acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      lock?.release();
    };
  }, [active]);
}
