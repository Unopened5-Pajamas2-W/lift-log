// @vitest-environment jsdom
/** App navigation contract: six primary bottom tabs and header Settings action.
 *  Mocks view/store modules so the test stays focused on shell navigation. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const renderStub = async (): Promise<HTMLElement> => document.createElement("section");

vi.mock("../../src/lib/store.ts", () => ({
  getActiveWorkout: vi.fn(async () => null),
  loadSettings: vi.fn(async () => ({ disclaimerAccepted: true })),
  saveSettings: vi.fn(async () => ({ disclaimerAccepted: true })),
}));

vi.mock("../../src/views/today.ts", () => ({
  renderToday: vi.fn(renderStub),
}));
vi.mock("../../src/views/workout.ts", () => ({
  renderWorkout: vi.fn(renderStub),
}));
vi.mock("../../src/views/programs.ts", () => ({
  renderPrograms: vi.fn(renderStub),
  renderProgramEditor: vi.fn(renderStub),
}));
vi.mock("../../src/views/exercises.ts", () => ({
  renderExercises: vi.fn(renderStub),
}));
vi.mock("../../src/views/history.ts", () => ({
  renderHistory: vi.fn(renderStub),
}));
vi.mock("../../src/views/progress.ts", () => ({
  renderProgress: vi.fn(renderStub),
}));
vi.mock("../../src/views/exerciseProgress.ts", () => ({
  renderExerciseProgress: vi.fn(renderStub),
}));
vi.mock("../../src/views/settings.ts", () => ({
  renderSettings: vi.fn(renderStub),
}));

let renderApp: typeof import("../../src/app.ts").renderApp;

beforeEach(async () => {
  document.body.replaceChildren();
  ({ renderApp } = await import("../../src/app.ts"));
});

afterEach(() => {
  document.body.replaceChildren();
  location.hash = "";
  vi.clearAllMocks();
});

describe("app shell nav", () => {
  it("renders six primary tabs and excludes settings from bottom nav", async () => {
    location.hash = "#/today";
    const shell = document.createElement("div");
    await renderApp(shell);

    const nav = shell.querySelector("nav.tabbar");
    const links = [...shell.querySelectorAll("nav.tabbar a")];
    expect(nav).not.toBeNull();
    expect(nav?.getAttribute("style")).toContain("--tab-count:6");
    expect(links).toHaveLength(6);
    expect(links.map((a) => a.getAttribute("href"))).not.toContain("#/settings");
    expect(links.some((a) => (a.textContent ?? "").includes("Plans"))).toBe(true);
  });

  it("shows a persistent header settings action and marks it active on settings route", async () => {
    const shell = document.createElement("div");

    location.hash = "#/today";
    await renderApp(shell);
    const inactive = shell.querySelector("header.topbar a.topbar-action");
    expect(inactive?.getAttribute("href")).toBe("#/settings");
    expect(inactive?.getAttribute("aria-current")).toBeNull();

    location.hash = "#/settings";
    await renderApp(shell);
    const active = shell.querySelector("header.topbar a.topbar-action");
    expect(active?.getAttribute("href")).toBe("#/settings");
    expect(active?.getAttribute("aria-current")).toBe("page");
  });
});
