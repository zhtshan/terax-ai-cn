import { offsetOf, type LspPos, type LspRange } from "./positions";
import type { TeraxLspClient } from "./client";
import {
  type Extension,
  type Range,
  StateEffect,
  StateField,
  type Text,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

export type LspInlayHint = {
  position: LspPos;
  label: string | { value: string }[];
  paddingLeft?: boolean;
  paddingRight?: boolean;
};

const REQUEST_DEBOUNCE_MS = 250;
const VIEWPORT_MARGIN = 200;

export function inlayHintLabel(label: LspInlayHint["label"]): string {
  if (typeof label === "string") return label;
  return label.map((p) => p.value).join("");
}

class InlayHintWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly padLeft: boolean,
    readonly padRight: boolean,
  ) {
    super();
  }

  eq(other: InlayHintWidget): boolean {
    return (
      other.text === this.text &&
      other.padLeft === this.padLeft &&
      other.padRight === this.padRight
    );
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-lsp-inlay";
    span.textContent = this.text;
    span.style.marginLeft = this.padLeft ? "0.4em" : "";
    span.style.marginRight = this.padRight ? "0.4em" : "";
    return span;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

export function inlayHintDecorations(
  doc: Text,
  hints: LspInlayHint[],
): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  for (const hint of hints) {
    const text = inlayHintLabel(hint.label);
    if (!text) continue;
    // 服务器给的坐标只对应请求时的快照；越界说明 doc 已演化，直接丢弃。
    if (hint.position.line >= doc.lines) continue;
    const line = doc.line(hint.position.line + 1);
    if (hint.position.character > line.to - line.from) continue;
    const at = offsetOf(doc, hint.position);
    ranges.push(
      Decoration.widget({
        widget: new InlayHintWidget(
          text,
          hint.paddingLeft === true,
          hint.paddingRight === true,
        ),
        side: 1,
      }).range(at),
    );
  }
  return Decoration.set(ranges, true);
}

function offsetToPos(doc: Text, at: number): LspPos {
  const line = doc.lineAt(at);
  return { line: line.number - 1, character: at - line.from };
}

export function visibleLspRange(view: EditorView): LspRange {
  const doc = view.state.doc;
  return {
    start: offsetToPos(doc, Math.max(0, view.viewport.from - VIEWPORT_MARGIN)),
    end: offsetToPos(
      doc,
      Math.min(doc.length, view.viewport.to + VIEWPORT_MARGIN),
    ),
  };
}

const setInlayHints = StateEffect.define<DecorationSet>();

const inlayField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    value = value.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setInlayHints)) value = e.value;
    }
    return value;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// 稳定扩展面：能力探测与请求全部走 rawRequest，客户端只做渲染与节流。
export function lspInlayHints(opts: {
  client: TeraxLspClient;
  documentUri: string;
}): Extension {
  const supported = () =>
    opts.client.ready && opts.client.capabilities?.inlayHintProvider != null;

  const requestHints = async (
    view: EditorView,
    seq: { n: number },
  ): Promise<void> => {
    if (!supported()) return;
    const doc = view.state.doc;
    const token = ++seq.n;
    let raw: unknown;
    try {
      raw = await opts.client.rawRequest("textDocument/inlayHint", {
        textDocument: { uri: opts.documentUri },
        range: visibleLspRange(view),
      });
    } catch {
      return;
    }
    if (token !== seq.n || view.state.doc !== doc) return;
    const hints = Array.isArray(raw) ? (raw as LspInlayHint[]) : [];
    view.dispatch({
      effects: setInlayHints.of(inlayHintDecorations(doc, hints)),
    });
  };

  const plugin = ViewPlugin.fromClass(
    class {
      private timer: ReturnType<typeof setTimeout> | null = null;
      private seq = { n: 0 };

      constructor(readonly view: EditorView) {
        void opts.client.initializePromise.then(() => this.schedule());
      }

      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged || u.geometryChanged) {
          this.schedule();
        }
      }

      schedule() {
        if (this.timer != null) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.timer = null;
          void requestHints(this.view, this.seq);
        }, REQUEST_DEBOUNCE_MS);
      }

      destroy() {
        if (this.timer != null) clearTimeout(this.timer);
      }
    },
  );

  return [
    inlayField,
    plugin,
    EditorView.theme({
      ".cm-lsp-inlay": {
        color: "var(--muted-foreground)",
        fontSize: "0.92em",
      },
    }),
  ];
}
