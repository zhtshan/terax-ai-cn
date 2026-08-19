import { useCallback, useLayoutEffect, useRef } from "react";

const STORE_KEY = "terax-ui-input-bar-height";
const MIN_HEIGHT = 96;
const MAX_HEIGHT_RATIO = 0.7;

function loadHeight(): number | null {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function saveHeight(h: number) {
  try {
    window.localStorage.setItem(STORE_KEY, String(Math.round(h)));
  } catch {
    // private mode / quota — height just won't persist
  }
}

function maxHeight(): number {
  return Math.round(window.innerHeight * MAX_HEIGHT_RATIO);
}

/** Lets the docked AI input bar be dragged taller/shorter via a handle above
 * it. Writes the height directly to the DOM (no React state) so dragging
 * doesn't re-render the tree; only mirrors into a ref for the next gesture's
 * start value. Height is left unset until the user's first drag so the
 * input bar's own CSS-grid open/close animation (`.terax-reveal`, which
 * needs an intrinsically-sized container) is never disturbed by default.
 *
 * Once a height has been saved, call `setOpen` whenever the input bar's
 * open/closed state changes: it clears the pinned height while closed (so
 * `.terax-reveal` can collapse the wrapper to 0) and restores it on reopen.
 * Otherwise the saved pixel height would keep the wrapper's box reserved
 * even while the inner content is collapsed.
 *
 * When `containerRef` is provided, also observes the container's size and
 * clamps the saved height to fit, so resizing the parent panel (e.g. the
 * workspace ResizablePanel) propagates to the input bar. */
export function useInputBarHeightResize(
  containerRef?: React.RefObject<HTMLDivElement | null>,
) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const height = useRef<number | null>(null);
  const openRef = useRef(true);

  useLayoutEffect(() => {
    const saved = loadHeight();
    if (saved == null) return;
    height.current = Math.min(saved, maxHeight());
    const el = wrapperRef.current;
    if (el) el.style.height = `${height.current}px`;
  }, []);

  // Sync height when the parent panel resizes.
  useLayoutEffect(() => {
    const container = containerRef?.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      const el = wrapperRef.current;
      if (!el) return;
      if (height.current == null) return;
      const maxH = Math.min(maxHeight(), container.clientHeight - 44);
      const next = Math.min(height.current, maxH);
      if (Math.abs(next - height.current) <= 2) return;
      height.current = next;
      // While closed the wrapper must stay unpinned so `.terax-reveal` can
      // collapse it; the clamped value lands on the next setOpen(true).
      if (openRef.current) el.style.height = `${next}px`;
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const el = wrapperRef.current;
    if (!el) return;
    const pointerId = e.pointerId;
    const startY = e.clientY;
    const startHeight = height.current ?? el.getBoundingClientRect().height;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture?.(pointerId);
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      const dy = startY - ev.clientY;
      const next = Math.min(
        Math.max(startHeight + dy, MIN_HEIGHT),
        maxHeight(),
      );
      height.current = next;
      el.style.height = `${next}px`;
    };
    // Listeners live on window, not the handle: the handle unmounts when the
    // input bar closes mid-drag, and an element-scoped pointerup would never
    // fire, stranding the body's cursor and user-select overrides.
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      try {
        target.releasePointerCapture?.(pointerId);
      } catch {
        // handle already unmounted, capture is released with it
      }
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (height.current != null) saveHeight(height.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    openRef.current = open;
    const el = wrapperRef.current;
    if (!el) return;
    el.style.height = open && height.current != null ? `${height.current}px` : "";
  }, []);

  return { wrapperRef, onHandlePointerDown, setOpen };
}
