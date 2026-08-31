import type { Tab } from "./useTabs";

/**
 * The label shown on a tab. Non-terminal tabs use their stored title; terminal
 * tabs prefer a user-set custom name, then fall back to the last segment of the
 * cwd. Keeping this pure makes the "custom name survives a cd" invariant
 * testable without rendering the bar.
 */
export function labelFor(t: Tab): string {
  if (t.kind === "editor") return t.title;
  if (t.kind === "preview") return t.title;
  if (t.kind === "markdown") return t.title;
  if (t.kind === "ai-diff") return t.title;
  if (t.kind === "git-diff") return t.title;
  if (t.kind === "git-history") return t.title;
  if (t.kind === "git-commit-file") return t.title;
  if (t.customTitle) return t.customTitle;
  if (!t.cwd) return t.title;
  const parts = t.cwd.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "/";
}

/**
 * Secondary hint shown next to a label in switcher surfaces (HUD rows, space
 * overview). One shared copy so TabSwitcherHud and SpaceSwitcher stay in
 * lockstep.
 */
export function subtitleFor(t: Tab): string | null {
  if (t.kind === "terminal") {
    if (!t.cwd) return null;
    const segs = t.cwd.split(/[\\/]/).filter(Boolean);
    return segs.slice(-2).join("/") || t.cwd;
  }
  if (t.kind === "editor" || t.kind === "markdown") {
    const segs = t.path.split(/[\\/]/).filter(Boolean);
    return segs.slice(-2, -1)[0] ?? null;
  }
  return null;
}
