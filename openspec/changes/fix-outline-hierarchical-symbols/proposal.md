## Why

代码大纲的「树形层级展示」和「展开/折叠全部」在 UI 层已实现（`OutlineSection.tsx` 的 `buildOutlineTree` / `toggleAll`，单元测试 5 项全过），但实际运行时两个功能都完全不生效：大纲永远是一条平铺列表，头部按钮点击无任何反应。

根因不在 UI，在 LSP 客户端的 initialize 握手：`src/modules/lsp/lib/client.ts:437` 的 `getInitializeParams()` 只补充了 `publishDiagnostics` 和 `references`，而底层库 `codemirror-languageserver` 的默认 capabilities 完全没有 `textDocument.documentSymbol` 一项。按 LSP 规范，客户端不声明 `hierarchicalDocumentSymbolSupport: true` 时，服务器只返回扁平的 `SymbolInformation[]`。

用 typescript-language-server 对同一文件实测确认：

| initialize 声明 | 返回条目 | 结构 |
|---|---|---|
| 不声明（当前代码） | 17 条 | `SymbolInformation`（扁平，仅 name/kind/location） |
| 声明 `hierarchicalDocumentSymbolSupport: true` | 3 条 | `DocumentSymbol`（带 children 层级） |

连锁后果：`normalizeDocumentSymbols` 走扁平分支 → 所有 item 的 `level` 恒为 1 → `buildOutlineTree` 产出全根节点（无树形）→ 无节点有 children → `parentKeys` 为空集 → `allCollapsed` 恒 false、`toggleAll` 赋空集（按钮无效）。

## What Changes

- `TeraxLspClient.getInitializeParams()` 补充 `textDocument.documentSymbol` capability，声明 `hierarchicalDocumentSymbolSupport: true`，并补 `symbolKind.valueSet` 以对齐已有的 `symbolKindIcons` 映射
- 对仍返回扁平 `SymbolInformation[]` 的服务器（规范允许），`normalizeDocumentSymbols` 用 `containerName` 推断父子层级，作为兜底而非主路径
- 无接口变更、无新依赖、无 breaking change

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `explorer-code-outline`：现有 spec 只要求「展示符号层级列表」，未定义层级的可验证场景与折叠交互。补充 MODIFIED requirement，明确树形缩进展示、单节点折叠、以及展开/折叠全部的行为。

## Impact

- `src/modules/lsp/lib/client.ts` — initialize capabilities
- `src/modules/lsp/lib/documentSymbol.ts` — 扁平结果的 containerName 兜底
- 行为影响：所有已启用 LSP 的语言，大纲首次呈现从平铺变为树形（默认全展开，与现有 `OutlineSection` 初始状态一致）
- 无 Rust 侧改动，无 IPC 协议改动
