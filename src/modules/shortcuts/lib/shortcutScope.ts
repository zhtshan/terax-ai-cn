import type { ShortcutId } from "@/modules/shortcuts/shortcuts";

function isPaneSwapShortcut(id: ShortcutId): boolean {
  return (
    id === "pane.swapLeft" ||
    id === "pane.swapRight" ||
    id === "pane.swapUp" ||
    id === "pane.swapDown"
  );
}

export function shouldDisablePaneSwapShortcut(
  id: ShortcutId,
  terminalPaneCount: number | null,
): boolean {
  return (
    isPaneSwapShortcut(id) &&
    (terminalPaneCount === null || terminalPaneCount < 2)
  );
}

// Ctrl+B belongs to the shell inside a focused terminal (tmux prefix, Claude
// Code's "run in background"). Cmd+B never reaches the PTY, so it always
// toggles the sidebar, like Cmd+G.
export function shouldDeferSidebarToggleToTerminal(
  inTerminal: boolean,
  e: Pick<KeyboardEvent, "ctrlKey" | "metaKey">,
): boolean {
  return inTerminal && e.ctrlKey && !e.metaKey;
}
