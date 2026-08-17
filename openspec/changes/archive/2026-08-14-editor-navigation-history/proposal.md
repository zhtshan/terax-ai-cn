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
