---
comet_change: vscode-style-content-search
role: technical-design
canonical_spec: openspec
---

# Design Doc: VS Code 风格内容搜索

> 与 `openspec/changes/vscode-style-content-search/proposal.md` 配套。
> brainstorming 过程见 `openspec/changes/vscode-style-content-search/.comet/handoff/brainstorm-summary.md`。
> OpenSpec delta spec（`proposal.md`）是 canonical；本文件描述技术实现细节。

## 1. 目标与边界

对齐 VS Code `Cmd/Ctrl+Shift+F` 的常驻侧边栏搜索 + Replace All 体验。**搜索**走 `fs_search_content`（复用现有 `fs_grep` 内核），**替换**走 `fs_replace_all`（后端搜索 + 原子写，前端 deny-list 守门）。

非目标：单条 Accept/Reject、跨工作区、ripgrep 外部依赖、修改现有 IPC 签名。

## 2. 架构与数据流

```
┌────────────────────────────────────────────────────────────────────┐
│  Left Sidebar: Search Panel (third top-level view)                │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ [Search ▾] [Replace ▾]  [Aa][ab][.*]  include:[__] exclude:[__] │ │
│  │ files: N matches: M  [truncated]                              │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ ▾ src/app/App.tsx (3)                                         │ │
│  │   12 │ const fn = () => ...test...                            │ │
│  │   47 │ // test this case                                     │ │
│  │ ▸ src/modules/explorer/ExplorerSearch.tsx (1)                │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ "12 files, 87 matches will be modified"        [Replace All]  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
        │ invoke('fs_search_content', { ... })              ▲
        │ invoke('fs_replace_all',    { ... })              │
        ▼                                                  │
┌────────────────────────────────────────────────────────────────────┐
│  Rust IPC (src-tauri/src/modules/fs/grep.rs)                       │
│   build_matcher(pattern, regex, case_sensitive, whole_word)        │
│     regex=false + ww=false → escape + smart-case                   │
│     regex=false + ww=true  → \b{escape}\b + smart-case             │
│     regex=true             → user-supplied + explicit case          │
│                                                                    │
│   fs_search_content → search_tree(...) → GrepResponse              │
│   fs_replace_all → for each hit file: read + replace + write_atomic │
│                  → ReplaceResponse { files_changed, ... }           │
│                                                                    │
│   Reuses: ContentSearchState (generation-based cancellation)       │
│           FILE_SIZE_CAP (5MB)                                      │
│           write_atomic (O_EXCL + persist)                          │
│           WorkspaceRegistry (path canonicalization)                │
└────────────────────────────────────────────────────────────────────┘
        ▲
        │ rejects secret paths
┌────────────────────────────────────────────────────────────────────┐
│  Frontend safety layer (src/modules/ai/lib/security.ts)            │
│   checkWritableCanonical(path, canonicalize) before IPC call       │
│   — same deny-list used by AI tools                               │
└────────────────────────────────────────────────────────────────────┘
```

## 3. IPC 契约

### 3.1 `fs_search_content`

| 字段 | 类型 | 说明 |
|---|---|---|
| `pattern` | string | 搜索词；`regex=true` 时按正则解析，否则按字面量（自动 escape） |
| `root` | string | 搜索根路径 |
| `regex` | bool | 是否按正则（默认 false） |
| `case_sensitive` | bool | 大小写敏感（默认 false = smart-case） |
| `whole_word` | bool | 全字匹配（默认 false） |
| `include` | string? | 单个 glob（rel 路径匹配） |
| `exclude` | string? | 单个 glob（rel 路径匹配） |
| `max_results` | usize? | 默认 20000（提升自 2000） |

返回：`GrepResponse { hits: Vec<GrepHit>, truncated: bool, files_scanned: usize }`（复用现有结构）。

### 3.2 `fs_replace_all`

| 字段 | 类型 | 说明 |
|---|---|---|
| `pattern` / `replacement` | string | 同上语义 |
| `regex` / `case_sensitive` / `whole_word` | bool | 同上 |
| `root` / `include` / `exclude` | string? | 同上 |

返回：

```rust
struct ReplaceResponse {
    files_changed: Vec<ReplaceFileResult>,   // 成功写入的文件
    errors: Vec<ReplaceError>,                // 失败的文件 + reason
    total_replacements: usize,                // 跨所有成功文件的替换次数
    truncated: bool,                          // 命中已达 max_results
}
struct ReplaceFileResult { path: String, replacements: usize }
struct ReplaceError { path: String, reason: String }
```

## 4. 后端实现（src-tauri/src/modules/fs/grep.rs）

### 4.1 公共 helper：`build_matcher`

```rust
fn build_matcher(
    pattern: &str,
    regex: bool,
    case_sensitive: bool,
    whole_word: bool,
) -> Result<RegexMatcher, String> {
    let mut builder = RegexMatcherBuilder::new().line_terminator(Some(b'\n'));
    if regex {
        builder.case_smart(false).case_insensitive(!case_sensitive);
        // 用户原样；whole_word 提示但由用户负责加 \b
        builder.build(pattern)
    } else {
        builder.case_smart(!case_sensitive);
        let escaped = escape_literal(pattern);
        let final_pattern = if whole_word { format!("\\b{escaped}\\b") } else { escaped };
        builder.build(&final_pattern)
    }.map_err(|e| format!("bad pattern: {e}"))
}
```

