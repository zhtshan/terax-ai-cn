# Brainstorm Summary

- Change: explorer-markdown-outline
- Date: 2026-08-17

## 确认的技术方案

在 EditorPane 内部新增一个 `ViewPlugin`（`outline.ts`），基于 CodeMirror 已有的 lezer 语法树自动提取 Markdown 标题，通过两个可选回调 prop 向外报告状态。

**激活条件**：EditorPane 挂载时对 `path` 调用 `isMarkdownPath()`；若为 Markdown 文件则挂载 `outlineViewPlugin`，否则零开销。

**大纲提取**：`ViewPlugin` 内部用 `syntaxTree(view.state)` 遍历 `ATXHeading1`-`6` 节点，提取 `{ level, text, line }[]`；文档变化时防抖 300ms 后通过 `onOutlineChange` 回调上报。

**光标高亮**：同一 `ViewPlugin` 监听 selection 变化，线性查找"最后一个 `line <= 当前光标行`"的标题，通过 `onActiveHeadingChange` 即时上报（不防抖，计算极轻）。

**状态持有**：App.tsx 新增 `outlineHeadings` / `activeHeadingLine` 两个 state；只为当前激活 tab 的 EditorPane 传入两个回调；切换 tab 时 state 自动更新。

**跳转**：`OutlineSection` 接收 `(line: number) => void` 跳转回调 prop；点击时调用 `editorRefs.current.get(activeId)?.gotoLine(line)`。

**空态**：非 Markdown 文件（`headings === null`）时，`OutlineSection` 显示现有占位文案，保持视觉一致。

## 关键取舍与风险

| 项目 | 决策 |
|------|------|
| 激活方式 | 按扩展名 `isMarkdownPath()` 自动判断，无需显式 prop |
| 状态持有位置 | App.tsx（符合既有 `editorRefs`/`activeId` 模式） |
| 回调频率 | 大纲防抖 300ms；高亮实时（不防抖，计算极轻） |
| 跳转实现 | 复用 `gotoLine`，不新增跳转逻辑 |
| 风险：快速移动光标 | 计算 O(n) 线性比较，预期无性能问题；如实测卡顿再加节流 |

## 测试策略

- 验收场景通过手测覆盖（proposal 已列出 6 个场景）
- 全量检查：`pnpm lint && pnpm check-types && pnpm test`

## Spec Patch

无。spec 的 5 个场景均已覆盖，技术方案完全对应，无需回写 delta spec。
