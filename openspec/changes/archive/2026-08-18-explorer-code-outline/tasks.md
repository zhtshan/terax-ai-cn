## 1. LSP 客户端：documentSymbol 请求

- [ ] 1.1 `client.ts` 新增 `textDocumentSymbol` 方法，沿用 `textDocumentReferences` 的 `this.raw.request(...)` 模式
- [ ] 1.2 请求前检查 `client.capabilities.documentSymbolProvider`，不支持时直接返回 `null`

## 2. sessionManager：只读访问点

- [ ] 2.1 新增 `requestDocumentSymbols(path, langId)`，内部定位已有 session 并调用 1.1 的方法，不导出 client 实例
- [ ] 2.2 无 session（未配置/未启用该语言 LSP）时返回 `null`；请求异常时抛出，交由调用方归类为"请求失败"

## 3. 响应归一化

- [ ] 3.1 新增归一化工具函数，处理层级 `DocumentSymbol[]` 和扁平 `SymbolInformation[]` 两种响应形态
- [ ] 3.2 统一输出 `OutlineItem { level, text, line, kind? }`，按 `line` 排序保证顺序与文件内位置一致

## 4. EditorPane：触发时机

- [ ] 4.1 文档加载完成且语言非 Markdown 时，调用 `requestDocumentSymbols` 一次
- [ ] 4.2 在现有保存流程（`textDocumentDidSave` 触发点）追加一次 documentSymbol 请求
- [ ] 4.3 捕获请求异常，通过既有的 outline 回调上报"请求失败"状态

## 5. 大纲 UI 组件扩展（依赖 explorer-markdown-outline 已交付的组件）

- [ ] 5.1 把 `MarkdownHeading` 类型泛化为通用 `OutlineItem`，确认不影响 Markdown 场景现有展示
- [ ] 5.2 新增"未配置/未启用 LSP"和"请求失败"两类空态文案分支
- [ ] 5.3 符号列表项按 `kind` 展示图标（如函数/类/变量），点击复用现有 `gotoLine` 跳转链路

## 6. 验收与收尾

- [ ] 6.1 逐条走查 `specs/explorer-code-outline/spec.md` 的全部场景（至少用一种已配置 LSP 的语言如 TypeScript 实测）
- [ ] 6.2 手测未启用 LSP 的语言文件、请求失败（如临时断开语言服务器）两种空态
- [ ] 6.3 确认 Markdown 大纲场景（`explorer-markdown-outline` 的验收场景）未被本次类型泛化破坏
- [ ] 6.4 跑 `pnpm lint && pnpm check-types && pnpm test`