### 4.2 `fs_search_content`

- 参数转发到现有 `search_tree`，新增 `exclude` 通过 `WalkBuilder::filter_entry` 实现
- 复用 `ContentSearchState` generation 自取消（每个调用 `fetch_add(1)`）
- `HARD_MAX_RESULTS = 20000`（修改现有 const）

### 4.3 `fs_replace_all`

1. 调 `build_matcher` 构造 matcher
2. 构造 `include` / `exclude` 的 GlobSet
3. 调 `search_tree`，但 sink 改为"每行只保留第一个命中"（修改现有 sink）
4. 按文件分组，对每个文件：
   - `std::fs::read_to_string`（失败 → 记 error，继续）
   - 行级替换：构造 `(before, after, count)` 三元组，倒序应用避免偏移错乱
   - `fs_write_file::write_atomic` 写入（自动原子写 + workspace 鉴权）
   - 失败 → 记 error，继续下一个文件（不中断其他文件）
5. 返回 `ReplaceResponse`

### 4.4 单元测试

```
test build_matcher_escapes_literal_whole_word_off
test build_matcher_wraps_whole_word_when_literal
test build_matcher_passes_regex_through_unchanged
test build_matcher_case_sensitive_overrides_smart_case_for_regex
test fs_replace_all_partial_failure_continues_remaining_files
test fs_replace_all_skips_binary_files
test fs_replace_all_respects_exclude_glob
test fs_replace_all_zero_match_returns_empty_files_changed
test HARD_MAX_RESULTS_constant_is_20000
```

## 5. 前端模块（src/modules/search/）

```
src/modules/search/
├── index.ts                       # 公开导出
├── SearchPanel.tsx                # 主面板（输入 + 结果 + 替换条）
├── SearchInput.tsx                # 输入区
├── SearchResults.tsx              # 结果区
├── ReplaceAffectedBar.tsx         # Replace All
├── hooks/
│   ├── useSearchRun.ts            # 防抖 + 自取消
│   └── useReplaceRun.ts           # 替换状态机
└── lib/
    ├── api.ts                     # invoke 包装
    ├── types.ts                   # 与后端对齐的类型
    ├── mode.ts                    # 选项 → IPC payload
    └── highlight.ts               # 行内命中切分（纯函数）
```

### 5.1 useSearchRun

- 防抖 140ms（沿用 `CONTENT_SEARCH_MIN_QUERY` + `DEBOUNCE_MS`，`useContentSearch.ts:6-8`）
- generation 自取消：每次新查询 generation+1，stale 响应丢弃
- 暴露 `{ results, loading, error, retry }`（对齐 `useContentSearch` 形态）

### 5.2 useReplaceRun（状态机）

```ts
type ReplaceState =
  | { kind: "idle" }
  | { kind: "previewing"; files: number; matches: number }
  | { kind: "running" }
  | { kind: "done"; filesChanged: ReplaceFileResult[] }
  | { kind: "partial"; filesChanged: ReplaceFileResult[]; errors: ReplaceError[] }
  | { kind: "error"; message: string };
```

### 5.3 SearchInput

- 两个文本输入：Search / Replace（Replace 在内容为空时 disabled）
- 三个开关按钮：Regex / Case Sensitive / Whole Word（icon + tooltip）
- 两个小输入：include / exclude glob
- 顶部状态条：`files: N  matches: M  [truncated]`

### 5.4 SearchResults

- 按文件分组（path → matches[]）
- 每文件一个 `<details>` 行：filename + 命中数（默认折叠空行文件，展开有命中的）
- 命中行：`{line} │ {text with highlighted match}`
- 高亮：纯函数按 query 切分（regex 模式走同样的 matcher；非 regex 走字面量切分）

### 5.5 ReplaceAffectedBar

- 底部 fixed 行（仅当 Replace 输入非空 + 至少一个搜索结果时显示）
- 显示 `"N files, M matches will be modified"` + `Replace All` 按钮
- 状态机非 idle 时按钮 disabled + 显示进度

## 6. sidebar 集成（src/modules/sidebar/）

### 6.1 types.ts

```diff
- export type SidebarViewId = "explorer" | "source-control";
+ export type SidebarViewId = "explorer" | "search" | "source-control";
```

### 6.2 useSidebarPanel.ts

- `readSidebarView()` 增加 `"search"` 分支
- `persistSidebarView` 不变

### 6.3 SidebarRail.tsx

```diff
  const items: RailItem[] = [
    { id: "explorer", label: t("sidebar.files"), icon: FolderTreeIcon },
+   { id: "search", label: t("sidebar.search"), icon: Search01Icon },
    {
      id: "source-control",
      label: t("sidebar.sourceControl"),
      icon: FolderGitTwoIcon,
      badge: changedCount,
    },
  ];
```

