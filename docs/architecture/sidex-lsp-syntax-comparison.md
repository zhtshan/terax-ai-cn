# SideX LSP / 语法引擎横向对比

> 外部参考文档。SideX 是 VSCode workbench 的 Tauri 移植（[SideX README](../../../../../../work/sidex/README.md)），与 Terax 定位不同。
> 本文不参与 `TERAX.md` 优先级排序；与该文件冲突时以 `TERAX.md` 为准。

## 目的

评估 `/Users/startiasoft/work/sidex` 项目中"语法服务器"相关能力（LSP + TextMate 语法高亮引擎）能否补全 Terax 当前实现。
本次评估基于实际读取的文件：

- SideX：`crates/sidex-lsp/src/{lib.rs, registry.rs}`、`src-tauri/src/commands/lsp.rs`、`crates/sidex-textmate/src/lib.rs`、`crates/sidex-textmate/Cargo.toml`
- Terax：`src-tauri/src/modules/lsp/mod.rs`、`src/modules/lsp/lib/{presets.ts, client.ts, sessionManager.ts}`、`TERAX.md`、`CLAUDE.md`

## 项目定位差异（前提）

| 维度 | SideX | Terax |
|---|---|---|
| 自我定位 | 无 Electron 的 VSCode，VSCode workbench 的 Tauri 移植 | AI 原生终端模拟器（`TERAX.md:5`） |
| 技术栈 | VSCode 原版 TS + Monaco + 21 Rust crates + Go sidecar | React 19 + CodeMirror 6 + xterm.js + Tauri 2 |
| AI 形态 | Go sidecar（`sidexai/sidex-server`，loopback 端口） | 嵌入式 Vercel AI SDK v6 + BYOK |
| 扩展系统 | 完整（Open VSX + WASM + 原生） | 无扩展系统 |
| 轻量化指标 | idle 目标 < 200 MB | ~7-8 MB bundle，零成本抽象 |

**结论**：两个项目根本不同定位。直接套用会破坏 Terax 轻量化与 AI 原生场景定位。

## LSP 实现位置（关键架构差异）

| 维度 | SideX | Terax |
|---|---|---|
| LSP 协议智能位置 | 全部在 Rust（`crates/sidex-lsp`，8071 行，21 模块） | 全部在前端（`src/modules/lsp/lib`，2214 行 TS） |
| Rust 侧职责 | 完整 LSP 客户端（21 类能力） | 仅 Content-Length 帧解析（`framing.rs`，243 行）+ 进程生命周期 |
| Tauri 命令数 | 6 个，含通用 `lsp_send_request(method, params)` | 5 个专用命令 |

SideX 的 5 个 Tauri 命令（`src-tauri/src/commands/lsp.rs`）：

- `lsp_get_server_registry`
- `lsp_get_supported_languages`
- `lsp_start_server`
- `lsp_send_request`（**通用 raw_request 通道**，任意 LSP 方法直接转发）
- `lsp_stop_server`
- `lsp_list_servers`

Terax 的命令（`src-tauri/src/modules/lsp/mod.rs`）：

- `lsp_host_pid`
- `lsp_detect`
- `lsp_spawn`
- `lsp_send`
- `lsp_kill`
- `lsp_resolve_root`

**关键差异**：SideX 的通用 `lsp_send_request` 让前端不需要每个 LSP 方法都加一个 Tauri 命令，新增能力的接口面稳定；Terax 走专用命令路线（更类型安全，但每次新增 LSP 能力都要改 Rust）。

## LSP 能力覆盖对比

SideX 在 `crates/sidex-lsp/src/lib.rs:7-46` 声明的能力完整列表：

| LSP 能力 | SideX 模块 | Terax 是否覆盖 |
|---|---|---|
| Document sync（增量、节流） | `document_sync.rs` | 是（`codemirror-languageserver`） |
| Completion（sort/filter/snippet） | `completion_engine.rs` | 是 |
| Hover（plain/markdown） | `hover_engine.rs` | 是 |
| Signature help | `signature_help.rs` | 是 |
| Definition / declaration / type-def / references + peek + back/forward | `go_to.rs` | 部分（Shift-F12 references） |
| Rename（prepare/execute/preview） | `rename_engine.rs`，490 行 | 是 |
| Code actions | `code_action_engine.rs` | 是 |
| **Inlay hints** | `inlay_hints.rs` | 否 |
| Progress（`$/progress`） | `progress.rs` | 否 |
| Format（document/range/on-type） | `format.rs` | 是 |
| **Call hierarchy** | `call_hierarchy.rs` | 否 |
| **Type hierarchy** | `type_hierarchy.rs` | 否 |
| **Document links** | `document_link.rs` | 否 |
| **Folding from server** | `folding.rs` | 否 |
| **Selection ranges**（智能选区扩展） | `selection_range.rs`，203 行 | 否 |
| **Document colors + color picker** | `document_color.rs` | 否 |
| **Workspace edit + undo** | `workspace_edit.rs`，641 行 | 否 |
| Diagnostics | `diagnostics.rs` | 是（publishDiagnostics 自实现，因 tsls 不会自动发） |

**Terax 当前 LSP 覆盖的是"日常编码必需"那一档**。
**SideX 多覆盖的是"导航增强 / 可视化增强 / 编辑增强"那一档**，其中 inlay hints、selection ranges、$/progress 与 AI 编程场景强相关。

## 资源治理（Terax 显著更深）

