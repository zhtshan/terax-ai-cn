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
      message: "boom",
      filename: "app.js",
      lineno: 3,
      colno: 7,
    } as never);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("window.onerror: boom @ app.js:3:7"),
    );
    expect(logError).toHaveBeenCalled();
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
