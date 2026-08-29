import "@xterm/xterm/css/xterm.css";
import "./styles/globals.css";
import "./i18n";

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { installGlobalErrorReporting } from "./lib/globalErrorReport";
import { initLaunchDir } from "./lib/launchDir";
import { IS_MAC, USE_CUSTOM_WINDOW_CONTROLS } from "./lib/platform";

installGlobalErrorReporting();

if (USE_CUSTOM_WINDOW_CONTROLS) {
  document.documentElement.dataset.chrome = "borderless";
}

if (IS_MAC) {
  document.documentElement.dataset.platform = "macos";
}

// Suppress the native WebView context menu app-wide in production. Areas with
// their own menus (explorer rows, tab bar) stop propagation already; everywhere
// else a right-click used to open the native menu, whose "Reload" reloads the
// whole webview and re-runs pty_close_all below — killing live terminal sessions.
// In dev mode we allow the native menu so developers can open DevTools via
// right-click -> Inspect Element.
if (!import.meta.env.DEV) {
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}

// Render-instrumentation overlay, opt-in: `VITE_REACT_SCAN=true pnpm dev`.
// Dev-only dynamic import so it never reaches the production bundle.
if (import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN === "true") {
  const { scan } = await import("react-scan");
  scan({ enabled: true });
}

// Reap PTY sessions orphaned by a prior webview load before any tab spawns.
await invoke("pty_close_all").catch(() => {});

// Seed before first paint so default tab mounts at target cwd (no flicker).
await initLaunchDir();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// Window starts hidden (per tauri.conf.json) so users never see a transparent
// shadow-only frame before React paints. Use setTimeout — rAF is throttled
// while the window is hidden and would never fire.
const showWindow = () => {
  getCurrentWindow()
    .show()
    .catch((e) => console.error("window.show failed:", e));
};
setTimeout(showWindow, 50);
// Safety net: if the first show somehow fails to take effect, force again.
setTimeout(showWindow, 500);