| 维度 | SideX | Terax |
|---|---|---|
| 默认服务器 | `registry.rs:64-85`：6 种（rust-analyzer、tsls、pylsp、gopls、clangd c/cpp） | `presets.ts`：typescript、rust-analyzer、pyright、ruff、gopls + 自定义 |
| 每服务器最大会话数 | 无明确限制 | 硬上限 4 个（`TERAX.md:96`） |
| 空闲超时 | 无 | 3 分钟空闲杀 |
| 崩溃退避 | 无 | 5 分钟内 3 次崩溃 → 放弃 + toast 带 stderr 尾部 |
| 启动 cwd 鉴权 | 无 | workspace registry Gate（与 PTY/git/AI 共享） |
| 进程组杀（Unix） | 通用 | 进程组杀，cargo check / proc-macro 子进程随服务器死 |
| Windows Job Object | 无声明 | 复用 `proc::job::ProcessJob`（与 pty 共享） |
| 内存调优 | 无 | rust-analyzer 关 cachePriming + 有界 lru（容量 32）；tsls `maxTsServerMemory: 3072` |
| WSL 支持 | 无声明 | 明确不支持（`mod.rs:75` 返回 `terax:lsp_wsl_unsupported`） |
| RSS 监控 | 无 | `rss.rs`，70 行 |
| 前端 LSP 库 | 自研 | `codemirror-languageserver`（`CLAUDE.md:96`）+ 自定义 `lib/client.ts` |
| 协议别名优化 | 无 | `vscode-languageserver-protocol` 在 vite.config 中别名为 4 枚举 shim，节省 ~117 kB |

Terax 的资源治理在"轻量 AI 终端"场景下显著更深。SideX 是通用 IDE 体验路径，不做这种深度约束。

## TextMate 语法引擎对比

| 维度 | SideX `sidex-textmate` | Terax |
|---|---|---|
| 实现位置 | Rust 原生（直接 FFI `onig = "6.5"`，避免系统 oniguruma 依赖） | 前端 WASM（vscode-textmate + vscode-oniguruma） |
| 完成度 | 早期：metadata / matcher / utils / regex 已完成；theme / rule / grammar / registry / diffStateStacks 待 port（`lib.rs:30-44`） | 稳定可用 |
| 系统依赖 | 静态链接 libonig（`onig-sys` bundled） | 浏览器自带 WASM 运行时 |
| 大文件性能优势 | 多线程，无 JS GC | 单线程 JS |
| 与主题集成 | theme.rs 待 port | 已有完整主题管线 |

SideX 的 Rust TextMate 移植**仍在早期**（4/13 模块完成），目前不能拿来"补全"Terax。
Terax 用前端 WASM 已稳定可用，不建议引入，除非将来要支持数百 KB 以上文件的语法高亮场景。

## 借鉴 / 不借鉴判断

| 能力 | 是否借鉴 | 路径 |
|---|---|---|
| **通用 raw_request 通道** | 已落地（形态调整） | Terax 的 `lsp_send(id, message)` 本就是通用 JSON-RPC 帧通道，无需照搬 SideX 的 Rust 侧 pending 匹配（会与 `codemirror-languageserver` 前端请求管线形成双管线）。落地为前端稳定扩展面：`TeraxLspClient.rawRequest(method, params)` + `sessionManager.lspRawRequest(path, langId, method, params)`，后续新增 LSP 能力零改动 Rust 与 client 类定义 |
| **Inlay hints（参数 / 类型提示）** | 加 | 纯前端能力，对 AI 编码场景特别有用 |
| **Selection ranges（智能选区扩展）** | 加 | CodeMirror 6 自带单词级 / 行级选区，但 LSP 服务端的"按语义节点扩展"是不同能力 |
| **Document color / Color picker** | 加 | CSS / 前端编辑场景 |
| **Workspace edit undo** | 加 | 与 AI 工具的"应用 edit"流程强相关 |
| **$/progress 状态栏进度** | 加 | 通用 progress listener 不复杂 |
| 把 LSP 客户端逻辑迁到 Rust | 不建议 | 与 Terax"薄 Rust / 厚前端 + 复用 CM 生态"策略相反；现有架构在前端已自洽 |
| SideX 的 Rust TextMate | 不建议 | 还在早期；小文件场景性能优势不显著 |
| Call / Type hierarchy / Peek references | 可选 | 与 AI 编程场景弱相关 |
| Folding from server | 可选 | 当前 CodeMirror 自带语法感知 folding |

## 建议优先级

1. **短期**（架构性改进，已落地）：建立 LSP 能力的稳定扩展面。核实后 `lsp_send` 已是通用帧通道，实际落地在前端：`TeraxLspClient.rawRequest(method, params)` + `lspRawRequest(path, langId, method, params)`，不照搬 SideX 的 Rust 侧请求-响应匹配。
2. **中期**（功能补全）：加 inlay hints、selection ranges、$/progress 三类与 AI 场景强相关的能力。
3. **不动**：LSP 客户端逻辑迁到 Rust、改用 Monaco、引入 SideX 的 Rust TextMate。

## 关联文件

- SideX LSP 后端：`/Users/startiasoft/work/sidex/crates/sidex-lsp/src/lib.rs`
- SideX LSP 注册表：`/Users/startiasoft/work/sidex/crates/sidex-lsp/src/registry.rs`
- SideX LSP Tauri 命令：`/Users/startiasoft/work/sidex/src-tauri/src/commands/lsp.rs`
- SideX TextMate：`/Users/startiasoft/work/sidex/crates/sidex-textmate/src/lib.rs`
- Terax LSP Rust 入口：`/Users/startiasoft/work/terax-ai-cn/src-tauri/src/modules/lsp/mod.rs`
- Terax LSP 前端：`/Users/startiasoft/work/terax-ai-cn/src/modules/lsp/lib/{client.ts, presets.ts, sessionManager.ts}`
- Terax 架构真源：`/Users/startiasoft/work/terax-ai-cn/TERAX.md`