export type HighlightOptions = {
  regex: boolean;
  caseSensitive: boolean;
  whole_word: boolean;
};

export type HighlightSegment = { text: string; match: boolean };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRegex(pattern: string, opts: HighlightOptions): RegExp {
  const flags = opts.caseSensitive ? "g" : "gi";
  let body: string;
  if (opts.regex) {
    body = pattern;
  } else if (opts.whole_word) {
    body = `\\b${escapeRegex(pattern)}\\b`;
  } else {
    body = escapeRegex(pattern);
  }
  return new RegExp(body, flags);
}

export function splitHits(
  line: string,
  pattern: string,
  opts: HighlightOptions,
): HighlightSegment[] {
  const empty: HighlightSegment[] = [{ text: line, match: false }];
  if (pattern.length === 0) return empty;
  let regex: RegExp;
  try {
    regex = buildRegex(pattern, opts);
  } catch {
    return empty;
  }
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const match of line.matchAll(regex)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (start > cursor) {
      segments.push({ text: line.slice(cursor, start), match: false });
    }
    segments.push({ text: match[0], match: true });
    cursor = end;
  }
  if (cursor < line.length) {
    segments.push({ text: line.slice(cursor), match: false });
  }
  return segments.length === 0 ? empty : segments;
}
