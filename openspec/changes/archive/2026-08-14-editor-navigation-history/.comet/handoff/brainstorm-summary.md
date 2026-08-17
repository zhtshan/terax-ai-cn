# Brainstorm Summary

- Change: editor-navigation-history
- Date: 2026-08-13

## 确认的技术方案

### 存储结构
- `App.tsx` 内 `useRef<Map<number, NavStack>>`，key = editor tab id
- `NavStack = { back: NavEntry[]; forward: NavEntry[] }`
- `NavEntry = { path: string; line: number }`

### 入栈时机
- 在 `openContentHit(path, line)` 调用 `openFileTab` **之前**，记录当前 active editor tab 的 path + 光标行
- path 来源：`activeTab.path`（已有）
- line 来源：新增 `EditorPaneHandle.getCursorLine(): number`，通过 `view.state.selection.main.head` 换算为 1-based line

### 快捷键
- `"editor.goBack"` → `Cmd+←`（macOS）/ `Ctrl+←`（其他）
- `"editor.goForward"` → `Cmd+→`（macOS）/ `Ctrl+→`（其他）
- handler 检查 `activeTab?.kind === "editor"`，否则 return

### 修改文件
1. `src/modules/editor/EditorPane.tsx` — 新增 `getCursorLine()` 方法
2. `src/modules/lsp/lib/navigator.ts` — 无需改动（历史在 openContentHit 层 push，不经过 navigator）
3. `src/modules/shortcuts/shortcuts.ts` — 新增 2 个 ShortcutId + Shortcut 条目
4. `src/app/App.tsx` — 新增 navigationHistoryRef + push/goBack/goForward + shortcut handlers + tab 关闭清理

## 关键取舍与风险

**取舍**：历史栈存在 App.tsx 的 useRef 而非 Zustand store
- 理由：session-scoped，无需跨组件订阅，避免引入 store 复杂度
- 风险：若未来需要在设置页展示导航历史，需额外改造（当前不在范围）

**风险**：光标行记录精度
- 跳转瞬间的光标行 ≠ 用户最终编辑位置，符合 VS Code 行为，可接受

## 测试策略
- 单元测试：无（纯 UI 交互，无纯函数逻辑）
- 手动验证：Go-to-definition → 后退 → 前进；terminal file link；非 editor tab 无操作

## Spec Patch
无（现有 spec 已覆盖所有场景）
