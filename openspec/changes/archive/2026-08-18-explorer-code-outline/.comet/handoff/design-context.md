# Comet Design Handoff

- Change: explorer-code-outline
- Phase: design
- Mode: compact
- Context hash: c30d4174d550f8bac85f0d116411b676b2cc3cf44b43d99dc6103c1eda165de7

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/explorer-code-outline/proposal.md

- Source: openspec/changes/explorer-code-outline/proposal.md
- Lines: 1-32
- SHA256: c2831013b6dc8dd5ffbc9126198dd3cce71c4f065f90aae92bd52c0aefcf44fb

```md
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
```

## openspec/changes/explorer-code-outline/design.md

- Source: openspec/changes/explorer-code-outline/design.md
- Lines: 1-54
- SHA256: f9a4f52d8686ce8abc5bb57be00c013d8b7da715c6bacaf20daaa4eb484cf77e

```md
## Context

见 proposal.md - Why。技术约束（已核实）：

- `TeraxLspClient`（`src/modules/lsp/lib/client.ts`）已有 `textDocumentReferences` 方法示范了请求模式：`this.raw.request("textDocument/references", params, 10_000)`。新增 `textDocumentSymbol` 直接照此模式即可：`this.raw.request("textDocument/documentSymbol", { textDocument: { uri } }, timeoutMs)`。
- `TeraxLspClient` 继承自 `codemirror-languageserver` 包的 `LanguageServerClient`，该基类在初始化后暴露 `capabilities: LSP.ServerCapabilities`（`node_modules/codemirror-languageserver/dist/plugin.d.ts:80`），可用 `client.capabilities.documentSymbolProvider` 判断服务器是否支持该能力，无需额外探测逻辑。
- `acquireDocExtension`（`sessionManager.ts:63`）目前只对外返回 `LspDocHandle = { extension, release }`，不暴露内部 `Managed.client`（`sessionManager.ts:27`）。大纲功能需要在不破坏这层封装的前提下拿到 client，方案是在 `sessionManager.ts` 内新增一个函数（例如 `requestDocumentSymbols(path, langId): Promise<RawSymbol[] | null>`），内部查找已有的 session 并发起请求，只把结果返回给调用方，不导出 client 类型本身。
- `useLspRuntimeStore`（`runtimeStore.ts`）按 session key 记录 `status: "starting" | "running" | "error"`，可用于区分"服务未就绪"和"未配置/未启用"两类情况：没有对应 preset（`serverForLanguage` 返回 `null`）或 `lspActivation` 未启用 → 未配置/未启用；有 session 但 `status === "error"` 或请求本身超时/报错 → 请求失败。
- `explorer-markdown-outline` change 已经建立了 `MarkdownHeading { level, text, line }` 类型和大纲 UI 组件、`onOutlineChange`/`onActiveHeadingChange` 回调链路、`App.tsx` 里"只给当前激活 tab 转发"的模式。本 change 直接复用这条链路，不重新设计。

## Goals / Non-Goals

**Goals:**
- 新增 documentSymbol 请求能力，遵循 `sessionManager.ts` 现有的封装边界（不对外暴露 client 实例）。
- 归一化 LSP 两种响应形态为统一的 `OutlineItem`，让大纲 UI 组件同时服务 Markdown 和代码符号。
- 区分"未配置/未启用 LSP"和"请求失败"两类空态。

**Non-Goals:**
- 不新增 LSP 预设或启用开关，完全依赖用户已有的 `lspActivation` 设置。
- 不支持非本地 workspace（`acquireDocExtension` 本身已限制 `currentWorkspaceEnv().kind !== "local"` 时返回 `null`）。
- 不改变 Markdown 大纲对用户可见的行为（复用不等于重新设计）。

## Decisions

**1. `sessionManager.ts` 新增只读访问函数，而非导出 client 类型**
新增 `requestDocumentSymbols(path: string, langId: string): Promise<RawDocumentSymbol[] | null>`（命名待实现时确认），内部：查找 `path`/`langId` 对应的已有 `Managed` session（复用 `acquireDocExtension` 里定位 session 的逻辑），若无 session 或 `capabilities.documentSymbolProvider` 为假值，返回 `null`（大纲组件据此展示"未配置/未启用"空态）；否则发起 `textDocument/documentSymbol` 请求并返回原始结果，请求失败时抛出异常，由调用方（`EditorPane`）捕获并归类为"请求失败"空态。

**2. 请求触发点在 `EditorPane`，时机为"打开 + 保存后"**
`EditorPane` 在文档加载完成（`useDocument` 就绪）且语言非 Markdown 时，调用 `requestDocumentSymbols` 一次；`textDocumentDidSave` 触发保存通知的同一位置（`EditorPane.tsx` 现有保存流程）追加一次 documentSymbol 请求。不监听文档变化事件（区别于 Markdown 大纲的编辑防抖刷新），避免频繁请求语言服务器。

**3. 响应归一化为统一的 `OutlineItem`**
在新增的一处工具函数（如 `src/modules/lsp/lib/documentSymbol.ts`）里处理两种 LSP 响应形态：
- `DocumentSymbol[]`（层级，含 `children`）：递归展开，`level` 按嵌套深度计算。
- `SymbolInformation[]`（扁平，含 `location`）：`level` 统一按 0 处理（无层级信息可用）。
归一化输出统一为 `OutlineItem { level: number; text: string; line: number; kind?: SymbolKind }`，与 `explorer-markdown-outline` 的 `MarkdownHeading` 结构对齐（那边的 `MarkdownHeading` 类型改名/泛化为 `OutlineItem`，`kind` 对 Markdown 场景可省略）。

**4. 状态转发复用 `explorer-markdown-outline` 已建立的通道**
`App.tsx` 现有的"只给当前激活 tab 传 outline 回调、持有 outline state、转发给侧栏"这条链路不变，只是回调签名从 `MarkdownHeading[] | null` 改为 `OutlineItem[] | null`，并新增区分空态原因的字段（如 `outlineUnavailableReason?: "unsupported-language" | "request-failed"`，具体命名在实现时确定）。

**5. 点击跳转不变**
沿用 `explorer-markdown-outline` 已经接好的 `gotoLine` 跳转链路，代码符号跳转与 Markdown 标题跳转走同一段代码。

## Risks / Trade-offs

- **[Risk]** 部分语言服务器对 `SymbolInformation`（扁平形式）返回的符号顺序可能不是文件内的自然顺序（有的按名称排序），会导致大纲列表顺序与代码实际顺序不一致。
  → **Mitigation**：归一化后按 `line` 字段排序，保证展示顺序始终与文件内位置一致，不依赖服务器返回顺序。
- **[Risk]** "打开时 + 保存后"刷新意味着编辑过程中新增/删除的符号不会实时出现在大纲里，用户可能觉得大纲"过期"。
  → **Mitigation**：这是本次明确的范围决策（design 阶段已与用户确认），如后续反馈体验不佳，可作为独立的后续改进单独评估防抖实时刷新的成本。
- **[Risk]** `capabilities.documentSymbolProvider` 检查依赖 session 已完成初始化；如果大纲请求发生在初始化完成之前，可能拿不到准确的 capabilities 判断结果。
  → **Mitigation**：`requestDocumentSymbols` 在 session 未就绪时统一返回 `null`（视为"未配置/不可用"），不做额外的等待重试逻辑，保持实现简单。

## Migration Plan

纯前端新增功能，无数据迁移。依赖 `explorer-markdown-outline` 交付的大纲 UI 组件和状态转发链路先落地并完成 `MarkdownHeading` → `OutlineItem` 的类型泛化。
```

