/** Screen Wake Lock glue (Safari 16.4+ browser / 18.4+ standalone). Best-effort:
 *  absent, rejected (low power), or released-again calls are silent no-ops. */

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface WakeLockLike {
  request: (type: "screen") => Promise<WakeLockSentinelLike>;
}

/** Acquire a screen wake lock; resolves a release function (always safe to call,
 *  repeatedly). Resolves to a no-op when unsupported or denied — never throws. */
export async function acquireScreenWakeLock(): Promise<() => void> {
  try {
    const nav = navigator as unknown as { wakeLock?: WakeLockLike };
    if (!nav.wakeLock) return noopRelease;
    const sentinel = await nav.wakeLock.request("screen");
    let released = false;
    return () => {
      if (released) return;
      released = true;
      void sentinel.release().catch(noop);
    };
  } catch {
    return noopRelease;
  }
}

function noop(): void {}

const noopRelease = (): void => {};
