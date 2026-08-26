import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((p: string) => `asset://test/${p}`),
}));

import { convertFileSrc } from "@tauri-apps/api/core";
import {
  type ImageUrlContext,
  markdownImageDirname,
  resolveImageUrl,
  setKnownHome,
} from "./markdownImages";

const mockConvert = vi.mocked(convertFileSrc);
const localCtx: ImageUrlContext = {
  dirname: "/home/u/notes",
  home: "/home/u",
};

beforeEach(() => {
  mockConvert.mockClear();
});

afterEach(() => {
  setKnownHome(null);
});

describe("markdownImageDirname", () => {
  it("extracts the directory portion", () => {
    expect(markdownImageDirname("/home/u/notes/a.md")).toBe("/home/u/notes");
    expect(markdownImageDirname("C:\\Users\\u\\doc\\a.md")).toBe(
      "C:/Users/u/doc",
    );
    expect(markdownImageDirname("a.md")).toBe("");
  });
});

describe("resolveImageUrl remote schemes", () => {
  it("passes https through unchanged", () => {
    expect(resolveImageUrl("https://a.com/x.png", localCtx)).toBe(
      "https://a.com/x.png",
    );
  });

  it("passes uppercase HTTPS through unchanged", () => {
    expect(resolveImageUrl("HTTPS://A.COM/X.PNG", localCtx)).toBe(
      "HTTPS://A.COM/X.PNG",
    );
  });

  it("rejects http (mixed content is blocked anyway)", () => {
    expect(resolveImageUrl("http://a.com/x.png", localCtx)).toBeUndefined();
  });

  it("passes data URIs through unchanged", () => {
    const uri = "data:image/png;base64,iVBORw0KGgo=";
    expect(resolveImageUrl(uri, localCtx)).toBe(uri);
    expect(mockConvert).not.toHaveBeenCalled();
  });
});

describe("resolveImageUrl local paths", () => {
  it("converts absolute paths via convertFileSrc", () => {
    resolveImageUrl("/abs/img.png", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/abs/img.png");
  });

  it("resolves relative paths against the md directory", () => {
    resolveImageUrl("./img.png", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/u/notes/img.png");
    resolveImageUrl("sub/dir/pic.jpg", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/u/notes/sub/dir/pic.jpg");
  });

  it("resolves ../ against the md directory", () => {
    resolveImageUrl("../shared/logo.gif", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/u/shared/logo.gif");
  });

  it("expands ~/ with cached home", () => {
    resolveImageUrl("~/pics/me.webp", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/u/pics/me.webp");
  });

  it("returns undefined for ~/ when no home cached", () => {
    expect(
      resolveImageUrl("~/x.png", { dirname: "/d", home: null }),
    ).toBeUndefined();
  });

  it("converts file:// URIs to asset URLs", () => {
    resolveImageUrl("file:///abs/img.png", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/abs/img.png");
  });

  it("converts file:///C:/ URIs to a bare drive path", () => {
    resolveImageUrl("file:///C:/Users/x/img.png", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("C:/Users/x/img.png");
  });

  it("returns undefined for relative paths without dirname", () => {
    expect(resolveImageUrl("./img.png", {})).toBeUndefined();
  });
});

describe("resolveImageUrl edge cases", () => {
  it("normalizes windows backslashes in relative paths", () => {
    resolveImageUrl(".\\img\\a.png", { dirname: "C:/Users/u/doc" });
    expect(mockConvert).toHaveBeenCalledWith("C:/Users/u/doc/img/a.png");
  });

  it("keeps the drive when .. climbs past the drive root", () => {
    resolveImageUrl("../../x.png", { dirname: "C:/a" });
    expect(mockConvert).toHaveBeenCalledWith("C:/x.png");
  });

  it("collapses .. to the POSIX root", () => {
    resolveImageUrl("../../etc/x.png", { dirname: "/home/u" });
    expect(mockConvert).toHaveBeenCalledWith("/etc/x.png");
  });

  it("keeps .. traversal (asset scope is **, same as EditorPane)", () => {
    resolveImageUrl("../../etc/passwd.png", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/etc/passwd.png");
  });

  it("returns undefined for empty or whitespace input", () => {
    expect(resolveImageUrl("", localCtx)).toBeUndefined();
    expect(resolveImageUrl("   ", localCtx)).toBeUndefined();
  });
});

describe("resolveImageUrl module home cache", () => {
  it("falls back to the cached home when ctx.home is absent", () => {
    setKnownHome("/home/cached");
    resolveImageUrl("~/x.png", { dirname: "/d" });
    expect(mockConvert).toHaveBeenCalledWith("/home/cached/x.png");
  });

  it("returns undefined for ~/ when no home is cached", () => {
    expect(resolveImageUrl("~/x.png", { dirname: "/d" })).toBeUndefined();
  });
});
