import path from "node:path";

export type FileLinkCandidate = {
  path: string;
  line?: number;
  col?: number;
  start: number;
  end: number;
};

/**
 * Matches file paths in a line of terminal output.
 * Supports: `path`, `path:line`, `path:line:col`
 * Requires at least one `/` and a recognized code-file extension.
 */
const LINK_RE =
  /(?<![^\s])(['"]?([^\s\t\n\r()<>\[\]{}=:]*\/[^\s\t\n\r()<>\[\]{}=:]*\.[a-zA-Z]{2,5}))(?::(\d+)(?::(\d+))?)?(?=[\s,;)\]>"'"]|$)/g;

export function matchFileLinks(line: string): FileLinkCandidate[] {
  const results: FileLinkCandidate[] = [];
  LINK_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = LINK_RE.exec(line)) !== null) {
    const fullPath = match[2]!;
    const lineNum = match[3];
    const colNum = match[4];
    // Outer group (match[1]) may include a leading quote; inner group (match[2]) is the actual path
    const quoteOffset = match[1]!.length - fullPath.length;
    const start = match.index + quoteOffset;
    const end = start + fullPath.length;

    results.push({
      path: fullPath,
      line: lineNum !== undefined ? Number(lineNum) : undefined,
      col: colNum !== undefined ? Number(colNum) : undefined,
      start,
      end,
    });
  }

  return results;
}

/**
 * Resolves a candidate path against `cwd` to produce an absolute path.
 * Returns null if `cwd` is null (cannot resolve relative paths without a base).
 */
export function resolvePath(pathStr: string, cwd: string | null): string | null {
  if (cwd === null) {
    return null;
  }

  if (pathStr.startsWith("/")) {
    return path.posix.resolve(pathStr);
  }

  return path.posix.normalize(path.posix.join(cwd, pathStr));
}

/**
 * Checks whether `absPath` lies inside (or equals) the workspace `explorerRoot`.
 */
export function isInsideWorkspace(
  absPath: string,
  explorerRoot: string,
): boolean {
  const root = explorerRoot.endsWith("/")
    ? explorerRoot.slice(0, -1)
    : explorerRoot;
  return absPath === root || absPath.startsWith(root + "/");
}
