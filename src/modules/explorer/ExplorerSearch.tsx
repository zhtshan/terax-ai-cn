import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Cancel01Icon,
  Folder01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { invoke } from "@tauri-apps/api/core";
import { currentWorkspaceEnv } from "@/modules/workspace";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { usePreferencesStore } from "@/modules/settings/preferences";
import { fileIconUrl } from "./lib/iconResolver";
import { copyToClipboard, revealInFinder } from "./lib/contextActions";
import { COMPACT_CONTENT, COMPACT_ITEM } from "./lib/menuItemClass";
import { cn } from "@/lib/utils";

type SearchHit = {
  path: string;
  rel: string;
  name: string;
  is_dir: boolean;
};

type SearchResult = {
  hits: SearchHit[];
  truncated: boolean;
};

type ContentHit = {
  path: string;
  rel: string;
  line: number;
  text: string;
};

type ContentResponse = {
  hits: ContentHit[];
  truncated: boolean;
};

const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 300;

type Props = {
  rootPath: string;
  onOpenFile: (path: string) => void;
  onOpenContentHit?: (path: string, line: number) => void;
  open: boolean;
  onRequestClose: () => void;
  onActiveChange?: (active: boolean) => void;
  onRevealInTerminal?: (path: string) => void;
  onAttachToAgent?: (path: string) => void;
};

export type ExplorerSearchHandle = {
  focus: () => void;
  isFocused: () => boolean;
};

