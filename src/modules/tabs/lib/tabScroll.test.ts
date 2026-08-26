import { describe, expect, it } from "vitest";
import { nextScrollLeftForTab } from "./tabScroll";

describe("nextScrollLeftForTab", () => {
  it("keeps scrollLeft when the tab is fully visible", () => {
    expect(nextScrollLeftForTab(100, 500, 150, 250)).toBe(100);
  });

  it("reveals a tab hidden past the right edge by aligning its right edge", () => {
    expect(nextScrollLeftForTab(0, 400, 900, 980)).toBe(580);
  });

  it("reveals a tab scrolled off the left edge by aligning its left edge", () => {
    expect(nextScrollLeftForTab(300, 400, 50, 140)).toBe(50);
  });

  it("aligns the left edge for tabs near the strip start (browser clamps to 0)", () => {
    expect(nextScrollLeftForTab(200, 400, 30, 90)).toBe(30);
  });

  it("returns current when viewport has no width (hidden strip)", () => {
    expect(nextScrollLeftForTab(120, 0, 800, 900)).toBe(120);
  });

  it("aligns right edge when tab is wider than the viewport", () => {
    // Right-edge alignment wins; result stays >= 0.
    expect(nextScrollLeftForTab(10, 100, 200, 500)).toBe(400);
  });
});
