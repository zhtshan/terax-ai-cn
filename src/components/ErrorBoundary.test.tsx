import { error as logError } from "@tauri-apps/plugin-log";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

vi.mock("@tauri-apps/plugin-log", () => ({
  error: vi.fn(() => Promise.resolve()),
}));

function Bomb(): never {
  throw new Error("boom");
}

function StackBomb(): never {
  throw new Error("boom-with-stack");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("shows fallback instead of blanking when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("重启应用")).toBeTruthy();
  });

  it("persists boundary-captured crashes to the tauri log", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("render crash"),
    );
  });

  it("persists the stack when the thrown value is an Error", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <StackBomb />
      </ErrorBoundary>,
    );
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining("boom-with-stack"),
    );
  });

  it("renders children untouched when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>ok-content</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("ok-content")).toBeTruthy();
  });
});
