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

// Servers return either a hierarchical DocumentSymbol[] (hasHierarchicalDocumentSymbolSupport)
// or a flat SymbolInformation[], never a mix within one response.
export function normalizeDocumentSymbols(
  raw: RawDocumentSymbol[] | null,
): OutlineItem[] {
  if (!raw || raw.length === 0) return [];
  const items: OutlineItem[] = [];

  if (isSymbolInformation(raw[0])) {
    for (const s of raw as LspSymbolInformationRaw[]) {
      items.push({
        level: 1,
        text: s.name,
        line: s.location.range.start.line + 1,
        kind: s.kind,
      });
    }
  } else {
    const walk = (symbols: LspDocumentSymbolRaw[], level: number) => {
      for (const s of symbols) {
        const pos = s.selectionRange?.start ?? s.range.start;
        items.push({ level, text: s.name, line: pos.line + 1, kind: s.kind });
        if (s.children && s.children.length > 0) walk(s.children, level + 1);
      }
    };
    walk(raw as LspDocumentSymbolRaw[], 1);
  }

  // Some servers sort SymbolInformation by name rather than position; keep
  // the outline matching the file's actual top-to-bottom order.
  items.sort((a, b) => a.line - b.line);
  return items;
}
