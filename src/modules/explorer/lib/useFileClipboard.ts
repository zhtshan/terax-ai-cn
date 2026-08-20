import { useCallback, useSyncExternalStore } from "react";

type ClipboardState = {
  paths: string[];
  mode: "copy" | "cut";
} | null;

// Module-level singleton state
let state: ClipboardState = null;
let listener: (() => void) | null = null;

function emitChange() {
  listener?.();
}

function subscribe(cb: () => void) {
  listener = cb;
  return () => {
    listener = null;
  };
}

function getSnapshot(): ClipboardState {
  return state;
}

function setState(next: ClipboardState) {
  state = next;
  emitChange();
}

export function useFileClipboard() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  const copy = useCallback((path: string) => {
    setState({ paths: [path], mode: "copy" });
  }, []);

  const cut = useCallback((path: string) => {
    setState({ paths: [path], mode: "cut" });
  }, []);

  const paste = useCallback((): ClipboardState => {
    return state;
  }, []);

  const clear = useCallback(() => {
    setState(null);
  }, []);

  return {
    paths: snapshot?.paths ?? [],
    mode: snapshot?.mode ?? null,
    isEmpty: snapshot === null,
    copy,
    cut,
    paste,
    clear,
  };
}
