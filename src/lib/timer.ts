/** Rest timer: countdown with presets, WebAudio beep (no audio file), guarded vibrate. */
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

export function createRestTimer(opts: {
  onTick: (remaining: number) => void;
  onDone: () => void;
  soundOn?: boolean;
}): RestTimer {
  let remaining = 0;
  let total = 0;
  let running = false;
  let iv: number | null = null;
  let ctx: AudioContext | null = null;

  function beep(): void {
    if (opts.soundOn === false) return;
    try {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      ctx ??= new AC();
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
      /* audio is best-effort */
    }
    try {
      if (navigator.vibrate) navigator.vibrate(200);
    } catch {
      /* ignore */
    }
  }

  const timer: RestTimer = {
    get remaining() {
      return remaining;
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
      total = seconds;
      remaining = seconds;
      running = true;
      if (iv !== null) window.clearInterval(iv);
      opts.onTick(remaining);
      iv = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          remaining = 0;
          running = false;
          if (iv !== null) window.clearInterval(iv);
          iv = null;
          opts.onTick(0);
          beep();
          opts.onDone();
        } else {
          opts.onTick(remaining);
        }
      }, 1000);
    },
    stop() {
      running = false;
      if (iv !== null) window.clearInterval(iv);
      iv = null;
    },
    adjust(delta) {
      remaining = Math.max(0, remaining + delta);
      total = Math.max(total, remaining);
      opts.onTick(remaining);
    },
    dispose() {
      if (iv !== null) window.clearInterval(iv);
      iv = null;
      try {
        void ctx?.close();
      } catch {
        /* ignore */
      }
      ctx = null;
    },
  };
  return timer;
}

export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
