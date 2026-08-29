# macOS 平台 Bug 修复实现计划（#1168 / #933 / #449）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复三个 macOS bug：#1168 中文 glyph 重叠（启用 xterm 官方 `rescaleOverlappingGlyphs`）、#933 白屏防御（WebGL 启动探测 + React ErrorBoundary + 前端错误转发日志）、#449 外接卷新 tab 挂起（cwd 解析挪 blocking 线程 + 3s 超时回退 home）。

**Architecture:** 前端三处独立防御（termOptions 选项、preferences store 探测标志、ErrorBoundary 组件）+ Rust 侧把 pty_open 的同步 fs 探测拆为可超时的 blocking 任务，registry 授权留在 async 侧。Spec：`docs/superpowers/specs/2026-08-29-macos-bugs-design.md`（修订版，commit e5b4b8b）。

**Tech Stack:** React 19 + zustand + vitest/happy-dom + @testing-library/react（前端）；Rust + tauri 2 + tokio + cargo nextest（后端）。

## Global Constraints

- 包管理 **pnpm**；TypeScript 严格模式，无 `any`；前端导入统一 `@/…`
- 每个 commit message 用**中文**；代码/注释/commit **不用 em-dash、不用 emoji**
- 注释默认无，只在 WHY 不明显时写 1-2 行
- 每任务收尾跑该任务范围的 lint/test；最终任务跑全套：`pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`
- `webglRendererUnusable` 是**运行时探测标志，不持久化**：不进 `DEFAULT_PREFERENCES`、不进 writePref 的 key map
- authorize 路径的 `std::fs::canonicalize` **不得**换成 `canonicalize_cached`（TOCTOU，spec 明令）

---

### Task 1: #1168 启用 `rescaleOverlappingGlyphs`

**Files:**
- Modify: `src/modules/terminal/lib/rendererPool.ts:184-199`（`termOptions()`）
- Test: `src/modules/terminal/lib/rendererPool.test.ts`（`MockTerminal` 捕获 options + 新 describe）

**Interfaces:**
- Consumes: 无
- Produces: `termOptions()` 返回对象含 `rescaleOverlappingGlyphs: true`。无跨任务消费者

- [ ] **Step 1: 让 MockTerminal 捕获传入的 options**

`src/modules/terminal/lib/rendererPool.test.ts` 中现有 mock（约 70-76 行）改为记录 options，并在文件顶部（`webglMock` 定义之后）加可变捕获变量：

```typescript
let lastOptions: Record<string, unknown> | null = null;

function MockTerminal(options: Record<string, unknown>) {
  lastOptions = options;
  lastTextarea = makeMockTextarea();
  return {
    ...mockTermMethods,
    textarea: lastTextarea,
    element: webglMock.element ?? undefined,
  };
}
```

（只改函数签名参数名 `_options` → `options` 并加第一行赋值，其余不变。）

- [ ] **Step 2: 写失败测试**

在文件末尾追加：

```typescript
describe("termOptions", () => {
  beforeEach(() => {
    lastOptions = null;
  });

  // #1168: CJK glyph overlap in the WebGL renderer. xterm 5.5+ ships an
  // opt-in rescale; enabling it here is the upstream-sanctioned mitigation.
  it("enables rescaleOverlappingGlyphs", async () => {
    const { acquireSlot, refreshLeafSlot } = await setupPool();
    acquireSlot(acquireParams(21));
    refreshLeafSlot(21);
    await flushFrames();
    expect(lastOptions?.rescaleOverlappingGlyphs).toBe(true);
  });
});
```

注意：`setupPool`/`acquireParams`/`flushFrames` 是文件内 `describe("attachWebgl failure fallback")` 已有的 helper，但它们定义在该 describe 内部。若它们在 describe 作用域内，把上面新 describe 合并进同一个外层作用域或把 helper 提升到文件顶层，二选一，以最小 diff 为准。

- [ ] **Step 3: 运行测试确认失败**

Run: `pnpm vitest run src/modules/terminal/lib/rendererPool.test.ts`
Expected: 新用例 FAIL（`expected true, received undefined`），既有用例全 PASS

- [ ] **Step 4: 实现**

`src/modules/terminal/lib/rendererPool.ts` 的 `termOptions()` 返回对象（第 198 行 `minimumContrastRatio` 之后）加：

