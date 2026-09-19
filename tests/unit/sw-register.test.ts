// @vitest-environment jsdom
/** Vectors for the manual-only PWA update flow: registration must never
 *  trigger an update check, checks run only on demand, and a ready update
 *  applies only via an explicit tap — never mid-workout. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterSWOptions } from "virtual:pwa-register";
import {
  applyAppUpdate,
  checkForAppUpdate,
  isAppUpdateReady,
  registerServiceWorker,
  resetAppUpdateStateForTests,
} from "../../src/sw-register.ts";

const { registerSWMock } = vi.hoisted(() => ({
  registerSWMock: vi.fn(
    (_options?: RegisterSWOptions): ((reloadPage?: boolean) => Promise<void>) =>
      () => Promise.resolve(),
  ),
}));
vi.mock("../../src/pwa-register.ts", () => ({ registerSW: registerSWMock }));

const mockRegisterSW = vi.mocked(registerSWMock);
const applyMock = vi.fn(
  (_reloadPage?: boolean): Promise<void> => Promise.resolve(),
);

/** Let queued async continuations (void promises) run. */
const flush = (): Promise<void> =>
  new Promise((r) => window.setTimeout(r, 0));

function lastOptions() {
  return mockRegisterSW.mock.calls[0]?.[0];
}

/** Fake registration; `update()` resolves like the real one (state is read
 *  back off the same object). */
function fakeRegistration(overrides: {
  waiting?: ServiceWorker | null;
  installing?: ServiceWorker | null;
  update?: () => Promise<void>;
}): ServiceWorkerRegistration {
  return {
    waiting: overrides.waiting ?? null,
    installing: overrides.installing ?? null,
    update: overrides.update ?? ((): Promise<void> => Promise.resolve()),
  } as unknown as ServiceWorkerRegistration;
}

/** Already-installed worker: no state transitions to wait for. */
function installedWorker(): ServiceWorker {
  return {
    state: "installed",
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as ServiceWorker;
}

beforeEach(() => {
  resetAppUpdateStateForTests();
  mockRegisterSW.mockReset();
  applyMock.mockClear();
  mockRegisterSW.mockReturnValue(applyMock);
  if (!("serviceWorker" in navigator)) {
    Object.defineProperty(navigator, "serviceWorker", {
      value: {},
      configurable: true,
    });
  }
});

describe("registerServiceWorker", () => {
  it("registers without checking for updates on open", () => {
    registerServiceWorker({ hasActiveWorkout: () => false });
    expect(mockRegisterSW).toHaveBeenCalledTimes(1);
    expect(lastOptions()?.immediate).toBe(false);
  });
});

describe("checkForAppUpdate", () => {
  it("reports unavailable when no registration exists yet", async () => {
    registerServiceWorker({ hasActiveWorkout: () => false });
    expect(await checkForAppUpdate()).toBe("unavailable");
    expect(applyMock).not.toHaveBeenCalled();
  });

  it("reports up-to-date when the check finds nothing new", async () => {
    const update = vi.fn((): Promise<void> => Promise.resolve());
    registerServiceWorker({ hasActiveWorkout: () => false });
    lastOptions()?.onRegisteredSW?.("sw.js", fakeRegistration({ update }));
    expect(await checkForAppUpdate()).toBe("up-to-date");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("reports offline when the check request fails", async () => {
    registerServiceWorker({ hasActiveWorkout: () => false });
    lastOptions()?.onRegisteredSW?.(
      "sw.js",
      fakeRegistration({ update: () => Promise.reject(new Error("down")) }),
    );
    expect(await checkForAppUpdate()).toBe("offline");
  });

  it("reports update-ready once the new worker finishes installing", async () => {
    registerServiceWorker({ hasActiveWorkout: () => false });
    lastOptions()?.onRegisteredSW?.(
      "sw.js",
      fakeRegistration({ installing: installedWorker() }),
    );
    expect(await checkForAppUpdate()).toBe("update-ready");
    expect(isAppUpdateReady()).toBe(false);
    expect(applyMock).not.toHaveBeenCalled();
  });
});

describe("update readiness", () => {
  it("marks ready without reloading when a waiting worker appears", async () => {
    registerServiceWorker({ hasActiveWorkout: () => false });
    lastOptions()?.onRegisteredSW?.("sw.js", fakeRegistration({}));
    lastOptions()?.onNeedRefresh?.();
    await flush();
    expect(isAppUpdateReady()).toBe(true);
    expect(applyMock).not.toHaveBeenCalled();
    await applyAppUpdate();
    expect(applyMock).toHaveBeenCalledWith(true);
  });

  it("refuses to apply while a workout is active", async () => {
    registerServiceWorker({ hasActiveWorkout: () => true });
    lastOptions()?.onRegisteredSW?.("sw.js", fakeRegistration({}));
    lastOptions()?.onNeedRefresh?.();
    await flush();
    expect(isAppUpdateReady()).toBe(true);
    await applyAppUpdate();
    expect(applyMock).not.toHaveBeenCalled();
  });
});