### 6.4 sidebar 容器（消费 `SidebarViewId` 的地方）

扫一遍所有引用 `<SidebarViewId>` / `sidebarView` 的位置，加 `"search"` 分支渲染 `<SearchPanel />`。

## 7. 快捷键（src/modules/shortcuts/shortcuts.ts）

```diff
- {
-   id: "explorer.search",
-   label: "Search files",
-   group: "Search",
-   defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "f" }],
- },
+ {
+   id: "explorer.findFiles",
+   label: "Find files",
+   group: "Search",
+   defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "k" }],
+ },
+ {
+   id: "search.focusPanel",
+   label: "Open search panel",
+   group: "Search",
+   defaultBindings: [{ [MOD_PROP]: true, shift: true, key: "f" }],
+ },
```

全局快捷键处理（`useGlobalShortcuts` / 现有注册位置）增加 `search.focusPanel` 处理：若 sidebar 折叠则展开并切到 `"search"`，然后 `focus()` 搜索输入框。

**用户自定义绑定迁移**：不迁移。`explorer.search` 改名为 `explorer.findFiles` 后，用户之前在 settings 改的绑定会失效；新 id `explorer.findFiles` 没绑定，记录到 changelog 提示用户重设。

## 8. 安全模型

- **前端**（`useReplaceRun`）：在调 IPC 前，对每个目标文件路径调 `checkWritableCanonical`（`src/modules/ai/lib/security.ts:291`）。任一失败 → 整个取消 + error
- **后端**：`fs_replace_all` 不重复检查 deny-list（架构一致性）；仍走 `WorkspaceRegistry` 鉴权（自动由 `fs_write_file` 提供）

## 9. i18n

`src/i18n/locales/{en,zh}.json` 新增：

```
searchPanel:
  search: Search
  replace: Replace
  regex: Regular expression
  caseSensitive: Case sensitive
  wholeWord: Whole word
  include: files to include
  exclude: files to exclude
  replaceAll: Replace All
  replaceAffected: "{{files}} files, {{matches}} matches will be modified"
  truncated: Results truncated
  noResults: No results
  noWorkspace: Open a workspace to use search

sidebar:
  files: Files
  search: Search            # 新增
  sourceControl: Source Control

shortcuts:
  search.focusPanel: Open search panel    # 新增
  explorer.findFiles: Find files          # 改名自 explorer.search
```

## 10. 性能预算

| 操作 | 预算 |
|---|---|
| `fs_search_content`（10000 文件平均） | < 200ms |
| `fs_replace_all`（改 100 文件，5MB 内） | ~500ms（串行原子写） |
| 单次结果 20000 命中内存峰值 | ~4 MB（path/rel/text 三 String） |

## 11. 验收场景（回写 proposal.md）

1. `Cmd/Ctrl+Shift+F` 打开侧边栏 Search 面板，焦点在搜索输入框
2. Search 面板为顶级 sidebar view（与 Explorer / Source Control 并列）
3. 输入 `TODO` → 结果按文件分组展示，每文件可折叠，行内命中片段高亮
4. 勾选 Regex，输入 `[A-Z]+` → 正确按正则搜索（用户输入原样下发）
5. 勾选 Case Sensitive + 输入 `error` → 不再匹配 `ERROR`
6. 勾选 Whole Word + 输入 `test` → 不再匹配 `testing`
7. include 输入 `*.ts` → 只搜 .ts 文件
8. exclude 输入 `node_modules/**` → 跳过 node_modules
9. 触发 20000+ 命中 → 结果被截断，UI 显示"已截断，结果不完整"
10. 输入 Replace 内容 + 点 Replace All → 显示"将修改 N 个文件 / M 个匹配"的文件清单，点击确认后一次性写回
11. 写入受 workspace 鉴权保护；尝试写 secret-path 应被前端 deny-list 拒
12. Command Palette 的 `#` 模式仍能快速搜（无开关 UI），搜索期间输入连续字符不卡顿
13. 切换 Search/Explorer tab 不丢失当前搜索状态
14. `Cmd/Ctrl+Shift+F` 在任意焦点下都打开 Search 面板并聚焦输入框；不再打开 Explorer 文件名搜索
15. `Cmd/Ctrl+Shift+K` 打开 Explorer 文件名搜索（旧的 explorer.search 行为迁移）

## 12. 风险与未决

| 风险 | 缓解 |
|---|---|
| `HARD_MAX_RESULTS` 提升到 20000 影响其它调用者（`fs_grep` / `fs_glob`） | 这些调用方自己传 `max_results`，不受 const 改动影响 |
| 用户自定义的 `explorer.search` 绑定失效 | 不迁移；changelog 提示 |
| 替换时一行多个匹配只换第一个，用户预期"全换" | UI 提示"每行替换第一个匹配"；若用户期望全部替换，引导到编辑器 + 多光标 |
| 大工作区 `fs_search_content` 阻塞 | 现状同步阻塞，20000 上限内可接受；不引入流式 |
| 前后端安全职责不一致（前端守门） | 与项目现有架构一致；changelog 说明 |