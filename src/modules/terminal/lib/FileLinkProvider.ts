import type { Terminal, IDisposable, ILink, IBufferRange } from "@xterm/xterm";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { getLspNavigator } from "@/modules/lsp/lib/navigator";
import { leafCwd } from "./useTerminalSession";
import { isInsideWorkspace, matchFileLinks, resolvePath } from "./fileLinkMatch";

export type FileLinkProviderOptions = {
  getLeafId: () => number | null;
  // Lazy read: the workspace root resolves after slot creation and changes
  // on cd / workspace switch, so it must not be captured at registration.
  getExplorerRoot: () => string | null;
};

/**
 * Maps a character offset in the joined wrapped line string to a buffer cell
 * position (0-based). Returns [-1, -1] if the offset cannot be resolved.
 * Based on xterm.js LinkComputer._mapStrIdx.
 */
function mapStrIdx(
  term: Terminal,
  lineIndex: number,
  rowIndex: number,
  stringIndex: number,
): [number, number] {
  const buf = term.buffer.active;
  const cell = buf.getNullCell();
  let start = rowIndex;
  while (stringIndex) {
    const line = buf.getLine(lineIndex);
    if (!line) {
      return [-1, -1];
    }
    for (let i = start; i < line.length; ++i) {
      line.getCell(i, cell);
      const chars = cell.getChars();
      const width = cell.getWidth();
      if (width) {
        stringIndex -= chars.length || 1;
        // correct stringIndex for early wrapped wide chars:
        // if at end of line and the next line is wrapped with a wide char,
        // the current cell was consumed by the wrap — compensate.
        if (i === line.length - 1 && chars === "") {
          const nextLine = buf.getLine(lineIndex + 1);
          if (nextLine && nextLine.isWrapped) {
            nextLine.getCell(0, cell);
            if (cell.getWidth() === 2) {
              stringIndex += 1;
            }
          }
        }
      }
      if (stringIndex < 0) {
        return [lineIndex, i];
      }
    }
    lineIndex++;
    start = 0;
  }
  return [lineIndex, start];
}

/**
 * Gets the windowed line strings for a given buffer line index, handling
 * wrapped lines the same way as xterm.js WebLinkProvider.
 */
function getWindowedLineStrings(
  term: Terminal,
  lineIndex: number,
): [string[], number] {
  let line = term.buffer.active.getLine(lineIndex);
  let topIdx = lineIndex;
  let bottomIdx = lineIndex;
  let length = 0;
  const lines: string[] = [];

  if (line) {
    const currentContent = line.translateToString(true);

    // expand top, stop on whitespaces or length > 2048
    if (line.isWrapped && currentContent[0] !== " ") {
      length = 0;
      while (
        (line = term.buffer.active.getLine(--topIdx)) &&
        length < 2048
      ) {
        const content = line.translateToString(true);
        length += content.length;
        lines.push(content);
        if (!line.isWrapped || content.indexOf(" ") !== -1) {
          break;
        }
      }
      lines.reverse();
    }

    lines.push(line!.translateToString(true));

    // expand bottom, stop on whitespaces or length > 2048
    length = 0;
    line = term.buffer.active.getLine(++bottomIdx);
    while (line && line.isWrapped && length < 2048) {
      const content = line.translateToString(true);
      length += content.length;
      lines.push(content);
      if (content.indexOf(" ") !== -1) {
        break;
      }
      line = term.buffer.active.getLine(++bottomIdx);
    }
  }

  return [lines, topIdx];
}

export function registerFileLinkProvider(
  term: Terminal,
  options: FileLinkProviderOptions,
): IDisposable {
  const provider = {
    provideLinks(
      bufferLineNumber: number,
      callback: (links: ILink[] | undefined) => void,
    ): void {
      const leafId = options.getLeafId();
      const cwd = leafId !== null ? leafCwd(leafId) : null;
      const explorerRoot = options.getExplorerRoot();
      if (explorerRoot === null) {
        callback(undefined);
        return;
      }

      const [lines, startLineIndex] = getWindowedLineStrings(
        term,
        bufferLineNumber - 1,
      );
      const text = lines.join("");

      const candidates = matchFileLinks(text);
      const links: ILink[] = [];

      for (const candidate of candidates) {
        const absPath = resolvePath(candidate.path, cwd);
        if (absPath === null) continue;
        if (!isInsideWorkspace(absPath, explorerRoot)) continue;

        // Map string indices to buffer positions.
        const [startY, startX] = mapStrIdx(
          term,
          startLineIndex,
          0,
          candidate.start,
        );
        const [endY, endX] = mapStrIdx(
          term,
          startY,
          startX,
          candidate.end - candidate.start,
        );

        if (startY === -1 || startX === -1 || endY === -1 || endX === -1) {
          continue;
        }

        const range: IBufferRange = {
          start: { x: startX + 1, y: startY + 1 },
          end: { x: endX + 1, y: endY + 1 },
        };

        links.push({
          range,
          text: candidate.path,
          decorations: {
            underline: true,
            pointerCursor: true,
          },
          activate: async (event, _text) => {
            if (!(event.metaKey || event.ctrlKey)) return;
            const nav = getLspNavigator();
            if (!nav) return;
            const explorerRoot = options.getExplorerRoot();
            if (explorerRoot === null) return;
            const clickedLeafId = options.getLeafId();
            const clickCwd =
              clickedLeafId !== null ? leafCwd(clickedLeafId) : null;
            const clickedAbsPath = resolvePath(candidate.path, clickCwd);
            if (clickedAbsPath === null) return;
            if (!isInsideWorkspace(clickedAbsPath, explorerRoot)) return;
            try {
              const result = await invoke<{ kind: string }>(
                "fs_stat",
                { path: clickedAbsPath },
              );
              if (result.kind === "Dir") {
                toast.error("不能打开目录");
                return;
              }
              nav.openFile(clickedAbsPath, candidate.line ?? 0);
            } catch {
              toast.error("文件不存在");
            }
          },
        });
      }

      callback(links.length > 0 ? links : undefined);
    },
  };

  return term.registerLinkProvider(provider);
}
