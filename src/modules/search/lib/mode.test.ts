import { describe, expect, it } from "vitest";

import { buildSearchInput } from "./mode";

const baseOptions = {
  pattern: "needle",
  root: "/workspace",
  regex: false,
  caseSensitive: false,
  wholeWord: false,
  include: "",
  exclude: "",
};

describe("buildSearchInput", () => {
  it.each([
    ["", null],
    [" *.ts ", "*.ts"],
    ["*.ts", "*.ts"],
  ])("normalizes include %j to %j", (include, expected) => {
    expect(buildSearchInput({ ...baseOptions, include }).include).toBe(expected);
  });

  it("normalizes an empty exclude to null", () => {
    expect(buildSearchInput(baseOptions).exclude).toBeNull();
  });

  it("preserves max_results when supplied", () => {
    expect(buildSearchInput({ ...baseOptions, max_results: 25 }).max_results).toBe(25);
  });

  it("normalizes an omitted max_results to null", () => {
    expect(buildSearchInput(baseOptions).max_results).toBeNull();
  });
});
