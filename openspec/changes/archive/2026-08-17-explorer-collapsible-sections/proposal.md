## Why

侧栏文件资源管理器目前只能显示文件树。要支持后续的"大纲"（当前文件标题/符号列表）和"时间线"（当前文件 Git 提交历史）功能，需要先把侧栏容器从单一文件树重构为可容纳多个区块的布局。这是大纲、时间线两个后续 change 的共享地基，提前独立完成可以避免两个功能各自重复设计布局、减少后续 change 的耦合和返工。

## What Changes

- 将 `src/modules/explorer/FileExplorer.tsx` 的顶层容器从单一文件树布局，重构为「文件树 / 大纲 / 时间线」三个垂直堆叠的可折叠区块（section）。
- 复用现有的 `ResizablePanelGroup` / `ResizablePanel` / `ResizableHandle`（`src/components/ui/resizable.tsx`，已用于 `App.tsx` 中 sidebar/workspace 的水平分割）实现三段垂直可拖拽调高。
- 区块可折叠：折叠后只保留 header 高度，释放的空间由其余展开的区块占据（复用现有的 collapse-to-0 机制，参考 `src/modules/sidebar/useSidebarPanel.ts` 中 `persistSidebarCollapsed` 的持久化模式）。
- 每个区块的展开/折叠状态和高度比例持久化到 `localStorage`，刷新/重启后保持一致。
- 新增两个占位区块组件（大纲、时间线），本次仅展示 header + 空态占位文案，不接入真实数据。
- 文件树区块内部的虚拟列表（`useVirtualizer`）需要在区块高度随拖拽/折叠变化时正确适配，不出现错位或空白。

## Capabilities

### New Capabilities
- `explorer-sections`：侧栏文件资源管理器的多区块（文件树/大纲/时间线）可折叠、可拖拽调高布局，及其展开状态与高度比例的持久化行为。

### Modified Capabilities
（无。文件树本身的交互逻辑——搜索、拖拽、右键菜单等——不变。）

## Impact

- `src/modules/explorer/FileExplorer.tsx`：拆分为容器 + 文件树 section。
- `src/modules/explorer/`：新增大纲、时间线占位 section 组件，新增区块状态持久化逻辑（storage key、hook）。
- 不涉及 `src-tauri` 后端，不涉及 `git-history`、`lsp` 模块（留给后续 change）。
