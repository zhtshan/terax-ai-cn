import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((p: string) => `asset://test/${p}`),
}));

import { convertFileSrc } from "@tauri-apps/api/core";
import {
  type ImageUrlContext,
  markdownImageDirname,
  resolveImageUrl,
} from "./markdownImages";

const mockConvert = vi.mocked(convertFileSrc);
const localCtx: ImageUrlContext = {
  dirname: "/home/u/notes",
  home: "/home/u",
};

beforeEach(() => {
  mockConvert.mockClear();
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

  it("returns undefined for relative paths without dirname", () => {
    expect(resolveImageUrl("./img.png", {})).toBeUndefined();
  });
});

describe("resolveImageUrl edge cases", () => {
  it("normalizes windows backslashes in relative paths", () => {
    resolveImageUrl(".\\img\\a.png", { dirname: "C:/Users/u/doc" });
    expect(mockConvert).toHaveBeenCalledWith("C:/Users/u/doc/img/a.png");
  });

  it("keeps .. traversal (asset scope is **, same as EditorPane)", () => {
    resolveImageUrl("../../etc/passwd.png", localCtx);
    // 不抛错、仍产出 asset URL；越界收紧超出本 change 范围
    expect(mockConvert).toHaveBeenCalled();
  });

  it("returns undefined for empty or whitespace input", () => {
    expect(resolveImageUrl("", localCtx)).toBeUndefined();
    expect(resolveImageUrl("   ", localCtx)).toBeUndefined();
  });
});
