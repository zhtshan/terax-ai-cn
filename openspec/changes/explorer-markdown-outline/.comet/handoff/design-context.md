# Comet Design Handoff

- Change: explorer-markdown-outline
- Phase: design
- Mode: compact
- Context hash: 4a6692623f9f0818efa09ff3cb6659a4b24b3785a9cc38304d84c6e14954655c

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/explorer-markdown-outline/proposal.md

- Source: openspec/changes/explorer-markdown-outline/proposal.md
- Lines: 1-25
- SHA256: b96cd4056c009bfc143a08477b20fcf7f61176ae8e174c3bd3b646281fbc3f57

```md
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
```

## openspec/changes/explorer-markdown-outline/design.md

- Source: openspec/changes/explorer-markdown-outline/design.md
- Lines: 1-52
- SHA256: e280bffd3c78d1fd81549e373e9ea0f955d150a51351d4ccc1a38e49bb007f57

```md
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
```

## openspec/changes/explorer-markdown-outline/tasks.md

- Source: openspec/changes/explorer-markdown-outline/tasks.md
- Lines: 1-35
- SHA256: 67cff751f3e143eb33e5946ae762c2a9b073dd8e215b912cbdf3064b046b2aaa

```md
## 1. 编辑器：大纲提取扩展

- [ ] 1.1 新增 `src/modules/editor/lib/outline.ts`：`ViewPlugin`，用 `syntaxTree(view.state)` 遍历 `ATXHeading1`-`6` 提取 `{ level, text, line }[]`
- [ ] 1.2 仅在当前文件语言为 Markdown 时挂载该扩展，参照 `languageCompartment.reconfigure` 的既有语言切换逻辑
- [ ] 1.3 文档变化时防抖（如 300ms）触发标题列表重新计算

## 2. 编辑器：光标位置匹配当前标题

- [ ] 2.1 在同一 `ViewPlugin` 里监听 selection 变化，用光标行号在标题行号列表中找到"最后一个 line <= 当前行"的标题
- [ ] 2.2 新增回调 prop `onActiveHeadingChange?: (line: number | null) => void`，轻量上报，不防抖

## 3. EditorPane 对外接口

- [ ] 3.1 `EditorPane` 新增可选 prop `onOutlineChange?: (headings: MarkdownHeading[] | null) => void`，非 Markdown 时上报 `null`
- [ ] 3.2 新增可选 prop `onActiveHeadingChange?: (line: number | null) => void`
- [ ] 3.3 定义 `MarkdownHeading` 类型（`level`/`text`/`line`），放在合适的共享位置（如 `src/modules/editor/lib/outline.ts` 导出）

## 4. App.tsx：状态持有与转发

- [ ] 4.1 只给当前激活 tab 对应的 `EditorPane` 传入 `onOutlineChange`/`onActiveHeadingChange`
- [ ] 4.2 持有大纲标题列表 + 当前高亮标题行号的 state，切换激活 tab 时正确重置/更新
- [ ] 4.3 大纲点击跳转回调：`(line) => editorRefs.current.get(activeId)?.gotoLine(line)`，向下传给侧栏大纲区块

## 5. 大纲区块 UI

- [ ] 5.1 接入 `explorer-collapsible-sections` 留的大纲区块容器（替换占位文案）
- [ ] 5.2 渲染标题层级列表（缩进对应 `level`），点击调用跳转回调
- [ ] 5.3 高亮当前激活标题对应的列表项
- [ ] 5.4 非 Markdown 文件（`headings === null`）时显示空态

## 6. 验收与收尾

- [ ] 6.1 逐条走查 `specs/explorer-markdown-outline/spec.md` 的全部场景
- [ ] 6.2 手测大文档场景下编辑防抖和光标移动高亮的实际体验，视需要调整防抖时长
- [ ] 6.3 跑 `pnpm lint && pnpm check-types && pnpm test`
```

## openspec/changes/explorer-markdown-outline/specs/explorer-markdown-outline/spec.md

- Source: openspec/changes/explorer-markdown-outline/specs/explorer-markdown-outline/spec.md
- Lines: 1-40
- SHA256: 381d0867c1e1f360eac45b11dcb465904a968f5a5887bd93290b90e6803f6a4e

```md
## Purpose

侧栏大纲区块展示当前激活 Markdown 文件的标题层级结构，支持点击跳转和当前位置高亮，帮助用户在长文档中快速定位。

## ADDED Requirements

### Requirement: 展示 Markdown 标题层级大纲
当前激活文件为 Markdown 时，大纲区块 SHALL 展示该文件中所有标题（一级到六级）组成的层级列表，层级关系与标题级别一致。

#### Scenario: 打开多级标题的 Markdown 文件
- **WHEN** 用户打开一个包含多级标题的 Markdown 文件
- **THEN** 大纲区块显示标题层级列表，层级缩进与标题的 `#` 级别对应

### Requirement: 点击标题跳转并居中
点击大纲中的某个标题条目，SHALL 将编辑器光标移动到该标题所在位置并将其滚动到视口居中。

#### Scenario: 点击大纲标题
- **WHEN** 用户点击大纲列表中的一个标题条目
- **THEN** 编辑器跳转到该标题对应的行并居中显示

### Requirement: 编辑时防抖刷新大纲
用户编辑 Markdown 文档内容（增加、删除、修改标题）后，大纲列表 SHALL 在防抖延迟后自动刷新为最新的标题结构。

#### Scenario: 编辑标题后大纲刷新
- **WHEN** 用户在编辑器中修改、新增或删除一个标题
- **THEN** 大纲列表在短暂延迟后更新为反映最新文档结构的标题列表

### Requirement: 高亮当前光标所在标题
大纲 SHALL 根据编辑器当前光标所在位置，高亮显示光标所属的标题条目，并随光标移动或滚动更新。

#### Scenario: 光标移动到某标题范围内
- **WHEN** 用户将光标移动到某个标题及其内容范围内
- **THEN** 大纲中对应的标题条目被高亮，此前高亮的条目取消高亮

### Requirement: 非 Markdown 文件的空态
当前激活文件不是 Markdown 文件时，大纲区块 SHALL 显示空态提示而非报错或空白。

#### Scenario: 打开非 Markdown 文件
- **WHEN** 用户打开一个非 Markdown 类型的文件
- **THEN** 大纲区块显示空态提示，说明当前文件不支持大纲
```

