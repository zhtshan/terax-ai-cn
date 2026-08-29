import { error as logError } from "@tauri-apps/plugin-log";

// Front-end crash breadcrumb for #933: tauri-plugin-log persists these to the
// app log dir, so a white-screen report can be accompanied by real evidence.
export function installGlobalErrorReporting(): void {
  window.addEventListener("error", (e) => {
    const msg = `window.onerror: ${e.message} @ ${e.filename}:${e.lineno}:${e.colno}`;
    console.error(msg);
    void logError(msg).catch(() => {});
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = `unhandledrejection: ${String(e.reason)}`;
    console.error(msg);
    void logError(msg).catch(() => {});
  });
}
