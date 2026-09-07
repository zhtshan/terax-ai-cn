import i18next from "i18next";
import { describe, expect, it } from "vitest";

describe("i18n key coverage", () => {
  it("translates shared action keys", () => {
    expect(i18next.t("common.retry")).toBe("重试");
    expect(i18next.t("common.searching")).toBe("搜索中…");
  });

  it("translates the custom provider group title", () => {
    expect(i18next.t("settings.models.custom")).toBe("自定义");
  });
});