export const ExplorerSearch = forwardRef<ExplorerSearchHandle, Props>(function ExplorerSearch({
  rootPath,
  onOpenFile,
  onOpenContentHit,
  open,
  onRequestClose,
  onActiveChange,
  onRevealInTerminal,
  onAttachToAgent,
}: Props,
  ref,
) {
  const { t } = useTranslation();
  const showHidden = usePreferencesStore((s) => s.showHidden);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [contentHits, setContentHits] = useState<ContentHit[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [contentSearching, setContentSearching] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [contentTruncated, setContentTruncated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastKeyboardNavAt = useRef(0);

  const active = query.trim().length > 0;
  const hasContentHits = contentHits.length > 0;

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      setQuery("");
      setResults([]);
      setContentHits([]);
      setSelectedIndex(0);
      setSearching(false);
      setContentSearching(false);
      setTruncated(false);
      setContentTruncated(false);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN) {
      setResults([]);
      setContentHits([]);
      setSelectedIndex(0);
      setSearching(false);
      setContentSearching(false);
      setTruncated(false);
      setContentTruncated(false);
      return;
    }
    setSearching(true);
    let alive = true;
    const handle = setTimeout(async () => {
      try {
        const res = await invoke<SearchResult>("fs_search", {
          root: rootPath,
          query: q,
          limit: 200,
          showHidden,
          workspace: currentWorkspaceEnv(),
        });
        if (alive) {
          setResults(res.hits);
          setTruncated(res.truncated);
          setSelectedIndex(0);
        }
      } catch (e) {
        if (alive) {
          console.error("fs_search failed:", e);
          setResults([]);
          setTruncated(false);
          setSelectedIndex(0);
        }
      } finally {
        if (alive) setSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [query, rootPath, showHidden]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY_LEN || !onOpenContentHit) return;
    setContentSearching(true);
    let alive = true;
    const handle = setTimeout(async () => {
      try {
        const res = await invoke<ContentResponse>("fs_grep_interactive", {
          pattern: q,
          root: rootPath,
          limit: 80,
          workspace: currentWorkspaceEnv(),
        });
        if (alive) {
          setContentHits(res.hits);
          setContentTruncated(res.truncated);
        }
      } catch (e) {
        if (alive) {
          console.error("fs_grep failed:", e);
          setContentHits([]);
          setContentTruncated(false);
        }
      } finally {
        if (alive) setContentSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      alive = false;
      clearTimeout(handle);
    };
  }, [query, rootPath, onOpenContentHit]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      },
      isFocused: () => document.activeElement === inputRef.current,
    }),
    [],
  );

  useEffect(() => {
    if (active && results.length > 0) {
      const el = scrollRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, results, active]);

  const handleSelect = (hit: SearchHit) => {
    if (!hit.is_dir) {
      onOpenFile(hit.path);
    }
  };

  return (
    <div className={cn("flex flex-col", active && "min-h-0 flex-1")}>
      {open ? (
        <div className="relative shrink-0 px-2 py-1.5 animate-in fade-in-0 slide-in-from-top-3 duration-200 ease-out">
          <HugeiconsIcon
            icon={Search01Icon}
            size={13}
            strokeWidth={2}
            className="absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                onRequestClose();
                return;
              }
              if (results.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  lastKeyboardNavAt.current = Date.now();
                  setSelectedIndex((prev) => (prev + 1) % results.length);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  lastKeyboardNavAt.current = Date.now();
                  setSelectedIndex(
                    (prev) => (prev - 1 + results.length) % results.length,
                  );
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  handleSelect(results[selectedIndex]);
                }
              }
            }}
            placeholder={t('explorer.searchFilesPlaceholder')}
            className="h-7 pr-7 pl-6.5 text-xs"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-3.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
               aria-label={t('search.clearSearch')}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
            </button>
          ) : null}
        </div>
      ) : null}

      {active ? (
        <ScrollArea className="min-h-0 flex-1">
          <div className="py-1" ref={scrollRef}>
            {searching && results.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-muted-foreground">
                {t('explorer.searching')}
              </div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-muted-foreground">
                {t('explorer.noMatches')}
              </div>
            ) : (
              results.map((hit, index) => {
                const url = hit.is_dir ? null : fileIconUrl(hit.name);
                const isSelected = index === selectedIndex;
                return (
                  <ContextMenu key={hit.path}>
                    <ContextMenuTrigger asChild>
                      <button
                        type="button"
                        data-index={index}
                        onClick={() => handleSelect(hit)}
                        onMouseEnter={() => {
                          if (Date.now() - lastKeyboardNavAt.current > 250) {
                            setSelectedIndex(index);
                          }
                        }}
                        className={cn(
                          "flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs transition-colors",
                          isSelected ? "bg-accent text-foreground" : "hover:bg-accent/50 text-foreground/80"
                        )}
                        title={hit.path}
                      >
                        {url ? (
                          <img src={url} alt="" className="size-3.5 shrink-0" />
                        ) : (
                          <HugeiconsIcon
                            icon={Folder01Icon}
                            size={13}
                            strokeWidth={1.75}
                            className="shrink-0 text-muted-foreground"
                          />
                        )}
                        <span className="truncate">{hit.name}</span>
                        <span className="ml-auto truncate text-[10px] text-muted-foreground">
                          {hit.rel}
                        </span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent className={COMPACT_CONTENT}>
                      {!hit.is_dir && (
                        <ContextMenuItem
                          className={COMPACT_ITEM}
                          onSelect={() => onOpenFile(hit.path)}
                        >
                          {t('explorer.open')}
                        </ContextMenuItem>
                      )}
                      {hit.is_dir && onRevealInTerminal && (
                        <ContextMenuItem
                          className={COMPACT_ITEM}
                          onSelect={() => onRevealInTerminal(hit.path)}
                        >
                          {t('explorer.openInTerminal')}
                        </ContextMenuItem>
                      )}
                      <ContextMenuItem
                        className={COMPACT_ITEM}
                        onSelect={() => void revealInFinder(hit.path)}
                      >
                        {t('explorer.revealInFinder')}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className={COMPACT_ITEM}
                        onSelect={() => void copyToClipboard(hit.path)}
                      >
                        {t('explorer.copyPath')}
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className={COMPACT_ITEM}
                        onSelect={() => onAttachToAgent?.(hit.path)}
                      >
                        {t('explorer.attachToAgent')}
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })
            )}
            {truncated && results.length > 0 ? (
              <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
                {t('explorer.partialResults')}
              </div>
            ) : null}
            {onOpenContentHit && (
              <>
                <div className="mx-2 my-1.5 border-t border-border/40" />
                {contentSearching && contentHits.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">
                    {t('explorer.searching')}
                  </div>
                ) : hasContentHits ? (
                  contentHits.map((hit, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                      <button
                        key={`${hit.path}:${hit.line}`}
                        onClick={() => onOpenContentHit(hit.path, hit.line)}
                        onMouseEnter={() => {
                          if (Date.now() - lastKeyboardNavAt.current > 250) {
                            setSelectedIndex(index);
                          }
                        }}
                        className={cn(
                          "flex w-full items-center gap-1.5 px-2 py-1 text-left text-xs transition-colors",
                          isSelected ? "bg-accent text-foreground" : "hover:bg-accent/50 text-foreground/80"
                        )}
                        title={`${hit.path}:${hit.line}`}
                      >
                        <img
                          src={fileIconUrl(hit.rel)}
                          alt=""
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate text-[11px] text-muted-foreground">
                          {hit.rel}:{hit.line}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[11px]">
                          {hit.text.trim()}
                        </span>
                      </button>
                    );
                  })
                ) : query.trim().length >= MIN_QUERY_LEN ? (
                  <div className="px-3 py-2 text-[11px] text-muted-foreground">
                    {t('explorer.noMatches')}
                  </div>
                ) : null}
                {contentTruncated && contentHits.length > 0 ? (
                  <div className="px-3 py-1.5 text-[10px] text-muted-foreground">
                    {t('explorer.partialResults')}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </ScrollArea>
      ) : null}
    </div>
  );
});