## openspec/changes/explorer-code-outline/tasks.md

- Source: openspec/changes/explorer-code-outline/tasks.md
- Lines: 1-33
- SHA256: 86ad2060c81fe11bf8a90591e89a582de0a3dd345754a065be00047633a53ee6

```md
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
```

## openspec/changes/explorer-code-outline/specs/explorer-code-outline/spec.md

- Source: openspec/changes/explorer-code-outline/specs/explorer-code-outline/spec.md
- Lines: 1-40
- SHA256: 341380f3570c97758ae07df1b40dae6f2777622c4a67ede16b97b71f8dafb0d1

```md
## Purpose

侧栏大纲区块对启用了语言服务器的代码文件，通过 LSP 展示函数、类、变量等符号层级结构，支持点击跳转，帮助用户在代码文件中快速定位。

## ADDED Requirements

### Requirement: 展示代码文件的符号大纲
当前激活文件为非 Markdown 文件，且该语言已启用语言服务器并且服务器运行中、支持 documentSymbol 能力时，大纲区块 SHALL 展示该文件的符号层级列表。

#### Scenario: 打开已启用 LSP 的代码文件
- **WHEN** 用户打开一个语言服务器已启用且运行中的代码文件
- **THEN** 大纲区块显示该文件的符号列表（函数、类、变量等）

### Requirement: 打开与保存时刷新
大纲区块 SHALL 在文件打开时请求一次符号列表，并在文件保存后重新请求刷新；编辑过程中不实时刷新。

#### Scenario: 保存文件后大纲刷新
- **WHEN** 用户编辑代码文件后保存
- **THEN** 大纲区块重新请求并显示保存后的最新符号列表

### Requirement: 点击符号跳转并居中
点击大纲中的某个符号条目，SHALL 将编辑器光标移动到该符号所在位置并将其滚动到视口居中。

#### Scenario: 点击大纲符号
- **WHEN** 用户点击大纲列表中的一个符号条目
- **THEN** 编辑器跳转到该符号对应的行并居中显示

### Requirement: 未配置或未启用 LSP 的空态
当前激活文件所属语言未配置语言服务器，或用户未启用该语言的语言服务器时，大纲区块 SHALL 显示对应的空态提示，与请求失败的空态文案区分。

#### Scenario: 打开未启用 LSP 的语言文件
- **WHEN** 用户打开一个所属语言未启用语言服务器的代码文件
- **THEN** 大纲区块显示"未配置/未启用语言服务器"一类的空态提示

### Requirement: 请求失败的空态
当 documentSymbol 请求失败（超时、服务器错误、服务器不支持该能力）时，大纲区块 SHALL 显示请求失败的空态提示，而非报错弹窗或空白。

#### Scenario: documentSymbol 请求失败
- **WHEN** 语言服务器对 documentSymbol 请求返回错误或超时
- **THEN** 大纲区块显示请求失败的空态提示，不弹出错误对话框
```