```typescript
    rescaleOverlappingGlyphs: true,
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm vitest run src/modules/terminal/lib/rendererPool.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/terminal/lib/rendererPool.ts src/modules/terminal/lib/rendererPool.test.ts
git commit -m "fix(terminal): 启用 rescaleOverlappingGlyphs 缓解 WebGL 渲染 CJK 重叠（#1168）"
```

---

### Task 2: #933 启动 WebGL 探测 + store 标志

**Files:**
- Modify: `src/modules/settings/store.ts`（State 接口约 151 行旁 + 新导出函数）
- Modify: `src/modules/settings/preferences.ts:51`（`init()` 内）
- Test: `src/modules/settings/store.test.ts`（新建）

**Interfaces:**
- Consumes: 无
- Produces: 
  - `State.webglRendererUnusable: boolean`（zustand 字段，Task 3 消费）
  - `detectWebglRenderer(): boolean`（store.ts 导出；true = webgl2 context 可建）

- [ ] **Step 1: 写失败测试**

新建 `src/modules/settings/store.test.ts`：

```typescript
import { describe, expect, it, vi, afterEach } from "vitest";
import { detectWebglRenderer } from "./store";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("detectWebglRenderer", () => {
  it("returns false when webgl2 context cannot be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(detectWebglRenderer()).toBe(false);
  });

  it("returns true when webgl2 context is available", () => {
    const fakeCtx = { getExtension: vi.fn(() => null) };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      fakeCtx as unknown as WebGL2RenderingContext,
    );
    expect(detectWebglRenderer()).toBe(true);
  });

  it("returns false when getContext throws", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(detectWebglRenderer()).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/modules/settings/store.test.ts`
Expected: FAIL，`detectWebglRenderer` 未导出

- [ ] **Step 3: 实现**

`src/modules/settings/store.ts`：

1. State 接口里 `terminalWebglEnabled: boolean;`（151 行）下一行加：

```typescript
  webglRendererUnusable: boolean;
```

2. 文件中新增导出（放在 `setTerminalWebglEnabled` 附近，约 730 行）：

```typescript
// Boot-time probe for #933: old WebKit can silently fail WebGL context
// creation, leaving the terminal blank. Result is runtime-only state and is
// never persisted.
export function detectWebglRenderer(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return false;
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    return true;
  } catch {
    return false;
  }
}
```

`src/modules/settings/preferences.ts` 的 `create<State>` 初始对象里 `hydrated: false,` 下一行加：

```typescript
  webglRendererUnusable: false,
```

`init()` 的 async 体内（`const prefs = await loadPreferences();` 之前）加：

```typescript
        if (!detectWebglRenderer()) set({ webglRendererUnusable: true });
```

并在 preferences.ts 头部加 `import { detectWebglRenderer } from "./store";`。

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/modules/settings/store.test.ts`
Expected: 3 个用例 PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/settings/store.ts src/modules/settings/store.test.ts src/modules/settings/preferences.ts
git commit -m "feat(settings): 启动时探测 WebGL2 context 可用性并置运行时标志（#933）"
```

---

### Task 3: #933 attachWebgl 门 + 一次性 toast

**Files:**
- Modify: `src/modules/terminal/lib/rendererPool.ts`（`attachWebgl` 约 850 行）
- Test: `src/modules/terminal/lib/rendererPool.test.ts`

**Interfaces:**
- Consumes: `usePreferencesStore.getState().webglRendererUnusable`（Task 2）
- Produces: 无新接口；行为约束 = 标志为 true 时任何路径都不构造 `WebglAddon`，且整个会话只 toast 一次

- [ ] **Step 1: 加 sonner mock 并写失败测试**

`src/modules/terminal/lib/rendererPool.test.ts` 顶部（现有 `vi.mock("@xterm/xterm", ...)` 旁）加：

```typescript
vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));
```

在 `attachWebgl failure fallback` describe 内追加用例（复用其 helper）：

