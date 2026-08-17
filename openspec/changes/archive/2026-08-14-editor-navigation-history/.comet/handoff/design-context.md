# Comet Design Handoff

- Change: editor-navigation-history
- Phase: design
- Mode: compact
- Context hash: 77f5458e84e4a1372b42cb64c6ca0100e5e209632e764c4dfecb5b473c3b3b22

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/editor-navigation-history/proposal.md

- Source: openspec/changes/editor-navigation-history/proposal.md
- Lines: 1-25
- SHA256: 111fcb61aa50a85e99a0c0dcb43089853d61c5bf1615aa8a76c4ce2c1b2d269f

```md
## Why

编辑器跳转到文件后，用户无法快速返回上一个位置。每次按 Go-to-definition 或点击终端文件路径打开新文件后，都需要手动找回去，打断工作流程。VS Code 的 Back/Forward 导航（Alt+←/→）是开发者高频使用的能力，本应用目前缺失。

## What Changes

- `LspNavigator.openFile` 包装层记录每次跳转的来源（path + line），维护前进/后退栈
- 新增快捷键 `Cmd/Ctrl+←`（后退）和 `Cmd/Ctrl+→`（前进），在 editor tab 下激活导航历史
- 后退时恢复目标文件并跳转回原始行号；前进时恢复后退前的位置
- 非 editor tab 下快捷键无操作，不影响其他功能

## Capabilities

### New Capabilities
- `editor-navigation-history`: 编辑器导航历史（Back/Forward），记录 LSP openFile 触发的文件跳转，支持通过快捷键返回/前进

### Modified Capabilities
（无）

## Impact

- `src/modules/lsp/lib/navigator.ts`：扩展 `LspNavigator` 类型，增加导航历史 push 方法
- `src/app/App.tsx`：`openContentHit` 包装 push 来源；新增 back/forward handler；`shortcutsDisabled` 适配
- `src/modules/shortcuts/shortcuts.ts`：新增 `"editor.goBack"` / `"editor.goForward"` shortcut id，默认绑定 `Cmd/Ctrl+←` / `Cmd/Ctrl+→`
- 不涉及 Rust 后端改动，不涉及 spec 文件变更（无已有 capability 需求变更）
```

## openspec/changes/editor-navigation-history/design.md

- Source: openspec/changes/editor-navigation-history/design.md
- Lines: 1-63
- SHA256: 160600e954f876a4e20b96feb8e57b359fee5fb10412c744d36a0476d9e456ff

```md
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
```

## openspec/changes/editor-navigation-history/tasks.md

- Source: openspec/changes/editor-navigation-history/tasks.md
- Lines: 1-28
- SHA256: 51a1b39f4e6113babc8613a9878cdd67b3bf9773a9e2e53af460c61459c94637

```md
## 1. 快捷键定义

- [ ] 1.1 在 `src/modules/shortcuts/shortcuts.ts` 的 `ShortcutId` union 中新增 `"editor.goBack"` 和 `"editor.goForward"`，添加对应的 `Shortcut` 条目，默认绑定 macOS `Cmd+←/→`、其他平台 `Ctrl+←/→`

## 2. 导航历史状态

- [ ] 2.1 在 `src/app/App.tsx` 中新增 `navigationHistoryRef: useRef<Map<number, { back: NavEntry[]; forward: NavEntry[] }>>`，以 editor tab id 为 key；`NavEntry = { path: string; line: number }`
- [ ] 2.2 新增 `pushNavigationHistory(tabId: number, path: string, line: number): void`——压入 back stack 并清空 forward stack
- [ ] 2.3 新增 `goBack(tabId: number): void`——弹出 back stack 顶，压入 forward stack，打开文件并 gotoLine
- [ ] 2.4 新增 `goForward(tabId: number): void`——弹出 forward stack 顶，压入 back stack，打开文件并 gotoLine
- [ ] 2.5 在 tab 关闭回调中清理对应 tabId 的历史栈（复用现有 `onCloseTab` 或等效 hook）

## 3. 集成 openContentHit

- [ ] 3.1 修改 `openContentHit`：在调用 `openFileTab` 前，记录当前 active editor tab 的 path + 光标行到 back stack
- [ ] 3.2 光标行通过 `editorRefs.current.get(activeId)?.getCursorLine()` 获取（若方法不存在，用备选方案：记录 tab 当前打开的文件路径，行号用 `gotoLine` 参数回推，或直接记录 `line` 参数作为来源行）

## 4. 快捷键 Handler

- [ ] 4.1 在 `shortcutHandlers` map 中注册 `"editor.goBack"` 和 `"editor.goForward"` handler，两者均检查 `activeTab?.kind === "editor"`，不满足时 return
- [ ] 4.2 handler 调用 `pushNavigationHistory` 的反向操作（goBack/goForward），传递 `activeId`

## 5. 验证

- [ ] 5.1 手动验证：在 editor 中 Go-to-definition → 后退 → 前进，回到正确位置
- [ ] 5.2 手动验证：terminal file link 点击后后退可回到终端焦点
- [ ] 5.3 手动验证：非 editor tab 下 Cmd/Ctrl+箭头无导航行为
- [ ] 5.4 运行完整检查清单：`pnpm lint && pnpm check-types && pnpm test`
```

