import { describe, expect, it } from "vitest";
import { resolveComposerEnterAction } from "./AiComposerInput";

describe("resolveComposerEnterAction", () => {
  it("submits on plain Enter", () => {
    expect(
      resolveComposerEnterAction({ key: "Enter", shiftKey: false }),
    ).toBe("submit");
  });

  it("ignores Shift+Enter (newline)", () => {
    expect(resolveComposerEnterAction({ key: "Enter", shiftKey: true })).toBe(
      "ignore",
    );
  });

  it("ignores Enter while an IME composition is active (#873)", () => {
    expect(
      resolveComposerEnterAction({
        key: "Enter",
        shiftKey: false,
        isComposing: true,
      }),
    ).toBe("ignore");
  });

  it("ignores non-Enter keys", () => {
    expect(resolveComposerEnterAction({ key: "a", shiftKey: false })).toBe(
      "ignore",
    );
  });

  it(
    "known limitation (#845 前半, unverified on Windows): a trusted Enter " +
      "keydown injected per line break by Windows clipboard history (Win+V) " +
      "or voice-to-text tools is indistinguishable from a deliberate " +
      "user Enter-to-send, so it still resolves to submit today",
    () => {
      const injectedNewline = { key: "Enter", shiftKey: false, isComposing: false };
      expect(resolveComposerEnterAction(injectedNewline)).toBe("submit");
    },
  );
});
