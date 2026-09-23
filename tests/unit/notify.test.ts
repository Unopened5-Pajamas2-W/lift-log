// @vitest-environment jsdom
/** Rest-notification vectors: enable-gate, permission gate, tag dedupe,
 *  cancelled close, and no-throw when Notification/SW are absent. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  notifyRestCancelled,
  notifyRestDone,
  requestRestNotifyPermission,
  resetRestNotifyStateForTests,
  setRestNotifyEnabled,
} from "../../src/lib/notify.ts";

/** Fake Notification permission surface + SW registration. */
function installNotificationApi(
  permission: NotificationPermission,
): {
  showNotification: ReturnType<typeof vi.fn>;
  getNotifications: ReturnType<typeof vi.fn>;
} {
  const showNotification = vi.fn(() => Promise.resolve());
  const getNotifications = vi.fn(() => Promise.resolve([]));
  const registration = { showNotification, getNotifications };
  (globalThis as unknown as { Notification: unknown }).Notification = {
    permission,
    requestPermission: vi.fn(() => Promise.resolve(permission)),
  };
  (
    navigator as unknown as {
      serviceWorker: { ready: Promise<unknown> };
    }
  ).serviceWorker = { ready: Promise.resolve(registration) };
  return { showNotification, getNotifications };
}

function removeNotificationApi(): void {
  delete (globalThis as unknown as { Notification?: unknown }).Notification;
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
}

beforeEach(() => {
  resetRestNotifyStateForTests();
  installNotificationApi("granted");
});

afterEach(() => {
  removeNotificationApi();
  vi.restoreAllMocks();
});

describe("rest notifications", () => {
  it("disabled gate: no showNotification call", () => {
    const { showNotification } = installNotificationApi("granted");
    notifyRestDone(90);
    expect(showNotification).not.toHaveBeenCalled();
  });

  it("enabled + granted: shows notification with tag, silent, workout URL", async () => {
    const { showNotification } = installNotificationApi("granted");
    setRestNotifyEnabled(true);
    notifyRestDone(90);
    await vi.waitFor(() => expect(showNotification).toHaveBeenCalled());
    const [title, options] = showNotification.mock.calls[0] as [
      string,
      { tag: string; silent: boolean; data: { url: string }; body: string },
    ];
    expect(title).toBe("Rest complete — next set");
    expect(options.tag).toBe("rest-done");
    expect(options.silent).toBe(true);
    expect(options.data.url).toBe("#/workout");
    expect(options.body).toContain("90");
  });

  it("enabled but permission not granted: no call", () => {
    const { showNotification } = installNotificationApi("default");
    setRestNotifyEnabled(true);
    notifyRestDone(90);
    expect(showNotification).not.toHaveBeenCalled();
  });

  it("cancel closes tagged notifications", async () => {
    const { getNotifications } = installNotificationApi("granted");
    setRestNotifyEnabled(true);
    notifyRestCancelled();
    await vi.waitFor(() => expect(getNotifications).toHaveBeenCalled());
    expect(getNotifications).toHaveBeenCalledWith({ tag: "rest-done" });
  });

  it("absent Notification API: never throws", () => {
    removeNotificationApi();
    setRestNotifyEnabled(true);
    expect(() => notifyRestDone(90)).not.toThrow();
    expect(() => notifyRestCancelled()).not.toThrow();
  });

  it("requestRestNotifyPermission: granted path and absent-API path", async () => {
    installNotificationApi("granted");
    expect(await requestRestNotifyPermission()).toBe(true);
    installNotificationApi("denied");
    expect(await requestRestNotifyPermission()).toBe(false);
    removeNotificationApi();
    expect(await requestRestNotifyPermission()).toBe(false);
  });
});