## openspec/changes/editor-navigation-history/specs/editor-navigation-history/spec.md

- Source: openspec/changes/editor-navigation-history/specs/editor-navigation-history/spec.md
- Lines: 1-58
- SHA256: d2190794054080e1072d9b2bbb976315055f3c7f98393b8c8dbba34c7645a35b

```md
## Purpose

为编辑器提供导航历史能力，让用户在通过 LSP 跳转或终端文件链接打开新文件后，能快速返回之前的编辑位置，模拟 VS Code 的 Back/Forward 导航体验。

## ADDED Requirements

### Requirement: 导航历史入栈
当用户通过 LSP navigator（Go-to-definition、terminal file link、Go-to-symbol）跳转到新文件时，系统 SHALL 将当前文件路径和行号压入导航历史栈，并清空前进栈。

#### Scenario: Go-to-definition 触发入栈
- **WHEN** 用户在 editor tab 中按 Go-to-definition，跳转到 `src/foo.ts:42`
- **THEN** 当前 tab 的导航历史栈压入 `{ path: 原文件, line: 原行号 }`，前进栈清空

#### Scenario: terminal file link 点击触发入栈
- **WHEN** 用户在终端 pane 中 Cmd/Ctrl+点击文件路径 `src/bar.ts:10`
- **THEN** 导航历史栈压入该 pane 的当前焦点位置（当前文件 + 光标行号），前进栈清空

### Requirement: 后退导航
用户按下后退快捷键时，系统 SHALL 弹出历史栈顶记录并打开对应文件跳转到指定行；若栈为空则无操作。

#### Scenario: 后退回到上一个文件
- **WHEN** 用户从 A:10 跳到 B:20 后按下后退快捷键
- **THEN** 编辑器打开文件 A 并跳转到第 10 行

#### Scenario: 后退栈空时无操作
- **WHEN** 用户按下后退快捷键且历史栈为空
- **THEN** 不执行任何操作，不报错

### Requirement: 前进导航
用户按下前进快捷键时，系统 SHALL 弹出前进栈顶记录并打开对应文件跳转到指定行；若栈为空则无操作。

#### Scenario: 后退后再前进恢复位置
- **WHEN** 用户从 A:10 → B:20 → 后退回到 A:10 → 按下前进快捷键
- **THEN** 编辑器跳转到 B:20，前进栈清空

#### Scenario: 前进栈空时无操作
- **WHEN** 用户按下前进快捷键且前进栈为空
- **THEN** 不执行任何操作

### Requirement: 快捷键绑定
系统 SHALL 响应以下快捷键组合：
- 后退：`Cmd+←`（macOS）或 `Ctrl+←`（其他平台）
- 前进：`Cmd+→`（macOS）或 `Ctrl+→`（其他平台）

#### Scenario: editor tab 下快捷键生效
- **WHEN** 当前 active tab 是 editor 类型，用户按下后退快捷键
- **THEN** 触发后退导航

#### Scenario: 非 editor tab 下快捷键无操作
- **WHEN** 当前 active tab 是 terminal 类型，用户按下后退快捷键
- **THEN** 不触发导航，快捷键不消耗（allowing other handlers to process it）

### Requirement: 导航栈隔离
每个 editor tab 的导航历史栈 SHALL 独立维护，互不干扰。

#### Scenario: 切换 tab 不影响其他 tab 的历史
- **WHEN** 用户在 TabA 有历史记录，切换到 TabB 后在 TabB 执行导航
- **THEN** TabA 的历史记录保持不变，切换回 TabA 后可正常后退
```

