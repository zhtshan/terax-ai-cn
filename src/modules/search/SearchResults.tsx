import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ContentHit } from "./lib/types";
import { splitHits, type HighlightOptions } from "./lib/highlight";

type FileGroup = {
  path: string;
  rel: string;
  hits: ContentHit[];
};

export type SearchResultsProps = {
  hits: ContentHit[];
  pattern: string;
  options: HighlightOptions;
  emptyLabel?: string;
  truncated?: boolean;
  truncatedLabel?: string;
};

function groupByRel(hits: ContentHit[]): FileGroup[] {
  const map = new Map<string, FileGroup>();
  for (const hit of hits) {
    let group = map.get(hit.rel);
    if (!group) {
      group = { path: hit.path, rel: hit.rel, hits: [] };
      map.set(hit.rel, group);
    }
    group.hits.push(hit);
  }
  return Array.from(map.values());
}

export function SearchResults({
  hits,
  pattern,
  options,
  emptyLabel = "No results",
  truncated,
  truncatedLabel = "Results truncated",
}: SearchResultsProps) {
  const groups = useMemo(() => groupByRel(hits), [hits]);

  if (hits.length === 0) {
    return (
      <div className="px-3 py-2 text-[11px] text-muted-foreground">{emptyLabel}</div>
    );
  }

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="py-1">
        {groups.map((group) => {
          const isOpen = group.hits.length > 0;
          return (
            <details
              key={group.rel}
              open={isOpen}
              className="group border-b border-border/30 last:border-b-0"
            >
              <summary
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-foreground/85 hover:bg-accent/40",
                )}
              >
                <span className="text-muted-foreground/70">▸</span>
                <span className="truncate">{group.rel}</span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {group.hits.length}
                </span>
              </summary>
              <div className="pb-1">
                {group.hits.map((hit, i) => {
                  const segments = splitHits(hit.text, pattern, options);
                  return (
                    <div
                      key={`${hit.path}:${hit.line}:${i}`}
                      className="flex gap-2 px-3 py-0.5 font-mono text-[11px] hover:bg-accent/30"
                    >
                      <span className="w-10 shrink-0 text-right text-muted-foreground/70 tabular-nums">
                        {hit.line}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {segments.map((seg, j) =>
                          seg.match ? (
                            <mark
                              key={j}
                              className="rounded bg-yellow-300/40 px-0.5 text-foreground dark:bg-yellow-500/40"
                            >
                              {seg.text}
                            </mark>
                          ) : (
                            <span key={j}>{seg.text}</span>
                          ),
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
        {truncated ? (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
            {truncatedLabel}
          </div>
        ) : null}
      </div>
    </ScrollArea>
  );
}