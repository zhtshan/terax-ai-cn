import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { native, type GitLogEntry } from "@/modules/ai/lib/native";
import { formatRelativeTime } from "@/modules/git-history/lib/relativeTime";
import {
  Clock01Icon,
  GitBranchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "./SectionHeader";

const PAGE_SIZE = 30;

type CommitFileDiffOpenInput = {
  repoRoot: string;
  sha: string;
  shortSha: string;
  subject: string;
  path: string;
  originalPath: string | null;
};

type LoadStatus = "idle" | "loading" | "more" | "error" | "initial";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  activeFilePath?: string | null;
  repoRoot?: string | null;
  onOpenCommitFile: (input: CommitFileDiffOpenInput) => void;
};

export function TimelineSection({
  collapsed,
  onToggle,
  activeFilePath,
  repoRoot: providedRepoRoot,
  onOpenCommitFile,
}: Props) {
  const { t } = useTranslation();
  const [commits, setCommits] = useState<GitLogEntry[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [endReached, setEndReached] = useState(false);
  const [resolvedRepoRoot, setResolvedRepoRoot] = useState<string | null>(
    providedRepoRoot ?? null,
  );

  const requestIdRef = useRef(0);
  const moreInflightRef = useRef(false);

  // activeFilePath 变化：重置 + 解析 repo root + 加载首页
  useEffect(() => {
    if (!activeFilePath) {
      setCommits([]);
      setStatus("idle");
      setError(null);
      setResolvedRepoRoot(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    setCommits([]);
    setStatus("initial");
    setError(null);
    setEndReached(false);
    let cancelled = false;

    const resolveAndLoad = async () => {
      let root = providedRepoRoot ?? null;
      if (!root) {
        try {
          const info = await native.gitResolveRepo(activeFilePath);
          if (cancelled || requestId !== requestIdRef.current) return;
          root = info?.repoRoot ?? null;
        } catch (err) {
          if (cancelled || requestId !== requestIdRef.current) return;
          setStatus("error");
          setError(err instanceof Error ? err.message : String(err));
          return;
        }
      }
      setResolvedRepoRoot(root);
      if (!root) {
        setStatus("idle");
        return;
      }
      try {
        const entries = await native.gitLogFile(root, activeFilePath, {
          limit: PAGE_SIZE,
        });
        if (cancelled || requestId !== requestIdRef.current) return;
        setCommits(entries);
        setStatus("idle");
        if (entries.length === 0) setEndReached(true);
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    };

    void resolveAndLoad();
    return () => {
      cancelled = true;
    };
  }, [activeFilePath, providedRepoRoot]);

  const loadMore = useCallback(async () => {
    if (!resolvedRepoRoot || !activeFilePath) return;
    if (moreInflightRef.current) return;
    if (status !== "idle" || endReached) return;
    const last = commits[commits.length - 1];
    if (!last) return;
    moreInflightRef.current = true;
    setStatus("more");
    try {
      const entries = await native.gitLogFile(resolvedRepoRoot, activeFilePath, {
        limit: PAGE_SIZE,
        beforeSha: last.sha,
      });
      setCommits((prev) => {
        const seen = new Set(prev.map((c) => c.sha));
        const merged = [...prev];
        for (const e of entries) if (!seen.has(e.sha)) merged.push(e);
        return merged;
      });
      if (entries.length < PAGE_SIZE) setEndReached(true);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    } finally {
      moreInflightRef.current = false;
    }
  }, [resolvedRepoRoot, activeFilePath, commits, endReached, status]);

  // 列表内容
  const listContent = useMemo(() => {
    if (!activeFilePath) {
      return (
        <div className="flex flex-1 items-center justify-center px-3 py-3 text-center text-[11px] text-muted-foreground">
          {t("explorer.timelineNoFile")}
        </div>
      );
    }
    if (status === "initial") {
      return (
        <div className="flex flex-1 items-center justify-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
          <Spinner className="size-3" />
          <span>{t("explorer.timelineLoading")}</span>
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="flex flex-1 items-center justify-center px-3 py-3 text-center text-[11px] text-destructive">
          {error ?? t("explorer.timelineLoadMoreFailed")}
        </div>
      );
    }
    if (!resolvedRepoRoot) {
      return (
        <div className="flex flex-1 items-center justify-center px-3 py-3 text-center text-[11px] text-muted-foreground">
          {t("explorer.timelineOutsideRepo")}
        </div>
      );
    }
    if (commits.length === 0) {
      return null;
    }
    return (
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-border">
          {commits.map((c) => (
            <li key={c.sha}>
              <button
                type="button"
                onClick={() =>
                  onOpenCommitFile({
                    repoRoot: resolvedRepoRoot,
                    sha: c.sha,
                    shortSha: c.shortSha,
                    subject: c.subject,
                    path: activeFilePath,
                    originalPath: c.oldPath,
                  })
                }
                className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left transition-colors hover:bg-accent/60"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <HugeiconsIcon
                    icon={GitBranchIcon}
                    size={11}
                    strokeWidth={2}
                  />
                  <span className="font-mono">{c.shortSha}</span>
                  <span className="flex-1 truncate text-foreground/80">
                    {c.subject}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate">{c.author}</span>
                  <span className="shrink-0">
                    {formatRelativeTime(c.timestampSecs)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <Sentinel
          endReached={endReached}
          moreStatus={status === "more"}
          onIntersect={loadMore}
        />
      </div>
    );
  }, [
    activeFilePath,
    status,
    error,
    resolvedRepoRoot,
    commits,
    endReached,
    onOpenCommitFile,
    loadMore,
    t,
  ]);

  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title={t("explorer.timeline")}
        collapsed={collapsed}
        onToggle={onToggle}
        icon={<HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />}
      />
      {!collapsed && <div className="flex min-h-0 flex-1 flex-col">{listContent}</div>}
    </div>
  );
}

type SentinelProps = {
  endReached: boolean;
  moreStatus: boolean;
  onIntersect: () => void;
};

function Sentinel({ endReached, moreStatus, onIntersect }: SentinelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (endReached) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onIntersect();
      },
      { rootMargin: "120px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [endReached, onIntersect]);
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center px-3 py-2 text-[10px] text-muted-foreground",
        endReached && "opacity-50",
      )}
    >
      {moreStatus ? (
        <span className="flex items-center gap-1.5">
          <Spinner className="size-2.5" />
          <span>…</span>
        </span>
      ) : endReached ? (
        <span>—</span>
      ) : (
        <span />
      )}
    </div>
  );
}