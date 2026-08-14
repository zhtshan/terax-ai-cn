# Comet Design Handoff

- Change: vscode-style-content-search
- Phase: design
- Mode: compact
- Context hash: b55d56779af525149ed0e73b74e646a6f49210bb283157deeb83a043370c706f

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/vscode-style-content-search/proposal.md

- Source: openspec/changes/vscode-style-content-search/proposal.md
- Lines: 1-76
- SHA256: c16036a99f08ee3c6d12ad03a1ccdd718327145816a795bfbef3d25dcf36b042

```md
# Proposal: VS Code 风格内容搜索

## 背景

Terax 当前的文件内容检索能力薄弱：

- Command Palette 弹窗内的 `#` 模式是唯一入口（`CommandPalette.tsx:297-333`），调用后端 `fs_grep_interactive`（`src-tauri/src/modules/fs/grep.rs:215`）。
- 搜索是字面量匹配（`escape_literal`，`grep.rs:239`），无正则开关。
- 结果上限 80 条，按命中顺序扁平展示，无文件分组、无高亮。
- 无 include/exclude 过滤、无大小写敏感切换、无全字匹配。
- 无替换（find/replace）能力。

VS Code 的 `Search` 视图把这些能力做成"常驻侧边栏 + 一次执行 Replace All"的体验，是终端/编辑器用户搜索文件的默认预期。

## 目标

1. 新增左侧 Explorer 列内的 Search 视图，与 File Explorer 同区 tab 切换。
2. 输入 + 替换双行布局，配 Regex / Case Sensitive / Whole Word 三件套开关与 include / exclude 过滤框。
3. 结果按文件分组、每文件可折叠、行内高亮命中片段。
4. Replace All 一键写入：写前显示"将修改 N 个文件 / M 个匹配"的文件清单，无二次确认弹窗。
5. 单次搜索总命中行数上限提升到 20000 条（对齐 VS Code 默认）。
6. Command Palette 弹窗的 `#` 模式保留作为快速入口，但去掉三件套开关（都迁到面板）。

## 非目标

- 不做单条逐个 Accept/Reject 的交互式替换。
- 不做跨工作区全局搜索。
- 不引入 ripgrep 外部依赖；继续使用现有 `grep-*` crates（`src-tauri/Cargo.toml`）。
- 不修改 `fs_grep` / `fs_grep_interactive` 现有签名；新增 IPC 命令，保持向后兼容。
- 不做内容索引（每次输入都重新走一遍文件树）。

## 范围边界

| 模块 | 改动 |
|---|---|
| `src/modules/search/`（新） | SearchPanel / SearchInput / SearchResults / ReplaceAffectedBar / hooks (useSearchRun, useReplaceRun) / lib (api, types, mode, highlight) |
| `src-tauri/src/modules/fs/grep.rs` | 提升 `HARD_MAX_RESULTS` 至 20000；抽出 `build_matcher` helper；新增 `fs_search_content` 与 `fs_replace_all`；复用 `ContentSearchState` 自取消 |
| `src-tauri/src/lib.rs` | 注册新 IPC 命令 |
| `src/modules/sidebar/` | 新增顶级 view `"search"`（与 explorer / source-control 并列）；SidebarRail 加 icon |
| `src/modules/command-palette/` | 弹窗 `#` 模式保留（不引入开关 UI），复用现有 `useContentSearch` |
| `src/modules/shortcuts/` | `explorer.search` → `explorer.findFiles`（快捷键改 `Cmd/Ctrl+Shift+K`）；新增 `search.focusPanel`（`Cmd/Ctrl+Shift+F`） |
| `src/i18n/locales/{en,zh}.json` | 新增 key：`searchPanel.*`、`sidebar.search`、`shortcuts.search.focusPanel`、`shortcuts.explorer.findFiles` |
| `src-tauri/src/modules/fs/grep.rs`（测试） | 单元测试：`build_matcher` 四条路径、`fs_replace_all` 部分失败 / 二进制跳过 / exclude / 零匹配 / `HARD_MAX_RESULTS` 常量 |

## 关键未知项 / 风险

- **`fs_write_file` 原子写现状待核**：替换路径若已有原子写（写临时文件 + rename），复用即可；若没有，本次必须补上。
- **HARD_MAX_RESULTS 2000 → 20000 的内存影响**：每个 `GrepHit` 含 path/rel/text 三个 String。极坏情况下 20000 条 × ~200B = 4 MB 单次结果峰值。在 grep.rs 中评估可接受后落地。
- **whole_word 实现位置**：regex 模式下用 `\b{pattern}\b` 包裹（后端处理）；非 regex 模式下用 word-boundary 正则（同样后端处理）。前端只传布尔值。
- **替换路径的 secret-path 拒绝**：必须复用现有 `fs::*` 的 deny-list 与 workspace 鉴权，让前端只看到"成功 / 拒绝"二元结果，不能拿到详细 deny-list 内部信息。
- **侧边栏面板的 tab 共存**：当前左侧列已有 File Explorer 与可能的 Git History。需要确认 tab 顺序与图标。
- **re-render 性能**：每输入字符都触发搜索，必须复用 `ContentSearchState` 的 generation 自取消机制（`grep.rs:225`），避免过期搜索污染结果。

