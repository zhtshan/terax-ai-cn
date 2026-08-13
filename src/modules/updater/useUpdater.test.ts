import { describe, expect, it } from "vitest";
import { isNewer, parseVersion, pickLatestVersion } from "./useUpdater";

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

describe("pickLatestVersion", () => {
  it("picks the highest real version even with a non-version tag mixed in", () => {
    const tags = [
      "v0.8.7",
      "v0.8.6",
      "v0.8.5.2-cn",
      "v0.8.5.1-cn",
      "v0.8.5",
      "v0.8.5-5-cn",
      "v0.8.5-5-0",
      "v0.8.5-4-cn",
      "v0.8.5-3-cn",
      "list",
    ];
    expect(pickLatestVersion(tags)).toBe("v0.8.7");
  });

  it("returns undefined when no tags are given", () => {
    expect(pickLatestVersion([])).toBeUndefined();
  });

  it("does not let an unparseable tag be picked as latest", () => {
    expect(pickLatestVersion(["v0.8.5", "list"])).toBe("v0.8.5");
    expect(pickLatestVersion(["list"])).toBe("list");
  });

  it("keeps mixed -N-cn and .N-cn tags ordered correctly", () => {
    const tags = ["v0.8.5-3-cn", "v0.8.5.2-cn", "v0.8.5.1-cn"];
    expect(pickLatestVersion(tags)).toBe("v0.8.5-3-cn");
  });
});
