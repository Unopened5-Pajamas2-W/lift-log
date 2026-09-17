/** Rest timer: deadline-derived countdown, gesture-unlocked WebAudio triple-beep,
 *  document.title countdown/flash. All channels best-effort, zero dependencies. */
export interface RestTimer {
  remaining: number;
  total: number;
  running: boolean;
  start: (seconds?: number) => void;
  stop: () => void;
  adjust: (delta: number) => void;
  onTick: (remaining: number) => void;
  onDone: () => void;
  dispose: () => void;
}

const TICK_MS = 250;
const BEEP_DELAYS_MS = [0, 300, 600];

/** Shared, app-lifetime AudioContext (iOS caps concurrent contexts; reuse one). */
let audioCtx: AudioContext | null = null;

/** Create/resume the shared AudioContext. Call from a user-gesture handler:
 *  iOS autoplay policy only unlocks audio inside the gesture's call stack. */
export function ensureAudio(): void {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    audioCtx ??= new AC();
    if (audioCtx.state === "suspended") void audioCtx.resume().catch(noop);
  } catch {
    /* best-effort: ringer-silent / private mode / unsupported */
  }
}

function noop(): void {}

function playBeepOnce(ctx: AudioContext): void {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    /* best-effort */
  }
}

let savedTitle: string | null = null;
let flashIv: number | null = null;
let flashOn = false;

function setTitle(text: string): void {
  try {
    document.title = text;
  } catch {
    /* best-effort (no document in some contexts) */
  }
}

/** Restore the pre-timer document title and stop flashing. Idempotent. */
export function restoreTitle(): void {
  if (flashIv !== null) {
    window.clearInterval(flashIv);
    flashIv = null;
  }
  if (savedTitle !== null) {
    setTitle(savedTitle);
    savedTitle = null;
  }
}

function flashTitleDone(): void {
  if (flashIv !== null) return;
  flashOn = false;
  flashIv = window.setInterval(() => {
    flashOn = !flashOn;
    setTitle(flashOn ? "Rest done — go!" : (savedTitle ?? "Lift Log"));
  }, 1000);
}

export function createRestTimer(opts: {
  onTick: (remaining: number) => void;
  onDone: () => void;
  soundOn?: boolean;
}): RestTimer {
  let endAt = 0;
  let total = 0;
  let running = false;
  let lastSecond = -1;
  let iv: number | null = null;
  let beepTimeouts: number[] = [];

  function tripleBeep(): void {
    if (opts.soundOn === false) return;
    const ctx = audioCtx;
    if (!ctx) return;
    const play = (): void => {
      beepTimeouts = BEEP_DELAYS_MS.map((delay) =>
        window.setTimeout(() => playBeepOnce(ctx), delay),
      );
    };
    try {
      if (ctx.state === "suspended") void ctx.resume().then(play, noop);
      else play();
    } catch {
      /* best-effort */
    }
  }

  function remainingNow(): number {
    return Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
  }

  function tick(): void {
    const remaining = remainingNow();
    if (remaining === lastSecond) return;
    lastSecond = remaining;
    if (remaining > 0) {
      opts.onTick(remaining);
      setTitle(`${formatCountdown(remaining)} · Rest`);
      return;
    }
    running = false;
    if (iv !== null) window.clearInterval(iv);
    iv = null;
    opts.onTick(0);
    tripleBeep();
    flashTitleDone();
    opts.onDone();
  }

  const timer: RestTimer = {
    get remaining() {
      return remainingNow();
    },
    get total() {
      return total;
    },
    get running() {
      return running;
    },
    onTick: opts.onTick,
    onDone: opts.onDone,
    start(seconds = 90) {
      // Acknowledge any prior flash, then (re)save the base title before the
      // countdown overwrites it: a start during a flash would otherwise save
      // the flash text as the "original" title.
      restoreTitle();
      savedTitle = document.title;
      total = seconds;
      endAt = Date.now() + seconds * 1000;
      running = true;
      lastSecond = -1;
      if (iv !== null) window.clearInterval(iv);
      iv = window.setInterval(tick, TICK_MS);
      tick();
    },
    stop() {
      running = false;
      if (iv !== null) window.clearInterval(iv);
      iv = null;
      restoreTitle();
    },
    adjust(delta) {
      endAt = Math.max(Date.now(), endAt + delta * 1000);
      const remaining = remainingNow();
      total = Math.max(total, remaining);
      lastSecond = -1; // force re-emit so the label reflects the adjustment
      if (iv !== null) tick();
      else opts.onTick(remaining);
    },
    dispose() {
      this.stop();
      for (const t of beepTimeouts) window.clearTimeout(t);
      beepTimeouts = [];
      // The AudioContext is shared and app-lifetime: never close it here.
    },
  };
  return timer;
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