```typescript
  // #933: when the boot probe found WebGL2 unusable, attaching would blank
  // the terminal on old WebKit. The flag must gate every attach path.
  it("skips webgl attach when the boot probe flagged the renderer unusable", async () => {
    const { usePreferencesStore } = await import("@/modules/settings/preferences");
    const { toast } = await import("sonner");
    usePreferencesStore.setState({ webglRendererUnusable: true });
    const { acquireSlot, refreshLeafSlot } = await setupPool();
    acquireSlot(acquireParams(31));
    refreshLeafSlot(31);
    await flushFrames();
    expect(webglMock.constructCount).toBe(0);
    expect(toast.error).toHaveBeenCalledTimes(1);
    usePreferencesStore.setState({ webglRendererUnusable: false });
    vi.mocked(toast.error).mockClear();
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/modules/terminal/lib/rendererPool.test.ts`
Expected: 新用例 FAIL（constructCount > 0）

- [ ] **Step 3: 实现**

`src/modules/terminal/lib/rendererPool.ts`：

1. 头部加 `import { toast } from "sonner";`（文件已 import `usePreferencesStore`，不用新增）。
2. 模块级变量（`let windowActive = ...` 附近）加：

```typescript
let webglUnusableToastShown = false;
```

3. `attachWebgl` 第一行守卫（850-851 行）后加一条并列守卫：

```typescript
  if (usePreferencesStore.getState().webglRendererUnusable) {
    if (!webglUnusableToastShown) {
      webglUnusableToastShown = true;
      toast.error("WebGL 渲染不可用，已改用兼容渲染");
    }
    return;
  }
```

（文案硬编码中文，沿用 `FileLinkProvider.ts:203` 同目录非组件 toast 的既有模式。）

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/modules/terminal/lib/rendererPool.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/terminal/lib/rendererPool.ts src/modules/terminal/lib/rendererPool.test.ts
git commit -m "fix(terminal): WebGL 探测失败时跳过 addon 加载并提示一次（#933）"
```

---

### Task 4: #933 ErrorBoundary + 全局错误上报

**Files:**
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/lib/globalErrorReport.ts`
- Modify: `src/app/App.tsx`（末尾 return，约最后 3 行）
- Modify: `src/main.tsx`（import 区之后）
- Test: `src/components/ErrorBoundary.test.tsx`（新建）、`src/lib/globalErrorReport.test.ts`（新建）

**Interfaces:**
- Consumes: `@tauri-apps/plugin-log` 的 `error(message: string): Promise<void>`（package.json:70 已装，dist-js/index.d.ts:55 已核实）
- Produces: `ErrorBoundary`（props: `{ children: ReactNode }`）；`installGlobalErrorReporting(): void`

- [ ] **Step 1: 写 ErrorBoundary 失败测试**

