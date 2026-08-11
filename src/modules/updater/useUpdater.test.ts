import { describe, expect, it } from "vitest";
import { isNewer, parseVersion } from "./useUpdater";

describe("parseVersion", () => {
  it("parses plain semver", () => {
    expect(parseVersion("0.8.5")).toEqual([0, 8, 5]);
  });

  it("strips a leading v", () => {
    expect(parseVersion("v0.8.5")).toEqual([0, 8, 5]);
  });

  it("parses dot-separated cn patch tags", () => {
    expect(parseVersion("v0.8.5.2-cn")).toEqual([0, 8, 5, 2]);
  });

  it("parses dash-separated cn patch tags", () => {
    expect(parseVersion("0.8.5-3-cn")).toEqual([0, 8, 5, 3]);
    expect(parseVersion("v0.8.5-3-cn")).toEqual([0, 8, 5, 3]);
  });
});

describe("isNewer", () => {
  it("detects a newer dash-style patch over a dot-style patch", () => {
    expect(isNewer("v0.8.5-3-cn", "v0.8.5.2-cn")).toBe(true);
  });

  it("detects a newer dot-style patch over a dash-style patch", () => {
    expect(isNewer("v0.8.5.3-cn", "v0.8.5-2-cn")).toBe(true);
  });

  it("treats equal versions as not newer", () => {
    expect(isNewer("v0.8.5-3-cn", "0.8.5-3-cn")).toBe(false);
  });

  it("rejects an older version", () => {
    expect(isNewer("v0.8.5.1-cn", "v0.8.5.2-cn")).toBe(false);
  });
});
