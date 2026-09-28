import { error as logError } from "@tauri-apps/plugin-log";
import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Last-resort screen for render crashes (#933): without it a throwing child
// blanks the whole window on platforms we cannot reproduce.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown): void {
    console.error(
      "[terax] render crash captured:",
      error,
      "isError:",
      error instanceof Error,
      "name:",
      (error as { name?: unknown })?.name,
      "message:",
      (error as { message?: unknown })?.message,
      "stack:",
      (error as { stack?: unknown })?.stack,
      "info:",
      info,
    );
    const detail = stringifyError(error);
    const componentStack =
      typeof info === "object" && info && "componentStack" in info
        ? String((info as { componentStack: unknown }).componentStack)
        : String(info);
    void logError(
      `render crash: ${detail}\nname: ${String(
        (error as { name?: unknown })?.name,
      )}\nmessage: ${String(
        (error as { message?: unknown })?.message,
      )}\ncause: ${stringifyError(
        (error as { cause?: unknown })?.cause,
      )}\ncomponentStack: ${componentStack}`,
    ).catch(() => {});
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            gap: 12,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <p>界面遇到了问题，已停止渲染。</p>
          <p style={{ opacity: 0.7 }}>
            Something went wrong. The error has been logged.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            重启应用
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    let s = error.stack ?? error.message;
    // AggregateError / nested .cause — React 19 sometimes wraps the
    // user-thrown value behind an internal stack-only shell (#933).
    const cause = (error as { cause?: unknown }).cause;
    if (cause != null) s += `\ncause: ${stringifyError(cause)}`;
    const nested = (error as { errors?: unknown[] }).errors;
    if (Array.isArray(nested) && nested.length) {
      s += `\nerrors: ${nested.map(stringifyError).join(" | ")}`;
    }
    return s;
  }
  if (error == null) return `null (no error object)`;
  if (typeof error === "string") return error;
  // React 19 sometimes surfaces internal error objects that stringify to
  // `[object Object]`; pull enumerable AND own-symbol fields so the
  // persisted log has something to grep (#933).
  if (typeof error === "object") {
    try {
      const keys = Reflect.ownKeys(error as object);
      const dump: Record<string, unknown> = {};
      for (const k of keys) {
        try {
          dump[String(k)] = (error as Record<string, unknown>)[
            k as keyof typeof error
          ];
        } catch {
          dump[String(k)] = "(threw on read)";
        }
      }
      const j = JSON.stringify(dump);
      if (j && j !== "{}") return `${String(error)} ${j}`;
    } catch {
      // fall through
    }
  }
  return String(error);
}
