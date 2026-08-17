## Why

`explorer-markdown-outline` change 让大纲区块支持了 Markdown 文件，但项目里日常编辑的更多是代码文件。用户在阅读/编辑代码文件时，同样需要快速看到函数、类、变量等符号结构并跳转，而不必依赖编辑器自身的搜索或滚动。

## What Changes

- LSP 客户端（`src/modules/lsp/lib/client.ts`）新增 `textDocument/documentSymbol` 请求方法，沿用现有 `textDocumentReferences` 的 `this.raw.request(...)` 模式。
- `sessionManager.ts` 新增一个只读访问点（如 `requestDocumentSymbols(path, langId)`），供大纲功能获取符号列表，不直接对外暴露 `TeraxLspClient` 实例，保持现有会话封装。
- 请求时机：文件打开时发起一次，保存后重新发起一次；不像 Markdown 大纲那样在编辑过程中防抖实时刷新。
- 归一化处理 LSP 响应可能的两种形态（层级 `DocumentSymbol[]` 或扁平 `SymbolInformation[]`），统一转换为大纲展示用的数据结构。
- 请求前检查服务器 `capabilities.documentSymbolProvider`，不支持时归入"未配置/不支持"空态。
- 扩展 `explorer-markdown-outline` 交付的大纲 UI：把仅服务 Markdown 的 `MarkdownHeading` 类型泛化为通用 `OutlineItem`（level/text/line，新增可选 `kind` 用于符号类型图标），使同一大纲区块能同时支持 Markdown 标题和代码符号。
- 区分"该语言未配置/未启用 LSP"与"请求失败"两类空态文案。
- 点击符号跳转，复用已有的 `gotoLine` 能力。

## Capabilities

### New Capabilities
- `explorer-code-outline`：侧栏大纲区块对非 Markdown 代码文件，通过 LSP documentSymbol 展示符号大纲，支持打开/保存刷新、点击跳转、区分空态类型。

### Modified Capabilities
（无。大纲区块对用户可见的 Markdown 标题展示、跳转、高亮行为不变；`MarkdownHeading` → `OutlineItem` 是纯内部类型重构，不改变任何可观察行为，因此不作为 spec 级变更处理。`explorer-markdown-outline` change 尚未归档进 `openspec/specs/`，也不构成可对照的既有 spec。）

## Impact

- `src/modules/lsp/lib/client.ts`：新增 documentSymbol 请求方法。
- `src/modules/lsp/lib/sessionManager.ts`：新增只读访问点。
- `src/modules/editor/EditorPane.tsx`：新增请求触发时机（打开/保存）。
- `src/app/App.tsx`：转发代码符号大纲状态，与 Markdown 大纲共用同一份状态通道。
- `src/modules/explorer/`：大纲区块组件类型从 `MarkdownHeading` 泛化为 `OutlineItem`，新增空态文案分支。
- 依赖 `explorer-markdown-outline`（大纲 UI 组件与 `gotoLine` 接入方式）先落地。
- 不涉及非本地 workspace（LSP 本身只支持 local）。
