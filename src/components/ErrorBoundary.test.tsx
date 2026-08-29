import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("boom");
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

  it("renders children untouched when nothing throws", () => {
    render(<ErrorBoundary><div>ok-content</div></ErrorBoundary>);
    expect(screen.getByText("ok-content")).toBeTruthy();
  });
});
