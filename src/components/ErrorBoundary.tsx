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
    console.error("[terax] render crash captured:", error, info);
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
          <p style={{ opacity: 0.7 }}>Something went wrong. The error has been logged.</p>
          <button type="button" onClick={() => window.location.reload()}>
            重启应用
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
