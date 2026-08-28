import { describe, expect, it, vi, afterEach } from "vitest";
import { detectWebglRenderer } from "./store";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("detectWebglRenderer", () => {
  it("returns false when webgl2 context cannot be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(detectWebglRenderer()).toBe(false);
  });

  it("returns true when webgl2 context is available", () => {
    const fakeCtx = { getExtension: vi.fn(() => null) };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      fakeCtx as unknown as WebGL2RenderingContext,
    );
    expect(detectWebglRenderer()).toBe(true);
  });

  it("returns false when getContext throws", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(detectWebglRenderer()).toBe(false);
  });
});