## 验收场景

1. `Cmd+Shift+F` 打开侧边栏 Search 面板，焦点落在搜索输入框。
2. 输入 `TODO` → 结果按文件分组展示，每文件可折叠，行内命中片段高亮。
3. 勾选 Regex，输入 `[A-Z]+` → 正确按正则搜索（用户输入原样下发到后端，不做前端 escape）。
4. 勾选 Case Sensitive + 输入 `error` → 不再匹配 `ERROR`。
5. 勾选 Whole Word + 输入 `test` → 不再匹配 `testing`。
6. include 输入 `*.ts` → 只搜 `.ts` 文件。
7. exclude 输入 `node_modules/**` → 跳过 node_modules。
8. 触发 20000+ 命中 → 结果被截断，UI 显示"已截断，结果不完整"。
9. 输入 Replace 内容 + 点 Replace All → 显示"将修改 N 个文件 / M 个匹配"的文件清单，点击确认后一次性写回。
10. 写入受 workspace 鉴权保护；尝试修改 secret-path（如 `~/.ssh/id_rsa`）应被拒。
11. Command Palette 的 `#` 模式仍能快速搜（无开关 UI），搜索期间输入连续字符不卡顿（generation 自取消生效）。
12. 切换 Search/Explorer tab 不丢失当前搜索状态。
13. Search 面板为顶级 sidebar view（与 Explorer / Source Control 并列），不是 Explorer 内的二级 tab。
14. `Cmd/Ctrl+Shift+F` 在任意焦点下打开 Search 面板并聚焦输入框；不再打开 Explorer 文件名搜索。
15. `Cmd/Ctrl+Shift+K` 打开 Explorer 文件名搜索（旧 `explorer.search` 行为迁移）。

> Spec Patch（2026-07-29，design 阶段回写）：原"Explorer 列内 tab 切换"→"顶级 sidebar view"；新增快捷键迁移验收项。原 12 条 + 新增 3 条 = 15 条。详见 `docs/superpowers/specs/2026-07-29-vscode-style-content-search-design.md` §11。

## 依赖

- 无新增 npm crate；无新增 Rust 依赖。
- 复用现有 `grep_regex::RegexMatcher` / `grep_searcher` / `globset` / `ignore::WalkBuilder`。```

## openspec/changes/vscode-style-content-search/design.md

- Source: openspec/changes/vscode-style-content-search/design.md
- Lines: 1-133
- SHA256: 3737849f1599a0c736d81f6f1a6c3738632f5b12ede2d55af748cf109f9372fc

[TRUNCATED]

```md
# Design: VS Code 风格内容搜索

> 高层架构决策。本文件不替代 Superpowers Design Doc（design 阶段会产出 `docs/superpowers/specs/YYYY-MM-DD-vscode-style-content-search-design.md`，归档时同步）。

## 1. 总体数据流

```
┌────────────────────────────────────────────────────────────────────┐
│  Left Sidebar: Search Panel                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ [Search input ▾]  [Replace input ▾]  [Aa] [ab] [.*] [...]    │ │
│  │ include: [______]  exclude: [______]    files: N  matches: M  │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ ▾ src/app/App.tsx (3)                                         │ │
│  │   12 │ const fn = () => ...test...                            │ │
│  │   47 │ // test this case                                     │ │
│  │ ▸ src/modules/explorer/ExplorerSearch.tsx (1)                │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ [Preview affected files: N files, M matches]   [Replace All] │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
        │ invoke('fs_search_content', { ... })             ▲
        │ invoke('fs_replace_all',   { ... })             │ UI events
        ▼                                                  │
┌────────────────────────────────────────────────────────────────────┐
│  Rust IPC (src-tauri/src/modules/fs/grep.rs)                       │
│   fs_search_content(pattern, root, regex, ci, whole_word,          │
│                      include, exclude, max_results)                │
│     → 复用 search_tree + ContentSearchState 自取消                 │
│   fs_replace_all(pattern, replacement, root, regex, ci,            │
│                   whole_word, include, exclude)                    │
│     → 内部搜索 + 原子写（临时文件 + rename）                       │
│     → 复用 secret-path deny-list + workspace 鉴权                  │
└────────────────────────────────────────────────────────────────────┘
```

## 2. IPC 命令设计

### 2.1 `fs_search_content`

| 字段 | 类型 | 说明 |
|---|---|---|
| `pattern` | string | 搜索词；regex=true 时按正则解析，否则按字面量（自动 escape） |
| `root` | string | 搜索根路径 |
| `regex` | bool | 是否按正则（默认 false） |
| `case_sensitive` | bool | 大小写敏感（默认 smart-case；false 时仍受 smart-case 启发式） |
| `whole_word` | bool | 全字匹配 |
| `include` | string? | 单个 glob（不含逗号分隔，避免 UI 复杂度） |
| `exclude` | string? | 单个 glob |
| `max_results` | usize? | 默认 20000（提升自 2000） |

