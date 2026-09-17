// @vitest-environment jsdom
/** Rest-timer vectors: deadline math, single-tick-per-second, triple-beep,
 *  title save/flash/restore, audio-unlock best-effort, adjust/stop (spec §7). */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createRestTimer,
  ensureAudio,
  formatCountdown,
  restoreTitle,
} from "../../src/lib/timer.ts";
import { renderRestTimer } from "../../src/components/restTimer.ts";
import { acquireScreenWakeLock } from "../../src/lib/wakeLock.ts";

/** Minimal AudioContext stand-in; tracks beeps via oscillatorCalls. */
class MockAudioContext {
  static instances: MockAudioContext[] = [];
  state: "suspended" | "running" = "running";
  resumeCalls = 0;
  oscillatorCalls = 0;
  destination: object = {};
  currentTime = 0;
  constructor() {
    MockAudioContext.instances.push(this);
  }
  resume(): Promise<void> {
    this.resumeCalls++;
    this.state = "running";
    return Promise.resolve();
  }
  createOscillator(): {
    connect: () => void;
    frequency: { value: number };
    start: () => void;
    stop: () => void;
  } {
    this.oscillatorCalls++;
    return {
      connect: () => {},
      frequency: { value: 0 },
      start: () => {},
      stop: () => {},
    };
  }
  createGain(): {
    connect: () => void;
    gain: {
      setValueAtTime: () => void;
      exponentialRampToValueAtTime: () => void;
    };
  } {
    return {
      connect: () => {},
      gain: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
      },
    };
  }
}

function installMockAudio(): void {
  (window as unknown as { AudioContext: unknown }).AudioContext =
    MockAudioContext;
}

function lastMock(): MockAudioContext {
  const inst = MockAudioContext.instances[MockAudioContext.instances.length - 1];
  if (!inst) throw new Error("no MockAudioContext instance");
  return inst;
}

beforeEach(() => {
  vi.useFakeTimers();
  document.title = "Lift Log";
  restoreTitle();
  document.title = "Lift Log";
});

