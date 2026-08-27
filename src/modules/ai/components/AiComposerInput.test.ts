import { describe, expect, it } from "vitest";
import {
  resolveComposerEnterAction,
  resolvePickerKeyAction,
} from "./AiComposerInput";

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

describe("resolvePickerKeyAction (#873 picker branch)", () => {
  it("picks on Enter when items exist and IME is not composing", () => {
    expect(resolvePickerKeyAction({ key: "Enter" }, 3)).toBe("pick");
  });

  it("picks on Tab when items exist and IME is not composing", () => {
    expect(resolvePickerKeyAction({ key: "Tab" }, 3)).toBe("pick");
  });

  it("ignores Enter while IME composition is active", () => {
    expect(resolvePickerKeyAction({ key: "Enter", isComposing: true }, 3)).toBe(
      "ignore",
    );
  });

  it("ignores Tab while IME composition is active", () => {
    expect(resolvePickerKeyAction({ key: "Tab", isComposing: true }, 3)).toBe(
      "ignore",
    );
  });

  it("ignores Enter when there are no items to pick", () => {
    expect(resolvePickerKeyAction({ key: "Enter" }, 0)).toBe("ignore");
  });

  it("ignores Tab when there are no items to pick", () => {
    expect(resolvePickerKeyAction({ key: "Tab" }, 0)).toBe("ignore");
  });

  it("ignores unrelated keys (ArrowDown, Escape, letters)", () => {
    for (const key of ["ArrowDown", "ArrowUp", "Escape", "a", " "]) {
      expect(resolvePickerKeyAction({ key }, 3)).toBe("ignore");
    }
  });
});
