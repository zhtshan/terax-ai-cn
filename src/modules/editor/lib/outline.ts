import { syntaxTree } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export type MarkdownHeading = {
  level: number;
  text: string;
  line: number;
};

// ATXHeading1..6 node type IDs in @lezer/markdown (confirmed from parser.nodeSet.types):
// ATXHeading1=9, ATXHeading2=10, ..., ATXHeading6=14
const ATX_HEADING_IDS = new Set([9, 10, 11, 12, 13, 14]);

function extractHeadings(view: EditorView): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const tree = syntaxTree(view.state);
  tree.iterate({
    enter(node) {
      if (!ATX_HEADING_IDS.has(node.type.id)) return;
      const lineNum = view.state.doc.lineAt(node.from).number;
      const lineText = view.state.doc.line(lineNum).text;
      const text = lineText.replace(/^#+\s*/, "").trim();
      const level = node.type.id - 8; // 9→1, 10→2, ..., 14→6
      headings.push({ level, text, line: lineNum });
    },
  });
  return headings;
}

function findActiveHeading(
  headings: MarkdownHeading[],
  cursorLine: number,
): number | null {
  let active: number | null = null;
  for (const h of headings) {
    if (h.line <= cursorLine) active = h.line;
    else break;
  }
  return active;
}

let onOutlineChangeRef = {
  current: ((_: MarkdownHeading[] | null) => {}) as (
    h: MarkdownHeading[] | null,
  ) => void,
};
let onActiveHeadingRef = {
  current: ((_: number | null) => {}) as (l: number | null) => void,
};

export function setOutlineCallbacks(
  onOutlineChange: (h: MarkdownHeading[] | null) => void,
  onActiveHeadingChange: (l: number | null) => void,
): void {
  onOutlineChangeRef.current = onOutlineChange;
  onActiveHeadingRef.current = onActiveHeadingChange;
}

export function outlineExtension(
  onOutlineChange?: (h: MarkdownHeading[] | null) => void,
  onActiveHeadingChange?: (l: number | null) => void,
): Extension {
  if (onOutlineChange) {
    setOutlineCallbacks(onOutlineChange, onActiveHeadingChange ?? (() => {}));
  }
  return EditorView.updateListener.of((update) => {
    const view = update.view;
    // Document changed: re-extract headings with debounce.
    if (update.docChanged) {
      clearTimeout(
        (view as unknown as Record<string, ReturnType<typeof setTimeout>>)
          .outlineDebounceRef as unknown as number,
      );
      (
        view as unknown as Record<string, ReturnType<typeof setTimeout>>
      ).outlineDebounceRef = setTimeout(() => {
        const fresh = extractHeadings(view);
        const hasChanged =
          fresh.length !==
            (view as unknown as Record<string, MarkdownHeading[]>)
              .outlineHeadings?.length ||
          fresh.some(
            (h, i) =>
              h.line !==
              (view as unknown as Record<string, MarkdownHeading[]>)
                .outlineHeadings?.[i]?.line,
          );
        if (hasChanged) {
          (
            view as unknown as Record<string, MarkdownHeading[]>
          ).outlineHeadings = fresh;
          onOutlineChangeRef.current(fresh.length > 0 ? fresh : null);
        }
      }, 300);
    }
    // Cursor moved (not an explicit selection set): detect by comparing head position.
    if (
      !update.selectionSet &&
      !update.docChanged &&
      update.transactions.length === 0
    ) {
      const cursorLine = view.state.doc.lineAt(
        view.state.selection.main.head,
      ).number;
      const headings = (view as unknown as Record<string, MarkdownHeading[]>)
        .outlineHeadings;
      if (headings) {
        const activeLine = findActiveHeading(headings, cursorLine);
        onActiveHeadingRef.current(activeLine);
      }
    }
  });
}
