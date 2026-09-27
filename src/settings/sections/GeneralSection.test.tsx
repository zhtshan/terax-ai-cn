/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react";
import { Component, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve([])),
}));
vi.mock("@tauri-apps/plugin-autostart", () => ({
  isEnabled: vi.fn(() => Promise.resolve(false)),
  enable: vi.fn(() => Promise.resolve()),
  disable: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/modules/theme", () => ({
  useTheme: () => ({ mode: "system", setMode: vi.fn() }),
}));

import { GeneralSection } from "./GeneralSection";

class CrashGuard extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false };
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    return this.state.crashed ? <div>render-crashed</div> : this.props.children;
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GeneralSection", () => {
  // React Compiler memoizes notificationTestTitle/Label calls on
  // notificationTest; a hook inside those helpers is skipped on re-render
  // and crashes with "Rendered fewer hooks than expected" (#933).
  it("re-renders without a hook-count crash when notificationTest is unchanged", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <CrashGuard>
        <GeneralSection />
      </CrashGuard>,
    );
    rerender(
      <CrashGuard>
        <GeneralSection />
      </CrashGuard>,
    );
    expect(screen.queryByText("render-crashed")).toBeNull();
  });
});
