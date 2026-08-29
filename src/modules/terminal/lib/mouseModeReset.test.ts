import type { Terminal } from "@xterm/xterm";
import { describe, expect, it, vi } from "vitest";
import { MOUSE_TRACKING_DISABLE, resetMouseTracking } from "./mouseModeReset";

function fakeTerm(mode: Terminal["modes"]["mouseTrackingMode"]) {
  const write = vi.fn();
  const term = {
    write,
    modes: { mouseTrackingMode: mode },
  } as unknown as Terminal;
  return { term, write };
}

describe("resetMouseTracking", () => {
  it("is a no-op when tracking is off", () => {
    const { term, write } = fakeTerm("none");
    expect(resetMouseTracking(term)).toBe(false);
    expect(write).not.toHaveBeenCalled();
  });

  it.each(["x10", "vt200", "drag", "any"] as const)(
    "disables %s tracking with the full mode-reset sequence",
    (mode) => {
      const { term, write } = fakeTerm(mode);
      expect(resetMouseTracking(term)).toBe(true);
      expect(write).toHaveBeenCalledWith(MOUSE_TRACKING_DISABLE);
    },
  );

  it("covers every mouse protocol xterm tracks", () => {
    for (const mode of [1000, 1002, 1003, 1006, 1015]) {
      expect(MOUSE_TRACKING_DISABLE).toContain(`\x1b[?${mode}l`);
    }
  });
});
