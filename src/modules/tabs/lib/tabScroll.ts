// Target scrollLeft to bring a tab into the strip's viewport, VS Code style:
// reveal by the left edge when it sits before the viewport, otherwise align
// its right edge. Returns the input unchanged when already fully visible.
export function nextScrollLeftForTab(
  current: number,
  viewport: number,
  tabStart: number,
  tabEnd: number,
): number {
  if (viewport <= 0) return current;
  if (tabStart < current) return tabStart;
  if (tabEnd > current + viewport) return tabEnd - viewport;
  return current;
}
