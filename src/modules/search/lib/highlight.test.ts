import { describe, expect, it } from "vitest";

import { splitHits } from "./highlight";

const baseOpts = { regex: false, caseSensitive: false, wholeWord: false };

describe("splitHits", () => {
  it("splits a line with multiple literal matches (case-insensitive)", () => {
    const result = splitHits("abc abc abc", "abc", baseOpts);
    expect(result).toEqual([
      { text: "abc", match: true },
      { text: " ", match: false },
      { text: "abc", match: true },
      { text: " ", match: false },
      { text: "abc", match: true },
    ]);
  });

  it("returns a single non-match segment when no match is found", () => {
    const result = splitHits("abc", "xyz", baseOpts);
    expect(result).toEqual([{ text: "abc", match: false }]);
  });

  it("respects caseSensitive: true for literal patterns", () => {
    const result = splitHits("ABC abc", "abc", {
      ...baseOpts,
      caseSensitive: true,
    });
    expect(result).toEqual([
      { text: "ABC ", match: false },
      { text: "abc", match: true },
    ]);
  });

  it("respects wholeWord: true for literal patterns", () => {
    const result = splitHits("is a test, not testing", "test", {
      ...baseOpts,
      wholeWord: true,
    });
    expect(result).toEqual([
      { text: "is a ", match: false },
      { text: "test", match: true },
      { text: ", not testing", match: false },
    ]);
  });

  it("passes user regex through verbatim when regex mode is on", () => {
    const result = splitHits("Hello world, ABC and XYZ", "[A-Z]+", {
      regex: true,
      caseSensitive: true,
      wholeWord: false,
    });
    expect(result).toEqual([
      { text: "H", match: true },
      { text: "ello world, ", match: false },
      { text: "ABC", match: true },
      { text: " and ", match: false },
      { text: "XYZ", match: true },
    ]);
  });

  it("returns a single non-match segment when the pattern is empty", () => {
    const result = splitHits("anything", "", baseOpts);
    expect(result).toEqual([{ text: "anything", match: false }]);
  });
});
