import type {
  LspDocumentSymbolRaw,
  LspSymbolInformationRaw,
  RawDocumentSymbol,
} from "./client";

export type OutlineItem = {
  level: number;
  text: string;
  line: number;
  kind?: number;
};

function isSymbolInformation(
  s: RawDocumentSymbol,
): s is LspSymbolInformationRaw {
  return "location" in s;
}

// Servers may ignore hierarchicalDocumentSymbolSupport and answer with a flat
// SymbolInformation[] anyway. containerName is then the only parent hint
// available, so resolve it against symbols already seen above the current
// line. Best-effort by design: an unresolvable container (empty, or naming
// the file/module rather than a symbol) yields a top-level entry instead of
// a wrong nesting.
function levelsFromContainerNames(
  symbols: LspSymbolInformationRaw[],
): OutlineItem[] {
  const items = symbols
    .map((s) => ({
      level: 1,
      text: s.name,
      line: s.location.range.start.line + 1,
      kind: s.kind,
      container: s.containerName,
    }))
    .sort((a, b) => a.line - b.line);

  const levelByName = new Map<string, number>();
  for (const item of items) {
    const parentLevel =
      item.container && item.container !== item.text
        ? levelByName.get(item.container)
        : undefined;
    item.level = parentLevel !== undefined ? parentLevel + 1 : 1;
    levelByName.set(item.text, item.level);
  }

  return items.map(({ container: _container, ...item }) => item);
}

export function normalizeDocumentSymbols(
  raw: RawDocumentSymbol[] | null,
): OutlineItem[] {
  if (!raw || raw.length === 0) return [];

  // Servers return either a hierarchical DocumentSymbol[] or a flat
  // SymbolInformation[], never a mix within one response.
  if (isSymbolInformation(raw[0])) {
    return levelsFromContainerNames(raw as LspSymbolInformationRaw[]);
  }

  const items: OutlineItem[] = [];
  const walk = (symbols: LspDocumentSymbolRaw[], level: number) => {
    for (const s of symbols) {
      const pos = s.selectionRange?.start ?? s.range.start;
      items.push({ level, text: s.name, line: pos.line + 1, kind: s.kind });
      if (s.children && s.children.length > 0) walk(s.children, level + 1);
    }
  };
  walk(raw as LspDocumentSymbolRaw[], 1);

  // Some servers order children by name rather than position; keep the
  // outline matching the file's top-to-bottom order. Children always start
  // after their parent, so a stable sort by line preserves the pre-order
  // nesting that buildOutlineTree reads back from `level`.
  items.sort((a, b) => a.line - b.line);
  return items;
}
