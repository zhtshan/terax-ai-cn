import { describe, expect, it } from "vitest";
import type { RawDocumentSymbol } from "./client";
import { normalizeDocumentSymbols } from "./documentSymbol";

const range = (line: number) => ({ start: { line, character: 0 } });

describe("normalizeDocumentSymbols", () => {
  it("returns an empty list for null or empty input", () => {
    expect(normalizeDocumentSymbols(null)).toEqual([]);
    expect(normalizeDocumentSymbols([])).toEqual([]);
  });

  it("assigns increasing levels down a DocumentSymbol hierarchy", () => {
    const raw: RawDocumentSymbol[] = [
      {
        name: "Widget",
        kind: 5,
        range: range(0),
        selectionRange: range(0),
        children: [
          {
            name: "render",
            kind: 6,
            range: range(2),
            selectionRange: range(2),
            children: [
              {
                name: "cached",
                kind: 13,
                range: range(3),
                selectionRange: range(3),
              },
            ],
          },
          { name: "props", kind: 7, range: range(8), selectionRange: range(8) },
        ],
      },
    ];

    expect(normalizeDocumentSymbols(raw)).toEqual([
      { level: 1, text: "Widget", line: 1, kind: 5 },
      { level: 2, text: "render", line: 3, kind: 6 },
      { level: 3, text: "cached", line: 4, kind: 13 },
      { level: 2, text: "props", line: 9, kind: 7 },
    ]);
  });

  it("reorders name-sorted children back into file order", () => {
    const raw: RawDocumentSymbol[] = [
      {
        name: "Widget",
        kind: 5,
        range: range(0),
        selectionRange: range(0),
        children: [
          { name: "zeta", kind: 6, range: range(2), selectionRange: range(2) },
          { name: "alpha", kind: 6, range: range(9), selectionRange: range(9) },
        ],
      },
    ];

    expect(normalizeDocumentSymbols(raw).map((i) => i.text)).toEqual([
      "Widget",
      "zeta",
      "alpha",
    ]);
  });

  it("falls back to selectionRange-less symbols using range", () => {
    const raw: RawDocumentSymbol[] = [
      { name: "loose", kind: 12, range: range(4) },
    ];
    expect(normalizeDocumentSymbols(raw)).toEqual([
      { level: 1, text: "loose", line: 5, kind: 12 },
    ]);
  });

  it("rebuilds nesting from containerName on flat SymbolInformation", () => {
    const raw: RawDocumentSymbol[] = [
      { name: "Widget", kind: 5, location: { uri: "f", range: range(0) } },
      {
        name: "render",
        kind: 6,
        location: { uri: "f", range: range(2) },
        containerName: "Widget",
      },
      {
        name: "cached",
        kind: 13,
        location: { uri: "f", range: range(3) },
        containerName: "render",
      },
      { name: "helper", kind: 12, location: { uri: "f", range: range(20) } },
    ];

    expect(normalizeDocumentSymbols(raw)).toEqual([
      { level: 1, text: "Widget", line: 1, kind: 5 },
      { level: 2, text: "render", line: 3, kind: 6 },
      { level: 3, text: "cached", line: 4, kind: 13 },
      { level: 1, text: "helper", line: 21, kind: 12 },
    ]);
  });

  it("keeps flat symbols top level when the container names no known symbol", () => {
    const raw: RawDocumentSymbol[] = [
      {
        name: "a",
        kind: 12,
        location: { uri: "f", range: range(0) },
        containerName: "widget.ts",
      },
      { name: "b", kind: 12, location: { uri: "f", range: range(4) } },
      {
        name: "c",
        kind: 12,
        location: { uri: "f", range: range(8) },
        containerName: "",
      },
    ];

    expect(normalizeDocumentSymbols(raw).map((i) => i.level)).toEqual([
      1, 1, 1,
    ]);
  });

  it("sorts name-ordered flat symbols by line before resolving containers", () => {
    const raw: RawDocumentSymbol[] = [
      {
        name: "method",
        kind: 6,
        location: { uri: "f", range: range(5) },
        containerName: "Later",
      },
      { name: "Later", kind: 5, location: { uri: "f", range: range(4) } },
    ];

    expect(normalizeDocumentSymbols(raw)).toEqual([
      { level: 1, text: "Later", line: 5, kind: 5 },
      { level: 2, text: "method", line: 6, kind: 6 },
    ]);
  });

  it("does not nest a symbol under itself", () => {
    const raw: RawDocumentSymbol[] = [
      {
        name: "loop",
        kind: 12,
        location: { uri: "f", range: range(0) },
        containerName: "loop",
      },
    ];
    expect(normalizeDocumentSymbols(raw)[0].level).toBe(1);
  });
});
