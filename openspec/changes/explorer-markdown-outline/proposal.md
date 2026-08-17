## Why

`explorer-collapsible-sections` change 为侧栏提供了大纲区块的容器地基，但内容还是占位文案。用户在编辑长 Markdown 文档（如需求文档、设计文档）时，需要快速看到标题层级结构并跳转，而不是手动滚动查找。

## What Changes

- 编辑器（`src/modules/editor/EditorPane.tsx`）新增一个基于 CodeMirror 语法树（`@codemirror/lang-markdown` 的 lezer 语法树，遍历 `ATXHeading1`-`6` 节点）的大纲提取能力，仅在当前文件语言为 Markdown 时生效。
- 大纲随文档编辑防抖刷新；随光标位置变化高亮当前所在标题。
- 大纲区块（在 `explorer-collapsible-sections` 提供的容器内）展示标题层级列表，点击某项跳转到编辑器对应位置并居中（复用现有 `EditorPaneHandle.gotoLine`）。
- 非 Markdown 文件时，大纲区块显示空态。

## Capabilities

### New Capabilities
- `explorer-markdown-outline`：侧栏大纲区块展示当前激活 Markdown 文件的标题层级大纲，支持点击跳转、编辑实时刷新、当前标题高亮。

### Modified Capabilities
（无。Markdown 编辑器本身的语法高亮、自动补全等行为不变。）

## Impact

- `src/modules/editor/EditorPane.tsx` / `src/modules/editor/lib/`：新增大纲提取扩展（CodeMirror ViewPlugin），新增对外回调 prop。
- `src/app/App.tsx`：新增大纲状态（当前标题列表 + 当前高亮标题）的持有和转发，复用现有 `editorRefs` 做跳转。
- `src/modules/explorer/`：大纲区块从占位态改为真实数据态。
- 依赖 `explorer-collapsible-sections` 提供的大纲区块容器先落地。
