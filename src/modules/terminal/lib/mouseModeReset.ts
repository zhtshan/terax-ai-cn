import type { Terminal } from "@xterm/xterm";

// A TUI killed without cleanup (SIGKILL, crash, dropped SSH) leaves mouse
// tracking on, so xterm forwards every drag to the PTY instead of selecting.
export const MOUSE_TRACKING_DISABLE =
  "\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?1015l";

export function resetMouseTracking(term: Terminal): boolean {
  if (term.modes.mouseTrackingMode === "none") return false;
  term.write(MOUSE_TRACKING_DISABLE);
  return true;
}
