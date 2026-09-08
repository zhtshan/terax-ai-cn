import { describe, expect, it } from "vitest";
import { displayError } from "./teraxErrors";

describe("displayError", () => {
  it("maps pure code to zh template", () => {
    expect(displayError("terax:pty_no_session")).toBe("PTY 会话不存在");
  });

  it("maps code with rest", () => {
    expect(displayError("terax:fs_not_a_directory /tmp/x")).toBe(
      "不是目录：/tmp/x",
    );
  });

  it("passes through non-terax strings", () => {
    expect(displayError("boom")).toBe("boom");
  });

  it("stringifies Error objects and strips unknown code prefix", () => {
    expect(displayError(new Error("plain"))).toBe("plain");
    expect(displayError("terax:zzz_unknown some detail")).toBe("some detail");
  });

  it("switches with locale", async () => {
    const i18n = (await import("@/i18n")).default;
    await i18n.changeLanguage("en");
    expect(displayError("terax:pty_no_session")).toBe("no session");
    await i18n.changeLanguage("zh-CN");
  });
});
