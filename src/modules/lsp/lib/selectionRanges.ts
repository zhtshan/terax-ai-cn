import { EditorSelection, type Extension, type Text } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { keymap } from "@codemirror/view";
import type { TeraxLspClient } from "./client";
import { type LspPos, offsetOf } from "./positions";

export type LspSelectionRange = {
  range: { start: LspPos; end?: LspPos };
  parent?: LspSelectionRange;
};

type Span = [number, number];

export function chainSpans(doc: Text, chain: LspSelectionRange): Span[] {
  const spans: Span[] = [];
  for (
    let node: LspSelectionRange | undefined = chain;
    node;
    node = node.parent
  ) {
    const from = offsetOf(doc, node.range.start);
    const to = node.range.end
      ? offsetOf(doc, node.range.end)
      : offsetOf(doc, node.range.start);
    spans.push([from, to]);
  }
  return spans;
}

// 链由内向外排列；相等 span（server 常回显当前选区）不算扩展。
export function expandIndex(spans: Span[], from: number, to: number): number {
  for (let i = 0; i < spans.length; i++) {
    const [s, e] = spans[i];
    if (s <= from && to <= e && (s < from || e > to)) return i;
  }
  return -1;
}

function toPos(doc: Text, at: number): LspPos {
  const line = doc.lineAt(at);
  return { line: line.number - 1, character: at - line.from };
}

// 稳定扩展面：能力探测与请求全部走 rawRequest，客户端只做选区状态机。
export function lspSelectionRanges(opts: {
  client: TeraxLspClient;
  documentUri: string;
}): Extension {
  type ExpandState = {
    doc: Text;
    chains: Span[][];
    index: Array<number | null>;
  };
  const state = new WeakMap<EditorView, ExpandState>();

  const supported = () =>
    opts.client.ready &&
    opts.client.capabilities?.selectionRangeProvider != null;

  const requestChains = async (view: EditorView): Promise<Span[][] | null> => {
    const doc = view.state.doc;
    const positions: LspPos[] = view.state.selection.ranges.map((r) =>
      toPos(doc, r.head),
    );
    let raw: unknown;
    try {
      raw = await opts.client.rawRequest("textDocument/selectionRange", {
        textDocument: { uri: opts.documentUri },
        positions,
      });
    } catch {
      return null;
    }
    if (view.state.doc !== doc || !Array.isArray(raw)) return null;
    const chains: Span[][] = [];
    for (const chain of raw as LspSelectionRange[]) {
      if (!chain || typeof chain !== "object" || !("range" in chain)) {
        return null;
      }
      chains.push(chainSpans(doc, chain));
    }
    return chains;
  };

  const selectAt = (view: EditorView, spans: Map<number, Span>): void => {
    const ranges = view.state.selection.ranges.map((r, i) => {
      const span = spans.get(i);
      const [anchor, head] = span ?? [r.anchor, r.head];
      return EditorSelection.range(anchor, head);
    });
    view.dispatch({
      selection: EditorSelection.create(ranges, view.state.selection.mainIndex),
      scrollIntoView: true,
    });
  };

  const expand = (view: EditorView): boolean => {
    if (!supported()) return false;
    void requestChains(view).then((chains) => {
      if (!chains) return;
      const sel = view.state.selection;
      const spans = new Map<number, Span>();
      const index: Array<number | null> = [];
      sel.ranges.forEach((r, i) => {
        const chain = chains[i];
        const next = chain ? expandIndex(chain, r.from, r.to) : -1;
        if (next < 0) {
          index.push(null);
          return;
        }
        spans.set(i, chain[next]);
        index.push(next);
      });
      if (spans.size === 0) return;
      selectAt(view, spans);
      state.set(view, { doc: view.state.doc, chains, index });
    });
    return true;
  };

  const shrink = (view: EditorView): boolean => {
    const saved = state.get(view);
    if (!saved || saved.doc !== view.state.doc) return false;
    const spans = new Map<number, Span>();
    const index: Array<number | null> = [...saved.index];
    view.state.selection.ranges.forEach((_r, i) => {
      const cur = saved.index[i];
      const prev = (cur ?? -1) - 1;
      const chain = saved.chains[i];
      if (cur == null || prev < 0 || !chain) return;
      spans.set(i, chain[prev]);
      index[i] = prev;
    });
    if (spans.size === 0) return false;
    selectAt(view, spans);
    state.set(view, { ...saved, index });
    return true;
  };

  return keymap.of([
    { key: "Shift-Alt-ArrowRight", preventDefault: true, run: expand },
    { key: "Shift-Alt-ArrowLeft", preventDefault: true, run: shrink },
  ]);
}