afterEach(() => {
  restoreTitle();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("no-audio best-effort (must run before any ensureAudio call)", () => {
  it("start/expiry/dispose never throw with no AudioContext and no gesture", () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    const ticks: number[] = [];
    let done = 0;
    const timer = createRestTimer({
      onTick: (r) => ticks.push(r),
      onDone: () => done++,
    });
    expect(() => {
      timer.start(2);
      vi.advanceTimersByTime(2500);
      timer.stop();
      timer.dispose();
    }).not.toThrow();
    expect(done).toBe(1);
    expect(ticks[ticks.length - 1]).toBe(0);
  });
});

describe("deadline math + tick granularity", () => {
  it("background-throttle jump: +60 s wall clock drops remaining by 60", () => {
    installMockAudio();
    const ticks: number[] = [];
    const timer = createRestTimer({
      onTick: (r) => ticks.push(r),
      onDone: () => {},
    });
    timer.start(90);
    expect(timer.remaining).toBe(90);
    const t0 = Date.now();
    vi.setSystemTime(t0 + 60_000);
    vi.advanceTimersByTime(300); // let one 250 ms tick fire with the new clock
    expect(timer.remaining).toBe(30);
    expect(ticks[ticks.length - 1]).toBe(30);
    timer.dispose();
  });

  it("emits onTick exactly once per displayed second", () => {
    installMockAudio();
    const ticks: number[] = [];
    const timer = createRestTimer({
      onTick: (r) => ticks.push(r),
      onDone: () => {},
    });
    timer.start(3);
    vi.advanceTimersByTime(3500);
    expect(ticks).toEqual([3, 2, 1, 0]);
    timer.dispose();
  });

  it("adjust(±15) moves the deadline; stop() halts and restores title", () => {
    installMockAudio();
    const timer = createRestTimer({ onTick: () => {}, onDone: () => {} });
    timer.start(90);
    expect(timer.remaining).toBe(90);
    timer.adjust(-15);
    expect(timer.remaining).toBe(75);
    timer.adjust(15);
    expect(timer.remaining).toBe(90);
    timer.stop();
    expect(timer.running).toBe(false);
    expect(document.title).toBe("Lift Log");
    timer.dispose();
  });
});

describe("triple-beep + title lifecycle", () => {
  it("expiry fires 3 beeps at 0/300/600 ms with a running context", () => {
    installMockAudio();
    ensureAudio();
    const ctx = lastMock();
    ctx.state = "running";
    const before = ctx.oscillatorCalls;
    let done = 0;
    const timer = createRestTimer({
      onTick: () => {},
      onDone: () => done++,
    });
    timer.start(1);
    vi.advanceTimersByTime(1000); // reach expiry
    expect(done).toBe(1);
    vi.advanceTimersByTime(700); // fire the 0/300/600 ms beep timeouts
    expect(ctx.oscillatorCalls - before).toBe(3);
    timer.dispose();
  });

  it("soundOn:false silences beeps but keeps the done callback + title flash", () => {
    installMockAudio();
    ensureAudio();
    const ctx = lastMock();
    ctx.state = "running";
    const before = ctx.oscillatorCalls;
    let done = 0;
    const timer = createRestTimer({
      onTick: () => {},
      onDone: () => done++,
      soundOn: false,
    });
    document.title = "Lift Log";
    timer.start(1);
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(700);
    expect(done).toBe(1);
    expect(ctx.oscillatorCalls - before).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(document.title).toBe("Rest done — go!");
    timer.dispose();
  });

  it("title counts down, flashes until stop(), restores the original", () => {
    installMockAudio();
    const timer = createRestTimer({ onTick: () => {}, onDone: () => {} });
    document.title = "Lift Log";
    timer.start(65);
    expect(document.title).toBe(`${formatCountdown(65)} · Rest`);
    vi.advanceTimersByTime(65_000); // expire
    vi.advanceTimersByTime(1000); // first flash tick
    expect(document.title).toBe("Rest done — go!");
    vi.advanceTimersByTime(1000); // flash back
    expect(document.title).toBe("Lift Log");
    timer.stop(); // acknowledge
    expect(document.title).toBe("Lift Log");
    vi.advanceTimersByTime(5000); // no further flashing after ack
    expect(document.title).toBe("Lift Log");
    timer.dispose();
  });

  it("starting during a flash re-saves the base title (no flash-text leak)", () => {
    installMockAudio();
    const timer = createRestTimer({ onTick: () => {}, onDone: () => {} });
    document.title = "Lift Log";
    timer.start(1);
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(1000); // flashing "Rest done — go!"
    expect(document.title).toBe("Rest done — go!");
    timer.start(60); // acknowledge + restart
    expect(document.title).toBe(`${formatCountdown(60)} · Rest`);
    timer.stop();
    expect(document.title).toBe("Lift Log");
    timer.dispose();
  });
});

describe("audio unlock", () => {
  it("ensureAudio resumes a suspended context (simulated gesture) without throwing", () => {
    installMockAudio();
    expect(() => ensureAudio()).not.toThrow();
    const ctx = lastMock();
    ctx.state = "suspended";
    const before = ctx.resumeCalls;
    expect(() => ensureAudio()).not.toThrow();
    expect(ctx.resumeCalls).toBeGreaterThan(before);
  });
});

describe("wake lock glue", () => {
  it("absent API resolves a safe no-op release", async () => {
    const nav = navigator as unknown as { wakeLock?: unknown };
    const saved = nav.wakeLock;
    delete nav.wakeLock;
    try {
      const release = await acquireScreenWakeLock();
      expect(() => release()).not.toThrow();
      expect(() => release()).not.toThrow(); // repeat release is safe
    } finally {
      if (saved !== undefined) nav.wakeLock = saved;
    }
  });

  it("rejection resolves silently to a no-op (low-power / unsupported)", async () => {
    const nav = navigator as unknown as {
      wakeLock?: { request: () => Promise<never> };
    };
    const saved = nav.wakeLock;
    nav.wakeLock = { request: () => Promise.reject(new Error("denied")) };
    try {
      const release = await acquireScreenWakeLock();
      expect(() => release()).not.toThrow();
    } finally {
      if (saved !== undefined) nav.wakeLock = saved;
      else delete nav.wakeLock;
    }
  });

  it("rest card re-requests the lock on visible + running, not when hidden", async () => {
    const request = vi.fn(() =>
      Promise.resolve({ release: () => Promise.resolve() }),
    );
    const nav = navigator as unknown as {
      wakeLock?: { request: () => Promise<{ release: () => Promise<void> }> };
    };
    const savedLock = nav.wakeLock;
    nav.wakeLock = { request };
    const savedVisibility = document.visibilityState;
    const setVisibility = (state: DocumentVisibilityState): void => {
      Object.defineProperty(document, "visibilityState", {
        value: state,
        configurable: true,
      });
    };
    try {
      const handle = renderRestTimer(90, () => {});
      document.body.appendChild(handle.element);
      handle.start(60);
      await vi.advanceTimersByTimeAsync(1); // flush the async lock acquire
      expect(request).toHaveBeenCalledTimes(1);
      setVisibility("visible");
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(1);
      expect(request).toHaveBeenCalledTimes(2);
      setVisibility("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(1);
      expect(request).toHaveBeenCalledTimes(2);
      handle.stop();
    } finally {
      setVisibility(savedVisibility);
      if (savedLock !== undefined) nav.wakeLock = savedLock;
      else delete nav.wakeLock;
      document.body.replaceChildren();
    }
  });
});