新建 `src/components/ErrorBoundary.test.tsx`：

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("boom");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ErrorBoundary", () => {
  it("shows fallback instead of blanking when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("重启应用")).toBeInTheDocument();
  });

  it("renders children untouched when nothing throws", () => {
    render(<ErrorBoundary><div>ok-content</div></ErrorBoundary>);
    expect(screen.getByText("ok-content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm vitest run src/components/ErrorBoundary.test.tsx`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 ErrorBoundary**

新建 `src/components/ErrorBoundary.tsx`：

```tsx
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
```

（fallback 文案硬编码双语：crash 时 i18n 自身可能未初始化，不能依赖 `t()`。）

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm vitest run src/components/ErrorBoundary.test.tsx`
Expected: 2 个用例 PASS

- [ ] **Step 5: Commit ErrorBoundary**

```bash
git add src/components/ErrorBoundary.tsx src/components/ErrorBoundary.test.tsx
git commit -m "feat(ui): 新增 ErrorBoundary 兜底渲染崩溃（#933）"
```

- [ ] **Step 6: 写 globalErrorReport 失败测试**

新建 `src/lib/globalErrorReport.test.ts`。注意：happy-dom 没有 `PromiseRejectionEvent` 构造器，也不能安全地在测试里制造真实 unhandled rejection，所以用 spy `addEventListener` 捕获 handler 后直接调用：

```typescript
import { describe, expect, it, vi } from "vitest";
import { error as logError } from "@tauri-apps/plugin-log";
import { installGlobalErrorReporting } from "./globalErrorReport";

vi.mock("@tauri-apps/plugin-log", () => ({
  error: vi.fn(() => Promise.resolve()),
}));

type Listener = (ev: never) => void;

function captureHandlers(type: string): Listener[] {
  const captured: Listener[] = [];
  vi.spyOn(window, "addEventListener").mockImplementation(
    (t, fn) => {
      if (t === type) captured.push(fn as Listener);
    },
  );
  return captured;
}

describe("installGlobalErrorReporting", () => {
  it("reports window errors via console and tauri log", () => {
    const handlers = captureHandlers("error");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    installGlobalErrorReporting();
    expect(handlers).toHaveLength(1);
    handlers[0]({
      message: "boom",
      filename: "app.js",
      lineno: 3,
      colno: 7,
    } as never);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("window.onerror: boom @ app.js:3:7"),
    );
    expect(logError).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("reports unhandled rejections", () => {
    const handlers = captureHandlers("unhandledrejection");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    installGlobalErrorReporting();
    expect(handlers).toHaveLength(1);
    handlers[0]({ reason: "reject-reason" } as never);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("unhandledrejection: reject-reason"),
    );
    consoleSpy.mockRestore();
  });
});
```

（`vi.spyOn(window, "addEventListener")` 的 mock 返回 undefined，符合该签名；每个用例末尾 `consoleSpy.mockRestore()`，addEventListener 的 spy 随 `vi.restoreAllMocks` 或用例隔离自然失效，不透传到其他测试。）

- [ ] **Step 7: 运行测试确认失败**

Run: `pnpm vitest run src/lib/globalErrorReport.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 8: 实现 globalErrorReport**

新建 `src/lib/globalErrorReport.ts`：

```typescript
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
```

- [ ] **Step 9: 运行测试确认通过**

Run: `pnpm vitest run src/lib/globalErrorReport.test.ts`
Expected: 2 个用例 PASS

- [ ] **Step 10: 接线 main.tsx 与 App.tsx**

`src/main.tsx`：import 区（`import { initLaunchDir } ...` 附近）加：

```typescript
import { installGlobalErrorReporting } from "./lib/globalErrorReport";
```

在 `if (USE_CUSTOM_WINDOW_CONTROLS) {` 之前调用：

```typescript
installGlobalErrorReporting();
```

`src/app/App.tsx`：文件末尾 `return <AiComposerProvider>{shell}</AiComposerProvider>;` 改为：

```tsx
    return (
      <ErrorBoundary>
        <AiComposerProvider>{shell}</AiComposerProvider>
      </ErrorBoundary>
    );
```

并加 import：`import { ErrorBoundary } from "@/components/ErrorBoundary";`

- [ ] **Step 11: 全量前端回归**

Run: `pnpm lint && pnpm check-types && pnpm test`
Expected: 全绿（`pnpm test` 存量 5 个 agentActivity unhandled rejection 失败为已知基线，不算回归）

- [ ] **Step 12: Commit**

```bash
git add src/lib/globalErrorReport.ts src/lib/globalErrorReport.test.ts src/main.tsx src/app/App.tsx
git commit -m "feat(app): 全局 JS 错误转发 tauri 日志并接入 ErrorBoundary（#933）"
```

---

### Task 5: #449 workspace.rs 拆出 probe + exe 目录缓存

**Files:**
- Modify: `src-tauri/src/modules/workspace.rs`（`authorize_user_spawn_cwd` 100-116 行、`is_executable_dir` 231-242 行、tests mod 920 行附近）
- Test: 同文件 `#[cfg(test)] mod tests`（已有 `tempdir` helper）

**Interfaces:**
- Consumes: 无
- Produces:
  - `pub fn probe_spawn_cwd(cwd: &str, workspace: &WorkspaceEnv) -> Result<PathBuf, String>`（Task 6 消费）
  - `is_executable_dir(path: &Path) -> bool` 签名不变（纯函数保持，私有）

- [ ] **Step 1: 写失败测试**

在 `mod tests` 内（`choose_launch_dir_returns_none_when_both_unusable` 测试之后）加：

```rust
    #[test]
    fn probe_spawn_cwd_accepts_real_dir() {
        let dir = tempdir("probe-ok");
        let got = probe_spawn_cwd(dir.to_str().unwrap(), &WorkspaceEnv::Local).unwrap();
        assert_eq!(got, dir);
    }

    #[test]
    fn probe_spawn_cwd_rejects_missing_path() {
        let err = probe_spawn_cwd("/no/such/terax/probe-path", &WorkspaceEnv::Local).unwrap_err();
        assert!(err.contains("not accessible"));
    }

    #[test]
    fn probe_spawn_cwd_rejects_file() {
        let dir = tempdir("probe-file");
        let file = dir.join("f.txt");
        std::fs::write(&file, "x").unwrap();
        let err = probe_spawn_cwd(file.to_str().unwrap(), &WorkspaceEnv::Local).unwrap_err();
        assert!(err.contains("not a directory"));
    }
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd src-tauri && cargo nextest run -E 'test(probe_spawn_cwd)'`
Expected: 编译失败（函数不存在）

- [ ] **Step 3: 拆出 probe 并重构 authorize_user_spawn_cwd**

`workspace.rs` 中 `authorize_user_spawn_cwd`（100-116 行）替换为：

```rust
// Pure fs probe split out of authorize_user_spawn_cwd so pty_open can run it
// on a blocking thread under a timeout (#449); the registry mutation stays on
// the caller side. Kept free of caching: the short-TTL-free canonicalize is
// what keeps the auth TOCTOU window tight.
pub fn probe_spawn_cwd(cwd: &str, workspace: &WorkspaceEnv) -> Result<PathBuf, String> {
    let resolved = resolve_path(cwd, workspace);
    let canonical =
        std::fs::canonicalize(&resolved).map_err(|e| format!("cwd not accessible: {e}"))?;
    if !canonical.is_dir() {
        return Err(format!("cwd is not a directory: {}", canonical.display()));
    }
    Ok(canonical)
}

// User-initiated terminal spawn: canonicalize, require a real dir, and register
// it as a root instead of rejecting paths outside existing roots.
pub fn authorize_user_spawn_cwd(
    registry: &WorkspaceRegistry,
    cwd: Option<&str>,
    workspace: &WorkspaceEnv,
) -> Result<Option<PathBuf>, String> {
    let Some(cwd) = cwd.map(str::trim).filter(|s| !s.is_empty()) else {
        return Ok(None);
    };
    let canonical = probe_spawn_cwd(cwd, workspace)?;
    registry.authorize(&canonical).map_err(|e| e.to_string())?;
    Ok(Some(canonical))
}
```

（行为与原实现逐行等价：canonicalize → is_dir → authorize。）

- [ ] **Step 4: exe 目录 OnceLock 缓存**

`is_executable_dir`（231-242 行）替换为：

```rust
fn canonical_exe_dir() -> Option<&'static Path> {
    static EXE_DIR: OnceLock<Option<PathBuf>> = OnceLock::new();
    EXE_DIR
        .get_or_init(|| {
            let exe = std::env::current_exe().ok()?;
            std::fs::canonicalize(exe.parent()?).ok()
        })
        .as_deref()
}

fn is_executable_dir(path: &Path) -> bool {
    let Some(exe_dir) = canonical_exe_dir() else {
        return false;
    };
    std::fs::canonicalize(path)
        .map(|canonical| canonical == exe_dir)
        .unwrap_or(false)
}
```

（`OnceLock` 已在文件 use 列表（`use std::sync::{Mutex, OnceLock};`）。exe 目录启动后不变，缓存消掉启动路径上每次两次 canonicalize 中的一半；纯函数签名未动，`choose_launch_dir` 三测试不受影响。）

- [ ] **Step 5: 运行测试确认通过**

Run: `cd src-tauri && cargo nextest run -E 'test(probe_spawn_cwd) or test(choose_launch_dir)'`
Expected: 新 3 个 + 既有 3 个全 PASS

- [ ] **Step 6: clippy 与 commit**

Run: `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings`
Expected: 无警告

```bash
git add src-tauri/src/modules/workspace.rs
git commit -m "refactor(workspace): 拆出 probe_spawn_cwd 纯探测并缓存 exe 目录 canonicalize（#449）"
```

---

### Task 6: #449 pty_open 超时守护

**Files:**
- Modify: `src-tauri/Cargo.toml:47`（tokio features）
- Modify: `src-tauri/src/modules/pty/mod.rs`（`pty_open` 67 行 + 新私有函数 + 删除 `user_spawn_cwd_or_home` 于 workspace.rs:120-133）
- Test: `src-tauri/src/modules/pty/mod.rs` 内新增 `#[cfg(test)]` mod

**Interfaces:**
- Consumes: `probe_spawn_cwd(String, &WorkspaceEnv) -> Result<PathBuf, String>`（Task 5）、`WorkspaceRegistry::authorize`
- Produces: `spawn_cwd_or_home_inner`（泛型 probe，可测超时）；`pty_open` 行为约束 = cwd 探测最多 3s，超时回退 home

- [ ] **Step 1: 启用 tokio time + macros feature**

`src-tauri/Cargo.toml` 47 行改为：

```toml
tokio = { version = "1", default-features = false, features = ["rt", "time", "macros"] }
```

（`time` 供 `tokio::time::timeout`；`macros` 供 `#[tokio::test]`。tauri 自身已拉起 tokio runtime，feature 合并无版本冲突。）

- [ ] **Step 2: 写失败测试**

`src-tauri/src/modules/pty/mod.rs` 文件末尾加：

```rust
#[cfg(test)]
mod spawn_cwd_tests {
    use super::*;
    use crate::modules::workspace::WorkspaceRegistry;
    use std::time::Duration;

    #[tokio::test]
    async fn probe_timeout_falls_back_to_home() {
        let registry = WorkspaceRegistry::default();
        let result = spawn_cwd_or_home_inner(
            &registry,
            Some("/external/slow/path".to_owned()),
            WorkspaceEnv::Local,
            Duration::from_millis(20),
            |_cwd, _ws| async {
                tokio::time::sleep(Duration::from_secs(30)).await;
                unreachable!("probe must be abandoned on timeout");
            },
        )
        .await;
        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn empty_cwd_returns_none_without_probe() {
        let registry = WorkspaceRegistry::default();
        let result = spawn_cwd_or_home_inner(
            &registry,
            Some("   ".to_owned()),
            WorkspaceEnv::Local,
            Duration::from_secs(1),
            |_cwd, _ws| async { unreachable!("blank cwd must not reach probe") },
        )
        .await;
        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn successful_probe_authorizes_and_returns_cwd() {
        let registry = WorkspaceRegistry::default();
        let dir = std::env::temp_dir().join("terax-spawn-cwd-ok");
        std::fs::create_dir_all(&dir).unwrap();
        let result = spawn_cwd_or_home_inner(
            &registry,
            Some(dir.to_string_lossy().to_string()),
            WorkspaceEnv::Local,
            Duration::from_secs(1),
            |cwd, _ws| async move { Ok(std::path::PathBuf::from(cwd)) },
        )
        .await;
        assert_eq!(result.as_deref(), Some(dir.to_string_lossy().as_ref()));
        assert!(registry.is_authorized(&dir));
        let _ = std::fs::remove_dir(&dir);
    }
}
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd src-tauri && cargo nextest run -E 'test(spawn_cwd)'`
Expected: 编译失败（`spawn_cwd_or_home_inner` 不存在）

- [ ] **Step 4: 实现超时守护**

`src-tauri/src/modules/pty/mod.rs`：

1. use 区改一行（27 行）：

```rust
use crate::modules::workspace::{probe_spawn_cwd, WorkspaceEnv, WorkspaceRegistry};
```

再补 `use std::time::Duration;`（`use std::sync::{Arc, RwLock};` 下一行）。

2. `pty_open` 内 67 行 `let cwd = user_spawn_cwd_or_home(&registry, cwd.as_deref(), &workspace);` 替换为：

```rust
    let cwd = spawn_cwd_or_home(&registry, cwd, workspace.clone()).await;
```

（`workspace` 在 73 行 spawn_blocking 里还要用，clone 一份给 cwd 解析。`WorkspaceEnv` derive 了 Clone。）

3. 文件中（`pty_open` 之前）加：

```rust
const SPAWN_CWD_TIMEOUT_SECS: u64 = 3;

// Canonicalize on a blocking thread under a timeout: an asleep external drive
// can stall std::fs::canonicalize for tens of seconds, which used to hang new
// tabs forever and pin an async worker (#449). The registry authorize stays on
// the async side so authorized roots are still recorded for this session.
async fn spawn_cwd_or_home(
    registry: &WorkspaceRegistry,
    cwd: Option<String>,
    workspace: WorkspaceEnv,
) -> Option<String> {
    spawn_cwd_or_home_inner(
        registry,
        cwd,
        workspace,
        Duration::from_secs(SPAWN_CWD_TIMEOUT_SECS),
        |cwd, ws| async move {
            tauri::async_runtime::spawn_blocking(move || probe_spawn_cwd(&cwd, &ws))
                .await
                .map_err(|e| e.to_string())
        },
    )
    .await
}

async fn spawn_cwd_or_home_inner<F, Fut>(
    registry: &WorkspaceRegistry,
    cwd: Option<String>,
    workspace: WorkspaceEnv,
    timeout: Duration,
    probe: F,
) -> Option<String>
where
    F: FnOnce(String, WorkspaceEnv) -> Fut,
    Fut: std::future::Future<Output = Result<std::path::PathBuf, String>>,
{
    let Some(cwd) = cwd.map(|s| s.trim().to_owned()).filter(|s| !s.is_empty()) else {
        return None;
    };
    match tokio::time::timeout(timeout, probe(cwd.clone(), workspace.clone())).await {
        Ok(Ok(canonical)) => {
            if let Err(e) = registry.authorize(&canonical) {
                log::warn!("pty cwd authorize failed: {e}; opening home");
                return None;
            }
            Some(cwd)
        }
        Ok(Err(e)) => {
            log::warn!("pty cwd {cwd:?} unusable ({e}); opening home");
            None
        }
        Err(_) => {
            log::warn!(
                "pty cwd probe timed out after {timeout:?} (external drive asleep?); opening home"
            );
            None
        }
    }
}
```

4. 删除 workspace.rs 中已无调用者的 `user_spawn_cwd_or_home`（120-133 行）。先全局确认：`grep -rn "user_spawn_cwd_or_home" src-tauri/src` 应只剩定义处。

- [ ] **Step 5: 运行测试确认通过**

Run: `cd src-tauri && cargo nextest run -E 'test(spawn_cwd)'`
Expected: 3 个用例 PASS

- [ ] **Step 6: Rust 全量回归**

Run: `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`
Expected: 全绿

- [ ] **Step 7: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/modules/pty/mod.rs src-tauri/src/modules/workspace.rs
git commit -m "fix(pty): cwd 解析移入 blocking 线程并加 3s 超时回退 home（#449）"
```

---

### Task 7: 文档更新 + 全套终验

**Files:**
- Modify: `docs/2026-08-27-pending-issues-plan.md`（第四节 71-79 行 + 第七节推荐顺序）

**Interfaces:**
- Consumes: 前六个任务的提交哈希
- Produces: 计划文档状态与仓库一致

- [ ] **Step 1: 更新计划文档第四节**

`docs/2026-08-27-pending-issues-plan.md` 第四节表格逐行更新（取实际提交哈希替换 `<hash>` 占位）：

- #873 行追加说明：已于 `a145a27` 修复（第一节已有，无需重复）
- #1168 行：加备注列内容 `重叠部分 ✅ <hash>`（rescaleOverlappingGlyphs）；`乱码/atlas 错位部分留档：上游无已确认修复，渲染错误不可机检，用户可关 WebGL 开关兜底`
- #933 行：加备注 `✅ <hash>`（启动探测 + ErrorBoundary + 错误转发日志；macOS 13 Intel 实机验证依赖用户反馈）
- #449 行：加备注 `✅ <hash>`（spawn_blocking + 3s 超时回退 home；外接卷实测待用户环境）

- [ ] **Step 2: 全套 CI 检查**

Run: `pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`
Expected: 全绿（`pnpm test` 仅存量 5 个 agentActivity 基线失败可接受）

- [ ] **Step 3: Commit 文档**

```bash
git add docs/2026-08-27-pending-issues-plan.md
git commit -m "docs: macOS 平台三项 bug 修复留档（#1168 #933 #449）"
```

- [ ] **Step 4: 手动冒烟（可跑 GUI 时）**

`pnpm tauri dev` 启动后确认：终端正常渲染中英文；Settings 关开 WebGL 开关各一次终端仍正常；无多余 toast。
