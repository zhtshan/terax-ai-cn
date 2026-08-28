import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, "MarkdownPreviewPane.tsx"), "utf8");
const streamdownMatch = src.match(/<Streamdown[\s\S]*?<\/Streamdown>/);
const streamdownJsx = streamdownMatch?.[0] ?? "";

describe("MarkdownPreviewPane Streamdown configuration", () => {
  it("renders complete markdown files in static mode", () => {
    expect(streamdownJsx).toMatch(/mode="static"/);
  });

  it("does not run streaming incomplete-markdown repair for files", () => {
    expect(streamdownJsx).toMatch(/parseIncompleteMarkdown=\{false\}/);
  });
});

describe("MarkdownPreviewPane image handling", () => {
  it("wires urlTransform for images and passes math plugins", () => {
    expect(streamdownJsx).toMatch(/plugins=\{streamdownPlugins\}/);
    expect(streamdownJsx).toMatch(/urlTransform=\{transformImageUrl\}/);
  });

  it("derives dirname from the md file path via markdownImageDirname", () => {
    expect(src).toMatch(/markdownImageDirname\(/);
    expect(src).toMatch(/useMemo\(\(\) => markdownImageDirname\(path\)/);
  });
});
