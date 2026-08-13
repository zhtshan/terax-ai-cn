import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { useCallback, useEffect, useState } from "react";
import { IS_LINUX, IS_MAC } from "@/lib/platform";

const LAST_CHECK_KEY = "terax:updater:last-check";
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const GITHUB_TAGS_URL =
  "https://api.github.com/repos/zhtshan/terax-ai-cn/tags?per_page=20";

export interface ManualUpdateInfo {
  version: string;
  currentVersion: string;
  body: string;
  releaseUrl: string;
}

export type UpdaterStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "available"; update: Update }
  | { kind: "manual-available"; info: ManualUpdateInfo }
  | { kind: "downloading"; downloaded: number; contentLength: number | null }
  | { kind: "ready" }
  | { kind: "error"; message: string };

// Extracts leading numeric segments (dot- or dash-separated) so both
// "v0.8.5.2-cn" and "0.8.5-3-cn" style tags compare correctly — the first
// non-numeric segment (e.g. "cn") ends the numeric run.
export function parseVersion(v: string): number[] {
  const numeric = v.replace(/^v/, "").match(/^[\d.-]+/)?.[0] ?? "";
  return numeric
    .split(/[.-]/)
    .filter((p) => p !== "")
    .map((p) => Number.parseInt(p, 10) || 0);
}

export function isNewer(remote: string, current: string): boolean {
  const a = parseVersion(remote);
  const b = parseVersion(current);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

// Picks the highest version among tag names, tolerating non-version tags
// (e.g. a stray "list" tag) by treating unparseable segments as 0 on both
// sides of the comparison — matching isNewer()'s coalescing so the
// comparator stays transitive (a raw-vs-coalesced mismatch here previously
// let a non-version tag tie with every real version tag and get sorted to
// the end, masking real updates).
export function pickLatestVersion(tagNames: string[]): string | undefined {
  const versions = tagNames.slice().sort((a, b) => {
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] ?? 0;
      const y = pb[i] ?? 0;
      if (x !== y) return x - y;
    }
    return 0;
  });
  return versions[versions.length - 1];
}

async function checkLinuxRelease(): Promise<ManualUpdateInfo | null> {
  const [current, res] = await Promise.all([
    getVersion(),
    fetch(GITHUB_TAGS_URL, {
      headers: { Accept: "application/vnd.github+json" },
    }),
  ]);
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status}`);
  }
  const tags = (await res.json()) as { name: string }[];
  // API returns sorted by commit date, not semver — sort manually
  const latest = pickLatestVersion(tags.map((t) => t.name));
  if (!latest) return null;
  if (!isNewer(latest, current)) return null;
  const releaseUrl = `https://github.com/zhtshan/terax-ai-cn/releases/tag/${latest}`;
  return {
    version: latest.replace(/^v/, ""),
    currentVersion: current,
    body: "",
    releaseUrl,
  };
}

interface Options {
  /** Skip the time-based throttle on automatic startup checks. */
  manual?: boolean;
}

interface HookOptions {
  /** When false, the hook does not run an automatic check on mount. */
  autoCheck?: boolean;
}

export function useUpdater({ autoCheck = true }: HookOptions = {}) {
  const [status, setStatus] = useState<UpdaterStatus>({ kind: "idle" });

  const runCheck = useCallback(async ({ manual }: Options = {}) => {
    if (!manual) {
      const last = Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0);
      if (Date.now() - last < CHECK_INTERVAL_MS) return;
    }
    setStatus({ kind: "checking" });
    try {
      if (IS_LINUX || IS_MAC) {
        const info = await checkLinuxRelease();
        if (info) {
          setStatus({ kind: "manual-available", info });
        } else {
          localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
          setStatus({ kind: "uptodate" });
        }
        return;
      }
      const update = await check();
      if (update) {
        setStatus({ kind: "available", update });
      } else {
        localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
        setStatus({ kind: "uptodate" });
      }
    } catch (err) {
      setStatus({ kind: "error", message: String(err) });
    }
  }, []);

  const install = useCallback(async () => {
    if (status.kind !== "available") return;
    const { update } = status;
    let total: number | null = null;
    let downloaded = 0;
    setStatus({ kind: "downloading", downloaded: 0, contentLength: null });
    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data.contentLength ?? null;
          setStatus({
            kind: "downloading",
            downloaded: 0,
            contentLength: total,
          });
        } else if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setStatus({ kind: "downloading", downloaded, contentLength: total });
        } else if (event.event === "Finished") {
          setStatus({ kind: "ready" });
        }
      });
      await relaunch();
    } catch (err) {
      setStatus({ kind: "error", message: String(err) });
    }
  }, [status]);

  const dismiss = useCallback(() => {
    setStatus({ kind: "idle" });
  }, []);

  useEffect(() => {
    if (!autoCheck) return;
    void runCheck();
  }, [autoCheck, runCheck]);

  return { status, check: runCheck, install, dismiss };
}
