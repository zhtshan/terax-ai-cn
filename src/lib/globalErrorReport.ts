import { error as logError } from "@tauri-apps/plugin-log";

// Front-end crash breadcrumb for #933: tauri-plugin-log persists these to the
// app log dir, so a white-screen report can be accompanied by real evidence.
export function installGlobalErrorReporting(): void {
  window.addEventListener("error", (e) => {
    // Prefer the Error object's stack; resource-load errors carry no object.
    const msg =
      e.error instanceof Error
        ? `window.onerror: ${e.error.stack ?? e.error.message}`
        : `window.onerror: (no error object) @ ${e.filename}:${e.lineno}:${e.colno}`;
    console.error(msg);
    void logError(msg).catch(() => {});
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = `unhandledrejection: ${
      e.reason instanceof Error ? (e.reason.stack ?? e.reason.message) : String(e.reason)
    }`;
    console.error(msg);
    void logError(msg).catch(() => {});
  });
}
