import { EditorView } from "@codemirror/view";
import { Text } from "@codemirror/state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TeraxLspClient } from "./client";
import {
  inlayHintDecorations,
  inlayHintLabel,
  lspInlayHints,
  type LspInlayHint,
} from "./inlayHints";

describe("inlayHintLabel", () => {
  it("joins label parts and passes strings through", () => {
    expect(inlayHintLabel(": string")).toBe(": string");
    expect(
      inlayHintLabel([{ value: "a" }, { value: ":" }, { value: " b" }]),
    ).toBe("a: b");
  });
});

describe("inlayHintDecorations", () => {
  const doc = Text.of(["const value = compute(1, 2);"]);

  it("maps hint positions to widget decorations and clamps to line end", () => {
    const hints: LspInlayHint[] = [
      { position: { line: 0, character: 11 }, label: ": number" },
      { position: { line: 9, character: 0 }, label: "out of range" },
      { position: { line: 0, character: 200 }, label: "past eol" },
      { position: { line: 0, character: 0 }, label: "" },
    ];
    const set = inlayHintDecorations(doc, hints);
    const offsets: number[] = [];
    const iter = set.iter();
    while (iter.value) {
      offsets.push(iter.from);
      iter.next();
    }
    expect(offsets).toEqual([doc.line(1).from + 11]);
  });
});

describe("lspInlayHints extension", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  function mount(raw: unknown, overrides: Partial<Record<string, unknown>> = {}) {
    const client = {
      ready: true,
      initializePromise: Promise.resolve(),
      capabilities: { inlayHintProvider: {} },
      rawRequest: vi.fn().mockResolvedValue(raw),
      ...overrides,
    } as unknown as TeraxLspClient;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = new EditorView({
      doc: "const value = compute(1, 2);",
      parent: host,
      extensions: [lspInlayHints({ client, documentUri: "file:///a.ts" })],
    });
    return { client, host, view };
  }

  it("renders widgets for returned hints", async () => {
    const { client, host, view } = mount([
      { position: { line: 0, character: 11 }, label: ": number" },
    ]);
    await vi.advanceTimersByTimeAsync(300);
    expect(client.rawRequest).toHaveBeenCalledWith(
      "textDocument/inlayHint",
      expect.objectContaining({
        textDocument: { uri: "file:///a.ts" },
        range: expect.anything(),
      }),
    );
    expect(host.querySelector(".cm-lsp-inlay")?.textContent).toBe(": number");
    view.destroy();
  });

  it("never requests when the server lacks the capability", async () => {
    const { client, host, view } = mount([], {
      capabilities: {},
    });
    await vi.advanceTimersByTimeAsync(300);
    expect(client.rawRequest).not.toHaveBeenCalled();
    expect(host.querySelector(".cm-lsp-inlay")).toBeNull();
    view.destroy();
  });

  it("ignores a late response after the document changed", async () => {
    let resolveRaw!: (v: unknown) => void;
    const client = {
      ready: true,
      initializePromise: Promise.resolve(),
      capabilities: { inlayHintProvider: {} },
      rawRequest: vi
        .fn()
        .mockReturnValue(new Promise((r) => (resolveRaw = r))),
    } as unknown as TeraxLspClient;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const view = new EditorView({
      doc: "const value = compute(1, 2);",
      parent: host,
      extensions: [lspInlayHints({ client, documentUri: "file:///a.ts" })],
    });
    await vi.advanceTimersByTimeAsync(300);
    view.dispatch({ changes: { from: 0, insert: "x" } });
    resolveRaw([{ position: { line: 0, character: 11 }, label: ": stale" }]);
    await vi.advanceTimersByTimeAsync(1);
    expect(host.querySelector(".cm-lsp-inlay")).toBeNull();
    view.destroy();
  });
});
