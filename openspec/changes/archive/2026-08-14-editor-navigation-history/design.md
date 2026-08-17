## Context

当前 `LspNavigator.openFile(path, line)` 是单向调用，无状态。`openContentHit` 在 `App.tsx:1132` 包装了 `openFileTab` + `gotoLine`，是所有 LSP 导航的唯一入口（Go-to-definition 在 `client.ts:366/399`，terminal file link 在 `FileLinkProvider.ts:activate` 均经过 `getLspNavigator()?.openFile()`）。因此只需修改这一层即可覆盖所有目标路径。

## Goals / Non-Goals

**Goals:**
- 在 `openContentHit` 包装层维护每个 editor tab 独立的导航历史栈（back / forward）
- 新增两个快捷键命令，在 editor tab 下激活，非 editor tab 下不消耗
- 后退时恢复原文件的精确行号；前进时恢复后退前的位置

**Non-Goals:**
- 不改 LSP client 内部逻辑
- 不改 terminal file link 的 provider 注册方式
- 不跨 tab 共享历史栈
- 不做持久化（应用重启后清空）

## Decisions

### 1. 历史栈存储位置：`useRef` + per-tab Map，而非 Zustand store

选择 `App.tsx` 内的 `useRef<Map<number, { back: StackEntry[]; forward: StackEntry[] }>>`，以 tab id 为 key。

**理由**：
- 导航历史是 session-scoped 的 transient 状态，不需要跨组件订阅，用 store 会引入不必要的 zustand 依赖
- tab 的生命周期与 `editorRefs` 同步，用 `useRef` 最简单
- 栈操作是 O(1)，无并发问题（单线程 React 事件循环）

**替代方案**：Zustand store
- 优点：可跨组件访问（如设置页展示快捷键）
- 缺点：引入 store 复杂度，当前场景不需要

### 2. 谁记录"来源"：`openContentHit` 在 push 前记录

每次调用 `openFileTab` 前，将当前 active editor tab 的 `path + editorRef 的当前光标行` 压入 back stack。

**关键点**：记录的是"跳转前光标所在行"，而非"当前显示行"（两者可能不同，但光标行是用户意图所在）。

### 3. 快捷键优先级：editor tab 优先，pane swap 降级

`shortcutsDisabled` 中对于 `"editor.goBack"` / `"editor.goForward"` 不做禁用（editor tab 下始终可用）；对于 `"pane.swapLeft"` / `"pane.swapRight"` 在 editor tab 下禁用。这样 Alt+←/→ 在 editor 模式下被导航历史替换，非 editor 模式下仍做 pane swap。

但用户已选定 Cmd/Ctrl+←/→ 作为快捷键，不与 pane swap（Alt+←/→）冲突，因此不需要调整 pane swap 的 disabled 逻辑。

### 4. 快捷键定义：新增 `editor.goBack` / `editor.goForward`

在 `shortcuts.ts` 的 `ShortcutId` union 中新增两个 id，默认绑定：
- macOS：`{ [MOD_PROP]: true, key: "ArrowLeft" }` / `{ [MOD_PROP]: true, key: "ArrowRight" }`
- 其他平台：`{ ctrl: true, key: "ArrowLeft" }` / `{ ctrl: true, key: "ArrowRight" }`

## Risks / Trade-offs

- **栈溢出**：无限压栈理论上可能，但实际上 tab 关闭时清理，且单次会话跳转次数有限。不加硬性上限。
- **行号不准确**：记录的是跳转瞬间的光标行，若用户在此之前已经手动移动光标，行号会略有偏差。可接受，符合 VS Code 行为。
- **非 editor tab 行为**：Cmd/Ctrl+箭头在 terminal tab 下目前无绑定，不会触发任何操作。如需未来支持 terminal 的 command history，需另做处理（不在本 change 范围）。

## Migration Plan

无迁移成本——纯新增功能，不影响现有行为。

## Open Questions

无。