实现要点：

- 复用 `search_tree`（`grep.rs:68`），但加 `whole_word` 处理：
  - regex=false + whole_word → 用 `\b{escape_literal(p)}\b` 构造 matcher
  - regex=true + whole_word → 用户自行写 `\b...\b`，后端不处理（前端 hint 提示）
- `include` 走现有 `GlobSet` 路径（`grep.rs:43`），`exclude` 走现有 `WalkBuilder::ignore` 的自定义 skip（需新增 `filter_entry` 判断）

### 2.2 `fs_replace_all`

| 字段 | 类型 | 说明 |
|---|---|---|
| `pattern` / `replacement` | string | 同上语义 |
| `regex` / `case_sensitive` / `whole_word` | bool | 同上 |
| `root` / `include` / `exclude` | string? | 同上 |

返回：

```rust
struct ReplaceResponse {
  files_changed: Vec<ReplaceFileResult>,
  total_replacements: usize,
  truncated: bool, // 命中已达 max_results 时为 true
}
struct ReplaceFileResult {
  path: String,    // 绝对路径
  replacements: usize, // 该文件的替换次数
}
```

```

Full source: openspec/changes/vscode-style-content-search/design.md

## openspec/changes/vscode-style-content-search/tasks.md

- Source: openspec/changes/vscode-style-content-search/tasks.md
- Lines: 1-47
- SHA256: 75aa988e571339b5d18af88a212e9e5192039ee23b91b7405f4f2b96d6fdd2dc

```md
# Tasks: VS Code 风格内容搜索

> 任务顺序：先建后端契约，再建前端骨架，最后两端贯通。
> 每完成一项必须勾选并 git commit（不积攒）。

## 后端

- [ ] 核实 `fs_write_file` 是否已有原子写路径；若没有补上（写临时文件 + rename）
- [ ] `HARD_MAX_RESULTS` 从 2000 提升到 20000，跑现有测试确认无回归
- [ ] 在 `grep.rs` 抽出公共 search helper（参数化 matcher + include glob + exclude glob + cancel）
- [ ] 实现 `fs_search_content` 命令（regex / ci / whole_word / include / exclude / max_results）
- [ ] 实现 `fs_replace_all` 命令（内部搜索 + 原子写 + secret-path 拒绝 + workspace 鉴权）
- [ ] 在 `src-tauri/src/lib.rs` 注册两个新命令
- [ ] 单元测试：`whole_word` 的 regex / 字面量两条路径
- [ ] 单元测试：`fs_replace_all` 的 secret-path 拒绝路径
- [ ] 单元测试：`fs_replace_all` 的部分失败返回结构
- [ ] `cargo clippy --all-targets --locked -- -D warnings`
- [ ] `cargo nextest run --locked`

## 前端 — IPC 客户端

- [ ] 新增 `src/modules/search/lib/api.ts`：封装 `fs_search_content` / `fs_replace_all` 的 invoke 包装（含 WorkspaceEnv 注入）
- [ ] 新增 `src/modules/search/lib/types.ts`：与后端结构对齐的 TS 类型

## 前端 — UI 模块

- [ ] 新增 `src/modules/search/index.ts` 公开导出
- [ ] 新增 `src/modules/search/hooks/useSearchRun.ts`：防抖 + 自取消（沿用 `ContentSearchState` 思路）
- [ ] 新增 `src/modules/search/hooks/useReplaceRun.ts`：替换状态机（idle / previewing / running / done / error）
- [ ] 新增 `src/modules/search/SearchInput.tsx`：搜索 + 替换 + 三件套开关 + include/exclude
- [ ] 新增 `src/modules/search/SearchResults.tsx`：按文件分组、可折叠、行内高亮
- [ ] 新增 `src/modules/search/ReplaceAffectedBar.tsx`：预览文件清单 + Replace All
- [ ] 新增 `src/modules/search/SearchPanel.tsx`：组合上述组件的主面板

## 前端 — 集成

- [ ] 修改左侧 Explorer 列容器（参考 git-history 的 tab 切换）：在 Explorer / Search 之间切换
- [ ] 切换 tab 不丢失当前搜索状态（保留输入与结果在内存）
- [ ] 新增 `Cmd+Shift+F` / `Ctrl+Shift+F` 快捷键：打开 Search 面板并聚焦输入框（`src/modules/shortcuts/shortcuts.ts`）
- [ ] 简化 Command Palette `#` 模式：移除 UI 上的开关（保留 `useContentSearch` 调用）
- [ ] 新增 i18n key 到 `src/i18n/locales/en.json` + `zh.json`（`search.*`）

## 端到端验证

- [ ] `pnpm lint`
- [ ] `pnpm check-types`
- [ ] `pnpm test`
- [ ] 手动跑通验收场景 1-12（见 proposal.md）```

