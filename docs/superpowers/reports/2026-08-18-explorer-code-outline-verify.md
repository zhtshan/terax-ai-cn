# 验证报告：explorer-code-outline

**日期**: 2026-08-18
**阶段**: verify
**验证模式**: full（补跑，回填）

## 说明

本 change 的源码已在会话中直接写入并提交（commit `afbe800`），未先经过正式的
`/comet-design` 产出 Design Doc。归档前按用户要求补跑一次完整验证套件，作为
事后（retroactive）验证依据；`.comet.yaml` 的 `phase`/`verify_result` 字段随
本报告一并回填，跳过了 design/build 阶段的常规证据链。

## 验证结果

| 检查项 | 结果 | 说明 |
|--------|------|------|
| pnpm lint | ✅ | exit 0（172 处既有警告，均为改动前已存在） |
| pnpm check-types | ✅ | tsc --noEmit 无错误 |
| pnpm test | ⚠️ | 576/577 通过；1 个失败与本次改动无关（见下） |
| cargo clippy --all-targets --locked -D warnings | ✅ | 无警告 |
| cargo test --locked | ✅ | 全部通过（`cargo nextest` 在本环境未安装，按 CLAUDE.md 用 `cargo test` 作为本地备选） |

### 未通过测试的排除说明

`src/modules/explorer/TimelineSection.test.tsx > shows empty state when
gitLogFile returns []` 失败。已核实：
- 该测试文件/组件最后一次改动是 commit `de1b321`，早于本次 change，本次
  commit `afbe800` 未触碰 Timeline 相关文件。
- 在本次改动之前的 `0b53b34`（父提交）单独运行该测试，同样失败，报错内容
  一致（`waitFor` 超时，找不到"暂无提交历史"文本）。

确认为改动前既有、与 explorer-code-outline 无关的失败，不阻塞本次归档。

## 文件变更清单

来自 commit `afbe800`（另含 explorer-markdown-outline 的归档移动）：

| 文件 | 操作 | 说明 |
|------|------|------|
| src/modules/editor/EditorPane.tsx | 修改 | 代码大纲请求接入 LSP documentSymbol；修复大纲请求早于 LSP session 就绪的竞态 |
| src/modules/editor/EditorStack.tsx | 修改 | 传递大纲不可用原因 |
| src/modules/editor/lib/outline.ts | 修改 | 大纲类型扩展为通用（Markdown + 代码） |
| src/modules/editor/index.ts | 修改 | 导出调整 |
| src/modules/explorer/OutlineSection.tsx | 修改 | 按符号 kind 显示图标；修复 key 用 item.line 导致的重复 key |
| src/modules/explorer/lib/symbolKindIcons.ts | 新建 | LSP SymbolKind → 图标映射 |
| src/modules/explorer/FileExplorer.tsx | 修改 | 大纲区块接入 |
| src/modules/lsp/lib/documentSymbol.ts | 新建 | documentSymbol 归一化 |
| src/modules/lsp/lib/sessionManager.ts | 修改 | 新增 requestDocumentSymbols（只读，复用已有 session） |
| src/modules/lsp/lib/client.ts | 修改 | documentSymbol 相关类型/调用 |
| src/modules/lsp/index.ts | 修改 | 导出调整 |
| src/app/App.tsx / WorkspaceSurface.tsx | 修改 | 大纲不可用原因状态接入 |
| src/i18n/locales/{zh,en}.json | 修改 | 大纲相关文案 |

## 结论

补跑验证通过（1 处失败已核实为既有、无关问题）。已合并到 main 分支
（未经过独立分支/PR，直接提交）。同意归档。
