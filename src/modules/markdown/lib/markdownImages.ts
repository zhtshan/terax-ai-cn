import { convertFileSrc } from "@tauri-apps/api/core";

export type ImageUrlContext = {
  /** Directory of the markdown file; absent for AI chat messages. */
  dirname?: string;
  /** Cached user home (forward-slash form); null until resolved. */
  home?: string | null;
};

let knownHome: string | null = null;

/** Fed once from App bootstrap (same value rendererPool caches). */
export function setKnownHome(home: string | null): void {
  knownHome = home;
}

export function getKnownHome(): string | null {
  return knownHome;
}

function toAsset(path: string): string {
  return convertFileSrc(path.replace(/\\/g, "/"));
}

/**
 * Decide what an <img src> inside markdown should load.
 * Returns undefined to drop the attribute (broken-image placeholder with alt).
 */
export function resolveImageUrl(
  src: string,
  ctx: ImageUrlContext,
): string | undefined {
  const trimmed = src.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("data:")) return trimmed;

  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return undefined;

  const home = ctx.home ?? knownHome;

  if (trimmed.startsWith("~/")) {
    if (!home) return undefined;
    return toAsset(`${home}/${trimmed.slice(2)}`);
  }

  if (/^file:\/\//i.test(trimmed)) {
    let p = trimmed.slice("file://".length);
    while (p.startsWith("/")) p = p.slice(1);
    return toAsset(`/${p}`);
  }

  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return toAsset(trimmed);
  }

  if (trimmed.startsWith("/")) return toAsset(trimmed);

  if (!ctx.dirname) return undefined;
  return toAsset(joinPath(ctx.dirname, trimmed));
}

function joinPath(dir: string, rel: string): string {
  const parts = `${dir}/${rel}`.split(/[\\/]/);
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  const joined = out.join("/");
  // Preserve drive prefix form for Windows absolutes like C:/...
  if (/^[a-zA-Z]:/.test(joined)) return joined;
  return `/${joined}`;
}
