import { describe, expect, it } from "vitest";
import {
  shouldDeferSidebarToggleToTerminal,
  shouldDisablePaneSwapShortcut,
} from "@/modules/shortcuts/lib/shortcutScope";

describe("shouldDisablePaneSwapShortcut", () => {
  it.each([
    "pane.swapLeft",
    "pane.swapRight",
    "pane.swapUp",
    "pane.swapDown",
  ] as const)("disables %s outside multi-pane terminals", (id) => {
    expect(shouldDisablePaneSwapShortcut(id, null)).toBe(true);
    expect(shouldDisablePaneSwapShortcut(id, 1)).toBe(true);
    expect(shouldDisablePaneSwapShortcut(id, 2)).toBe(false);
  });

  it("rejects unrelated shortcuts", () => {
    expect(shouldDisablePaneSwapShortcut("pane.focusNext", null)).toBe(false);
    expect(shouldDisablePaneSwapShortcut("editor.undo", 1)).toBe(false);
  });
});

describe("shouldDeferSidebarToggleToTerminal", () => {
  it("keeps Cmd+B on the sidebar everywhere", () => {
    const cmd = { ctrlKey: false, metaKey: true };
    expect(shouldDeferSidebarToggleToTerminal(true, cmd)).toBe(false);
    expect(shouldDeferSidebarToggleToTerminal(false, cmd)).toBe(false);
  });

  it("hands Ctrl+B to a focused terminal only", () => {
    const ctrl = { ctrlKey: true, metaKey: false };
    expect(shouldDeferSidebarToggleToTerminal(true, ctrl)).toBe(true);
    expect(shouldDeferSidebarToggleToTerminal(false, ctrl)).toBe(false);
  });
});
