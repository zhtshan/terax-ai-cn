import { describe, expect, it } from "vitest";
import {
  deriveTitle,
  displaySessionTitle,
  UNTITLED_SESSION_TITLE,
} from "./sessions";

describe("session titles", () => {
  it("derives the sentinel title for conversations without user text", () => {
    expect(deriveTitle([])).toBe(UNTITLED_SESSION_TITLE);
  });

  it("renders the sentinel and empty titles as a localized label", () => {
    const t = (k: string) => (k === "ai.sessions.newChat" ? "新对话" : k);
    expect(displaySessionTitle(t, UNTITLED_SESSION_TITLE)).toBe("新对话");
    expect(displaySessionTitle(t, null)).toBe("新对话");
    expect(displaySessionTitle(t, "修复登录 bug")).toBe("修复登录 bug");
  });
});
