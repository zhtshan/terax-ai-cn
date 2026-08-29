import { describe, expect, it, vi } from "vitest";
import { error as logError } from "@tauri-apps/plugin-log";
import { installGlobalErrorReporting } from "./globalErrorReport";

vi.mock("@tauri-apps/plugin-log", () => ({
  error: vi.fn(() => Promise.resolve()),
}));

type Listener = (ev: never) => void;

function captureHandlers(type: string): Listener[] {
  const captured: Listener[] = [];
  vi.spyOn(window, "addEventListener").mockImplementation(
    (t, fn) => {
      if (t === type) captured.push(fn as Listener);
    },
  );
  return captured;
}

describe("installGlobalErrorReporting", () => {
  it("reports window errors via console and tauri log", () => {
    const handlers = captureHandlers("error");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    installGlobalErrorReporting();
    expect(handlers).toHaveLength(1);
    handlers[0]({
      error: new Error("boom-with-stack"),
      message: "boom-with-stack",
      filename: "app.js",
      lineno: 3,
      colno: 7,
    } as never);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("boom-with-stack"),
    );
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("boom-with-stack"),
    );
    consoleSpy.mockRestore();
  });

  it("falls back to a readable line when no error object is present", () => {
    const handlers = captureHandlers("error");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    installGlobalErrorReporting();
    expect(handlers).toHaveLength(1);
    handlers[0]({
      message: undefined,
      filename: "f.js",
      lineno: 1,
      colno: 2,
    } as never);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("window.onerror: (no error object) @ f.js:1:2"),
    );
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("window.onerror: (no error object) @ f.js:1:2"),
    );
    consoleSpy.mockRestore();
  });

  it("reports unhandled rejections", () => {
    const handlers = captureHandlers("unhandledrejection");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    installGlobalErrorReporting();
    expect(handlers).toHaveLength(1);
    handlers[0]({ reason: "reject-reason" } as never);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("unhandledrejection: reject-reason"),
    );
    consoleSpy.mockRestore();
  });
});
