## 1. LSP 客户端声明层级能力

- [x] 1.1 `src/modules/lsp/lib/client.ts` 的 `TeraxLspClient.getInitializeParams()` 补充 `textDocument.documentSymbol`：`hierarchicalDocumentSymbolSupport: true` + `symbolKind.valueSet`（1..26）
- [x] 1.2 用 typescript-language-server 实测确认握手后 documentSymbol 返回 `DocumentSymbol[]`（带 children）而非 `SymbolInformation[]`

## 2. 扁平结果的层级兜底

- [x] 2.1 `src/modules/lsp/lib/documentSymbol.ts` 的 SymbolInformation 分支用 `containerName` 推断 level，匹配不到父符号时保持 level 1
- [x] 2.2 补 `documentSymbol.test.ts`：层级 DocumentSymbol 分支产出递增 level；扁平 + containerName 分支还原父子；扁平无 containerName 全为 level 1

## 3. 无可折叠节点时不显示全局折叠按钮

- [x] 3.1 `src/modules/explorer/OutlineSection.tsx` 的头部 action 显示条件改为「存在含子符号的节点」，避免呈现点击无效的按钮
- [x] 3.2 `OutlineSection.test.tsx` 补一条：全平铺大纲不渲染展开/折叠全部按钮

## 4. 验收

- [x] 4.1 走查 `specs/explorer-code-outline/spec.md` 的全部场景
- [x] 4.2 用真实 typescript-language-server 响应跑通 normalize 链路（修复后 25 条 / 4 层，修复前 17 条全平铺）
- [x] 4.3 跑 `pnpm lint && pnpm check-types && pnpm test`
