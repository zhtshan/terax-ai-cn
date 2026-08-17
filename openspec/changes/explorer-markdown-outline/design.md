## Context

见 proposal.md - Why。技术约束（已核实）：

- Markdown 语言支持已用 `@codemirror/lang-markdown`（`languageDefinitions.ts:143-158`），基于 lezer 语法树，标题节点是 `ATXHeading1`-`ATXHeading6`。
- 跳转能力已存在：`EditorPaneHandle`（`EditorPane.tsx:62`）暴露 `gotoLine: (line: number) => void`（"Move the cursor to a 1-based line and center it"），内部用 `EditorView.scrollIntoView(at, { y: "center" })` 实现，与验收场景"跳转并居中"完全一致，直接复用即可。
- `App.tsx` 已有 `editorRefs`（tab id → `EditorPaneHandle`）的 Map，`openContentHit`/`navigateToLocation`（`App.tsx:765-793`）展示了"取 handle 调用 gotoLine"的既定模式。大纲跳转比这两者更简单：不需要打开新 tab、不需要记录导航历史，直接 `editorRefs.current.get(activeId)?.gotoLine(line)` 即可。
- **未发现**任何现成的"光标位置变化"响应式订阅机制（`EditorPaneHandle` 只有命令式的 `getCursorLine()`，没有 `onCursorChange` 之类的回调；status bar 也没有行列号指示器）。"高亮当前光标所在标题"这个需求需要新增一个响应式通道，不是复用现成能力。

## Goals / Non-Goals

**Goals:**
- 用 CodeMirror 语法树增量解析标题，不引入独立的 Markdown 解析器或重新解析原始文本。
- 复用现有 `gotoLine` 跳转能力，不新建跳转逻辑。
- 新增一个轻量的光标位置响应式回调，仅在 Markdown 文件时启用，避免给所有文件类型增加开销。

**Non-Goals:**
- 不做非 Markdown 文件的符号大纲（`change4` 的 LSP `documentSymbol`）。
- 不改动 `explorer-collapsible-sections` 的布局地基。
- 不新增 status bar 行列号指示器（虽然技术上相关，但不在本次范围）。

## Decisions

**1. 大纲提取用 CodeMirror `ViewPlugin` 复用已有语法树，不用独立 Markdown 解析器**
新增一个扩展（如 `src/modules/editor/lib/outline.ts`），以 `ViewPlugin` 形式监听文档变化，用 `syntaxTree(view.state)` 遍历 `ATXHeading1`-`6` 节点提取 `{ level, text, line }[]`。只在当前文件语言是 Markdown 时挂载该扩展（参照 `markdownExtras()` 的挂载方式）。
备选方案（在大纲组件里用 `@lezer/markdown` 单独 `parser.parse(text)` 解析原始文本）被否决：会重复解析已经被 CodeMirror 解析过的内容，且需要独立维护"文本何时变化"的订阅，不如直接复用编辑器自身的语法树增量解析。

**2. 新增 `onOutlineChange` 回调 prop，防抖后上报标题列表**
`EditorPane` 新增可选 prop `onOutlineChange?: (headings: MarkdownHeading[] | null) => void`。非 Markdown 文件时传 `null`（大纲组件据此显示空态）。文档变化时用 debounce（如 300ms）触发上报，避免每次按键都重新计算大纲组件的渲染。

**3. 新增 `onActiveHeadingChange` 回调 prop，用光标行号做轻量匹配**
同一个 `ViewPlugin` 监听 selection 变化（不需要 debounce，这个计算很轻量：拿当前光标行号，在已提取的标题行号列表里二分/线性查找"最后一个 line <= 当前光标行"的标题即为当前高亮项）。新增回调 `onActiveHeadingChange?: (line: number | null) => void`，只上报"当前高亮标题的行号"，不重新计算整个大纲。

**4. 状态持有在 `App.tsx`，只为当前激活 tab 订阅**
`EditorStack`/`App.tsx` 只给当前激活的 `EditorPane` 实例传入 `onOutlineChange`/`onActiveHeadingChange`（非激活 tab 不需要计算大纲），结果存入 `App.tsx` 的 state，传给侧栏大纲区块组件。切换激活 tab 时，新激活 pane 的初次挂载/prop 变化会重新上报一次大纲。
备选方案（大纲组件自己通过某种全局 store 订阅"当前编辑器"）被否决：项目里没有这种全局编辑器状态 store，`App.tsx` 持有 `editorRefs`/`activeId` 已经是既定的"当前活动编辑器"访问方式，遵循既有模式成本最低。

**5. 点击跳转直接复用 `editorRefs`**
大纲区块的点击回调形如 `(line: number) => editorRefs.current.get(activeId)?.gotoLine(line)`，通过 props 从 `App.tsx` 传入侧栏容器再传给大纲区块，不新增跳转相关的状态或事件总线。

## Risks / Trade-offs

- **[Risk]** 光标变化的响应式上报如果不加节流，在快速移动光标（如按住方向键）时可能触发大纲高亮频繁重渲染。
  → **Mitigation**：`onActiveHeadingChange` 的计算本身很轻（行号比较），重渲染开销预期很小；如实测有卡顿，再加节流（而非防抖，因为需要跟手）。
- **[Risk]** 大文档（标题数量多、文档很长）频繁编辑时，防抖窗口内如果用户连续输入，可能出现大纲短暂滞后于实际内容。
  → **Mitigation**：这是防抖机制的预期权衡，300ms 量级对人眼是可接受的滞后，若实测体验不好可调整防抖时长。
- **[Risk]** `ViewPlugin` 只在语言为 Markdown 时挂载，语言切换（如把文件重命名/切换语言模式）时机需要正确处理 compartment 重新配置，避免遗留旧扩展或漏挂载。
  → **Mitigation**：参照 `EditorPane.tsx` 里 `languageCompartment.reconfigure(result.ext)` 现有的语言切换逻辑（`EditorPane.tsx:420-426`），把大纲扩展作为该语言配置的一部分一起 reconfigure。

## Migration Plan

纯前端新增功能，无数据迁移。依赖 `explorer-collapsible-sections` 的大纲区块容器先落地；`EditorPane` 的新增回调 prop 均为可选，向后兼容，不影响未传入回调的现有调用方。
