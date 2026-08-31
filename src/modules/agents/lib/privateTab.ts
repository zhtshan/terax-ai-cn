import type { Tab } from "@/modules/tabs";

/** Private terminals hide agent activity on the tab icon; notifications must
 * stay silent for the same reason (lock screens, screen shares). */
export function isPrivateTab(tabs: Tab[], tabId: number): boolean {
  const t = tabs.find((x) => x.id === tabId);
  return t?.kind === "terminal" && t.private === true;
}
