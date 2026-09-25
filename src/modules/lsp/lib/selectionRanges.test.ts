import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  chainSpans,
  expandIndex,
  type LspSelectionRange,
} from "./selectionRanges";

const doc = Text.of(["const value = compute(1, 2);"]);
const pos = (line: number, character: number) => ({ line, character });

describe("chainSpans", () => {
  it("flattens a parent chain into innermost-first offset spans", () => {
    const chain: LspSelectionRange = {
      range: { start: pos(0, 13), end: pos(0, 20) },
      parent: {
        range: { start: pos(0, 6), end: pos(0, 27) },
        parent: { range: { start: pos(0, 0), end: pos(0, 28) } },
      },
    };
    expect(chainSpans(doc, chain)).toEqual([
      [13, 20],
      [6, 27],
      [0, 28],
    ]);
  });

  it("falls back to start when end is missing and clamps past-EOF rows", () => {
    const chain: LspSelectionRange = {
      range: { start: pos(0, 13) },
      parent: { range: { start: pos(9, 0), end: pos(9, 5) } },
    };
    expect(chainSpans(doc, chain)).toEqual([
      [13, 13],
      [doc.length, doc.length],
    ]);
  });
});

describe("expandIndex", () => {
  const spans: Array<[number, number]> = [
    [13, 20],
    [6, 27],
    [0, 28],
  ];

  it("picks the first span strictly larger than the current selection", () => {
    expect(expandIndex(spans, 13, 20)).toBe(1);
    expect(expandIndex(spans, 6, 27)).toBe(2);
  });

  it("skips spans equal to the current selection", () => {
    expect(expandIndex(spans, 0, 28)).toBe(-1);
    expect(expandIndex(spans, 15, 17)).toBe(0);
  });

  it("returns -1 for empty chains or non-containing spans", () => {
    expect(expandIndex([], 0, 5)).toBe(-1);
    expect(expandIndex(spans, 100, 110)).toBe(-1);
  });
});
