import type { Text } from "@codemirror/state";

export type LspPos = { line: number; character: number };

export type LspRange = { start: LspPos; end?: LspPos };

// LSP position -> 文档偏移；行越界夹到文末，列越界夹到行尾。
export function offsetOf(doc: Text, pos: LspPos): number {
  if (pos.line >= doc.lines) return doc.length;
  const line = doc.line(pos.line + 1);
  return Math.min(line.from + pos.character, line.to);
}
