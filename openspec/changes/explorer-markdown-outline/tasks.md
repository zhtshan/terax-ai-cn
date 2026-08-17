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
