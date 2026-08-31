import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { labelFor, subtitleFor } from "./lib/tabLabel";
import type { TabSwitcherState } from "./lib/useTabSwitcher";
import type { Tab } from "./lib/useTabs";
import { TabIcon } from "./TabBar";

export function TabSwitcherHud({
  tabs,
  state,
}: {
  tabs: Tab[];
  state: TabSwitcherState;
}) {
  const byId = useMemo(() => new Map(tabs.map((t) => [t.id, t])), [tabs]);
  const rows = state.order
    .map((id) => byId.get(id))
    .filter((t): t is Tab => t !== undefined);
  const selectedId = state.order[state.index];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
    >
      <div className="flex max-h-[60vh] w-72 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-border bg-popover/95 p-1.5 shadow-2xl ring-1 ring-foreground/5 backdrop-blur-md">
        {rows.map((t) => {
          const subtitle = subtitleFor(t);
          return (
            <div
              key={t.id}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs",
                t.id === selectedId
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <TabIcon tab={t} />
              <span className="min-w-0 flex-1 truncate">{labelFor(t)}</span>
              {subtitle && (
                <span className="shrink-0 truncate text-[10px] text-muted-foreground/55">
                  {subtitle}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
