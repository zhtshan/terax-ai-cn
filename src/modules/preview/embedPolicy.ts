const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

export function isLocalUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return LOCAL_HOSTS.has(h) || h.endsWith(".localhost");
  } catch {
    return false;
  }
}

// XFO: DENY/SAMEORIGIN 都拦（webview origin 与被预览站点必然不同源）。
// CSP frame-ancestors: 'none' 或不带 * 的显式列表都按拦截处理。
export function embedBlockedByHeaders(headers: Record<string, string>): boolean {
  const norm: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) norm[k.toLowerCase()] = v;
  const xfo = norm["x-frame-options"];
  if (xfo && xfo.trim().toLowerCase() !== "allowall") return true;
  const csp = norm["content-security-policy"];
  const m = csp?.match(/frame-ancestors\s+([^;]*)/i);
  if (m) {
    const sources = m[1].trim().split(/\s+/);
    if (!sources.includes("*")) return true;
  }
  return false;
}
