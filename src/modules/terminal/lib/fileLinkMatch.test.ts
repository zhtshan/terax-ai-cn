import { describe, expect, it } from "vitest";

import {
  isInsideWorkspace,
  matchFileLinks,
  resolvePath,
} from "./fileLinkMatch";

describe("matchFileLinks", () => {
  it("matches a path with line and col numbers", () => {
    const result = matchFileLinks("src/app/App.tsx:1245:7");
    expect(result).toHaveLength(1);
    expect(result[0]!.path).toBe("src/app/App.tsx");
    expect(result[0]!.line).toBe(1245);
    expect(result[0]!.col).toBe(7);
  });

  it("matches a path with only a line number", () => {
    const result = matchFileLinks("src/lib/utils.ts:42");
    expect(result).toHaveLength(1);
    expect(result[0]!.path).toBe("src/lib/utils.ts");
    expect(result[0]!.line).toBe(42);
    expect(result[0]!.col).toBeUndefined();
  });

  it("matches grep-style path:line: content output", () => {
    const result = matchFileLinks(
      "src/modules/tabs/lib/useTabs.ts:954:    for (const lid of toDispose) disposeSession(lid);",
    );
    expect(result).toHaveLength(1);
    expect(result[0]!.path).toBe("src/modules/tabs/lib/useTabs.ts");
    expect(result[0]!.line).toBe(954);
    expect(result[0]!.col).toBeUndefined();
  });

  it("matches compiler-style path:line:col: message output", () => {
    const result = matchFileLinks("src/main.rs:10:5: error[E0308]");
    expect(result).toHaveLength(1);
    expect(result[0]!.path).toBe("src/main.rs");
    expect(result[0]!.line).toBe(10);
    expect(result[0]!.col).toBe(5);
  });

  it("matches a plain path without line or col", () => {
    const result = matchFileLinks("src/lib/utils.ts");
    expect(result).toHaveLength(1);
    expect(result[0]!.path).toBe("src/lib/utils.ts");
    expect(result[0]!.line).toBeUndefined();
    expect(result[0]!.col).toBeUndefined();
  });

  it("matches two file paths on the same line", () => {
    const result = matchFileLinks(
      "import A from './a.ts'; import B from './b.ts'",
    );
    expect(result).toHaveLength(2);
    expect(result[0]!.path).toBe("./a.ts");
    expect(result[1]!.path).toBe("./b.ts");
  });

  it("does not match text without a slash", () => {
    const result = matchFileLinks("Read me.txt");
    expect(result).toHaveLength(0);
  });

  it("does not match text without a recognized extension", () => {
    const result = matchFileLinks("src/README");
    expect(result).toHaveLength(0);
  });

  it("captures start and end indices", () => {
    const result = matchFileLinks("See src/app.tsx:1 for details");
    expect(result).toHaveLength(1);
    expect(result[0]!.start).toBe(4);
    expect(result[0]!.end).toBe(15);
  });
});

describe("resolvePath", () => {
  it("resolves a relative path against cwd", () => {
    expect(resolvePath("app/foo.ts", "/repo/src")).toBe("/repo/src/app/foo.ts");
  });

  it("returns null for a relative path when cwd is null", () => {
    expect(resolvePath("app/foo.ts", null)).toBeNull();
  });

  it("resolves an absolute path even when cwd is null", () => {
    expect(resolvePath("/repo/src/app/foo.ts", null)).toBe(
      "/repo/src/app/foo.ts",
    );
  });

  it("expands a ~/ path against home", () => {
    expect(resolvePath("~/project/app/foo.ts", "/repo", "/home/user")).toBe(
      "/home/user/project/app/foo.ts",
    );
  });

  it("returns null for a ~/ path when home is unknown", () => {
    expect(resolvePath("~/project/app/foo.ts", "/repo", null)).toBeNull();
  });

  it("normalizes dot segments inside a ~/ path", () => {
    expect(resolvePath("~/../shared/foo.ts", "/repo", "/home/user")).toBe(
      "/home/shared/foo.ts",
    );
  });

  it("returns absolute path as-is when already absolute", () => {
    expect(resolvePath("/repo/src/app/foo.ts", "/repo")).toBe(
      "/repo/src/app/foo.ts",
    );
  });

  it("normalizes dot segments in path", () => {
    expect(resolvePath("app/../foo.ts", "/repo/src")).toBe("/repo/src/foo.ts");
  });
});

describe("isInsideWorkspace", () => {
  it("returns false when path is outside workspace root", () => {
    expect(isInsideWorkspace("/usr/local/bin/foo.ts", "/repo")).toBe(false);
  });

  it("returns true when path equals workspace root", () => {
    expect(isInsideWorkspace("/repo", "/repo")).toBe(true);
  });

  it("returns true when path is inside workspace root", () => {
    expect(isInsideWorkspace("/repo/src/app.ts", "/repo")).toBe(true);
  });

  it("handles explorerRoot with trailing slash", () => {
    expect(isInsideWorkspace("/repo/src/app.ts", "/repo/")).toBe(true);
  });

  it("returns false when path is a prefix but not inside", () => {
    expect(isInsideWorkspace("/repo-extra/foo.ts", "/repo")).toBe(false);
  });
});
