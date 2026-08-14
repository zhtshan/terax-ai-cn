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
- 复用现有 `grep_regex::RegexMatcher` / `grep_searcher` / `globset` / `ignore::WalkBuilder`。