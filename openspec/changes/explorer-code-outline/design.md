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
