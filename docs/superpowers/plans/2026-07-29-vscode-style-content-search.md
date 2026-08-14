---
change: vscode-style-content-search
design-doc: docs/superpowers/specs/2026-07-29-vscode-style-content-search-design.md
base-ref: 7b431b02c018c558ba47ce0db536cb52fd5b7224
archived-with: 2026-08-14-vscode-style-content-search
---

# Implementation Plan: VS Code 风格内容搜索

> 与 Design Doc `docs/superpowers/specs/2026-07-29-vscode-style-content-search-design.md` 配套。
> OpenSpec 任务清单见 `openspec/changes/vscode-style-content-search/tasks.md`。
> 本计划不重新设计，只把设计拆成可独立验证、可串行/并行执行的步骤。

## 1. 目标摘要

实现 VS Code 风格的常驻侧边栏内容搜索（`Cmd/Ctrl+Shift+F`）与 Replace All：

- 后端：复用 `search_tree` 内核，抽出 `build_matcher`，新增 `fs_search_content` / `fs_replace_all` 两个 IPC 命令；`HARD_MAX_RESULTS` 提升到 20000。
- 前端：新增 `src/modules/search/` 五个组件 + 两个 hook + 四个 lib；改造 sidebar 顶级 view 与快捷键。
- 端到端：15 条验收场景全部通过；既有测试无回归。

## 2. 任务总览与依赖图

> 协调者用的 checkbox 索引（task-checkoff 契约要求 `- [ ] text` 精确匹配）。每完成一个 Task，把对应行从 `- [ ]` 改成 `- [x]`。下面是精简索引，详细步骤见 P1–P6 章节的 `### Task X.Y` 标题。

- [ ] Task 1.1 — 核实 `fs_write_file` 原子写路径
- [ ] Task 1.2 — `HARD_MAX_RESULTS` 从 2000 提升到 20000
- [ ] Task 1.3 — 抽出公共 `build_matcher` helper
- [ ] Task 1.4 — 实现 `fs_search_content` IPC 命令
- [ ] Task 1.5 — 实现 `fs_replace_all` IPC 命令
- [ ] Task 1.6 — 单元测试：`whole_word` 的 regex / 字面量两条路径
- [ ] Task 1.7 — 单元测试：`fs_replace_all` 的 secret-path 拒绝路径
- [ ] Task 1.8 — 单元测试：`fs_replace_all` 的部分失败返回结构
- [ ] Task 1.9 — Rust 全套检查
- [ ] Task 2.1 — 在 `src-tauri/src/lib.rs` 注册两个新命令
- [ ] Task 3.1 — `src/modules/search/lib/types.ts`：与后端对齐的 TS 类型
- [ ] Task 3.2 — `src/modules/search/lib/api.ts`：invoke 包装
- [ ] Task 3.3 — `src/modules/search/lib/mode.ts`：选项 → IPC payload
- [ ] Task 3.4 — `src/modules/search/lib/highlight.ts`：行内命中切分
- [ ] Task 4.1 — `src/modules/search/hooks/useSearchRun.ts`
- [ ] Task 4.2 — `src/modules/search/hooks/useReplaceRun.ts`
- [ ] Task 4.3 — `src/modules/search/SearchInput.tsx`
- [ ] Task 4.4 — `src/modules/search/SearchResults.tsx`
- [ ] Task 4.5 — `src/modules/search/ReplaceAffectedBar.tsx`
- [ ] Task 4.6 — `src/modules/search/SearchPanel.tsx` 主面板
- [ ] Task 4.7 — `src/modules/search/index.ts` 公开导出
- [ ] Task 5.1 — `src/modules/sidebar/types.ts` 新增 `"search"` view
- [ ] Task 5.2 — `useSidebarPanel.ts` 接受 `"search"` 分支
- [ ] Task 5.3 — `SidebarRail.tsx` 新增 Search rail item
- [ ] Task 5.4 — `App.tsx` 渲染 `<SearchPanel />` 分支
- [ ] Task 5.5 — 切换 tab 不丢失搜索状态
- [ ] Task 5.6 — 新增 `Cmd/Ctrl+Shift+F` 快捷键：`search.focusPanel`
- [ ] Task 5.7 — 简化 Command Palette `#` 模式：移除 UI 开关
- [ ] Task 6.1 — 新增 `searchPanel.*` key（英文）
- [ ] Task 6.2 — 新增 `searchPanel.*` key（中文）
- [ ] Task 6.3 — 前端静态检查
- [ ] Task 6.4 — 手动跑通验收场景 1-15
- [ ] Task 6.5 — Rust 端最终回归

```
                                  ┌──────────────────────────────────────┐
                                  │  P1: 后端契约（先建 helper，再建命令） │
                                  └──────────────┬───────────────────────┘
                                                 ▼
                       ┌────────────────────────────────────────────────┐
                       │  P2: 后端 IPC 命令实现 + 单元测试                │
                       └────────────┬────────────────────────┬──────────┘
                                    ▼                        ▼
                ┌─────────────────────────────┐  ┌──────────────────────────┐
                │  P3: 前端 IPC 客户端（lib）   │  │  P4: 前端 UI 组件        │
                └─────────────┬───────────────┘  └─────────┬────────────────┘
                              ▼                            ▼
                              └──────────┬─────────────────┘
                                         ▼
                          ┌─────────────────────────────┐
                          │  P5: sidebar / 快捷键集成    │
                          └─────────────┬───────────────┘
                                        ▼
                          ┌─────────────────────────────┐
                          │  P6: i18n + 端到端验证       │
                          └─────────────────────────────┘
```

依赖与并行约定：
- P1.1（确认原子写）独立可并行。
- P1.2 提升 `HARD_MAX_RESULTS` 后 P1.3 抽取 helper 必须串行（同一文件），P1.4/P1.5 命令与 P1.6/P1.7/P1.8 测试可并行（同一文件分阶段提交即可）。
- P2（注册 IPC）与 P3（前端 lib）可并行，但都要等 P1.5 完成（类型要对齐）。
- P4（UI 组件）严格依赖 P3（lib 提供类型与 invoke 包装）；P4 内 `SearchInput` → `SearchResults` → `ReplaceAffectedBar` → `SearchPanel` 串行。
- P5（sidebar / 快捷键）依赖 P4.4（`SearchPanel` 公开导出）。
- P6（i18n + 端到端）必须最后做。

每完成一个 Task 立即：
1. 跑该 Task 列出的验证命令。
2. `git add` 对应文件。
3. `git commit` 用 Task 给出的 commit message 草案。
4. 回 `openspec/changes/vscode-style-content-search/tasks.md` 把对应项打勾。

> build_mode / isolation / tdd_mode / review_mode 的选择不在本计划范围内，由用户在后续步骤决定。本计划已按"先写测试再写实现"组织，但每个 Task 自行闭环可独立选择是否先写测试。

archived-with: 2026-08-14-vscode-style-content-search
---

## P1 — 后端契约（grep.rs 基础）

### Task 1.1 — 核实 `fs_write_file` 原子写路径

**目标**：确认 `write_atomic` 已存在并可直接复用（替换路径不再需要补原子写）。

**操作步骤**：
1. 读 `src-tauri/src/modules/fs/file.rs` 的 `write_atomic` 实现（已经核实：`NamedTempFile::new_in(parent)` + `sync_all()` + `persist(target)`，O_EXCL 防 symlink attack）。
2. 在 `grep.rs` 顶部加一行 use：`use super::file::write_atomic;`（如果 mod 允许）；如果 `file::write_atomic` 是 `fn` 而非 `pub fn`，需要把它改成 `pub(super) fn` 或在 `grep.rs` 复制最小实现。
3. 跑 `cargo build -p terax-tauri`（仅编译确认 import 通过）。

**涉及文件**：
- `src-tauri/src/modules/fs/file.rs`（可能改可见性）
- `src-tauri/src/modules/fs/grep.rs`（加 use）

**验证步骤（如何确认做完了）**：
- `cargo build -p terax-tauri --locked` 成功，无 warning。
- `cargo build -p terax-tauri --locked 2>&1 | grep -i "write_atomic"` 出现至少一次 import 或定义行。
- 现有 `cargo nextest run -p terax-tauri fs::file` 测试通过（无需修改）。

**Commit 时机**：本 Task 完成后立即。
**Commit message 草案**：
```
chore(grep): reuse fs_write_file::write_atomic for replace path

Confirm fs::file::write_atomic already provides O_EXCL + rename
atomicity (NamedTempFile in parent dir, sync_all, persist). Surface
it to grep.rs so fs_replace_all can write file changes without a
second implementation. No behavior change.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 1.2 — `HARD_MAX_RESULTS` 从 2000 提升到 20000

**目标**：放开单次搜索总命中上限，对齐 VS Code 默认。

**操作步骤**：
1. 修改 `src-tauri/src/modules/fs/grep.rs:17`：
   - `const HARD_MAX_RESULTS: usize = 2000;` → `const HARD_MAX_RESULTS: usize = 20000;`
2. 跑现有测试确认无回归（注意：`fs_grep` / `fs_grep_interactive` / `fs_glob` 都用 `clamp(1, HARD_MAX_RESULTS)`，只是上限抬高，调用方显式传 `max_results` 的不受影响）。

**涉及文件**：
- `src-tauri/src/modules/fs/grep.rs`

**验证步骤**：
- `cd src-tauri && cargo nextest run --locked` 通过。
- `grep HARD_MAX_RESULTS src-tauri/src/modules/fs/grep.rs` 出现 `20000`。
- 单元测试 `HARD_MAX_RESULTS_constant_is_20000`（在 Task 2.x 中新增）通过。

**Commit message 草案**：
```
feat(grep): raise HARD_MAX_RESULTS to 20000

Single-search hit cap matches VS Code default. Callers that pass an
explicit max_results are unaffected. Update is the single const change
plus the constant-value test in the next commit.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 1.3 — 抽出公共 `build_matcher` helper

**目标**：把 `fs_grep` / `fs_grep_interactive` / 新增 `fs_search_content` 三处 matcher 构造逻辑收敛到一个 helper。

**操作步骤**：
1. 在 `src-tauri/src/modules/fs/grep.rs` 新增 `build_matcher`，签名与 Design Doc §4.1 一致：
   - `regex=false + ww=false` → `escape_literal` + smart-case。
   - `regex=false + ww=true`  → `\b{escape_literal}\b` + smart-case。
   - `regex=true`             → 用户原样，关闭 smart-case（`case_smart(false)`），按 `case_sensitive` 切 case_insensitive；ww 由用户自负（文档化）。
2. `fs_grep`：保留旧 matcher 构造路径（向后兼容，签名不变）。
3. `fs_grep_interactive`：改为 `build_matcher(pattern, false, false, false)`。
4. 新增 `fs_search_content` 暂不引入（Task 1.5 才加），但 helper 必须可被三种调用形式复用。
5. 加单测覆盖四条路径：
   - `test build_matcher_escapes_literal_whole_word_off`
   - `test build_matcher_wraps_whole_word_when_literal`
   - `test build_matcher_passes_regex_through_unchanged`
   - `test build_matcher_case_sensitive_overrides_smart_case_for_regex`

**涉及文件**：
- `src-tauri/src/modules/fs/grep.rs`

**验证步骤**：
- `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings` 通过。
- `cd src-tauri && cargo nextest run --locked grep::` 全部通过（含新 4 条 + 旧 `escape_literal_escapes_regex_meta`）。
- 手动 sanity：注释一行旧 matcher 路径，确认 `fs_grep` 仍能搜出原结果（可写一个临时集成测试，或在已有 `search_tree_respects_cancellation` 测试里顺带触发）。

**Commit message 草案**：
```
refactor(grep): extract build_matcher helper

Four matcher construction paths (literal/whole_word/regex/case_sensitivity)
collapse into build_matcher. fs_grep keeps its existing signature for
back-compat; fs_grep_interactive switches to build_matcher(pattern,
false, false, false). Adds four unit tests covering the branches.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 1.4 — 实现 `fs_search_content` IPC 命令

**目标**：新增带 regex / ci / whole_word / include / exclude / max_results 的搜索命令。

**操作步骤**：
1. 在 `grep.rs` 实现 `fs_search_content`：
   - 参数签名按 Design Doc §3.1（注意 `max_results` 默认 20000，clamp 上限 = 新的 `HARD_MAX_RESULTS`）。
   - include / exclude 通过 `WalkBuilder::filter_entry`（注意：search_tree 内部用 `WalkBuilder::new(...).build_parallel()`，要扩展为可注入 `filter_entry`，或者重写 search_tree 接受一个 `Box<dyn Fn(&DirEntry) -> bool>`；优先选注入过滤闭包方案，避免改动既有签名）。
   - 复用 `ContentSearchState` generation 自取消：`fetch_add(1) + SeqCst`。
   - matcher 用 `build_matcher`。
2. 单元测试：
   - `test fs_search_content_respects_include_glob`
   - `test fs_search_content_respects_exclude_glob`
   - `test fs_search_content_generation_self_cancels`（与现有 `search_tree_respects_cancellation` 类似）
3. 暂不注册到 `lib.rs`（注册在 Task 2.1）。

**涉及文件**：
- `src-tauri/src/modules/fs/grep.rs`

**验证步骤**：
- `cd src-tauri && cargo nextest run --locked grep::tests::fs_search_content` 通过。
- `cargo clippy --all-targets --locked -- -D warnings` 通过。

**Commit message 草案**：
```
feat(grep): fs_search_content IPC command

Wraps search_tree with build_matcher and an injected include/exclude
filter closure. Reuses ContentSearchState generation-based cancellation.
Returns the same GrepResponse so the frontend can share types.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 1.5 — 实现 `fs_replace_all` IPC 命令

**目标**：在搜索基础上做行级替换 + 原子写，前端 deny-list 守门。

**操作步骤**：
1. 新增类型：
   - `ReplaceResponse { files_changed: Vec<ReplaceFileResult>, errors: Vec<ReplaceError>, total_replacements: usize, truncated: bool }`
   - `ReplaceFileResult { path: String, replacements: usize }`
   - `ReplaceError { path: String, reason: String }`
2. 实现 `fs_replace_all`，严格按 Design Doc §4.3：
   - `build_matcher` 构造 matcher。
   - include / exclude 用同一 `build_globset`。
   - 走 `search_tree`，但 sink 改为"每行只保留第一个命中"（保留修改：在 search_tree 接受 sink 策略参数 `first_match_per_line: bool`，或者为 `fs_replace_all` 重写一个最小化版的 walk + search——优先选 search_tree 接受 `Mode` 枚举，避免逻辑分叉）。
   - 按文件分组：对每个文件：
     - `std::fs::read_to_string`，失败 → `errors.push(...)`，continue。
     - 行级替换：构造 `(before, after, count)` 三元组，**倒序**应用避免偏移错乱。
     - `write_atomic` 写入，失败 → 记 error，continue。
   - 返回 `ReplaceResponse`。
3. 单元测试（来自 Design Doc §4.4 + Design Doc 验收场景）：
   - `test fs_replace_all_partial_failure_continues_remaining_files`
   - `test fs_replace_all_skips_binary_files`
   - `test fs_replace_all_respects_exclude_glob`
   - `test fs_replace_all_zero_match_returns_empty_files_changed`
   - `test fs_replace_all_first_match_per_line_only`
   - `test HARD_MAX_RESULTS_constant_is_20000`
4. 暂不注册到 `lib.rs`（注册在 Task 2.1）。

**涉及文件**：
- `src-tauri/src/modules/fs/grep.rs`

**验证步骤**：
- `cd src-tauri && cargo nextest run --locked grep::tests::fs_replace_all` 全部通过。
- `cd src-tauri && cargo nextest run --locked` 全套通过。
- `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings` 通过。

**Commit message 草案**：
```
feat(grep): fs_replace_all IPC command

Searches via build_matcher + search_tree in first-match-per-line mode,
groups hits by file, and applies row-level replacements bottom-up so
offsets don't drift. Writes each file via fs::file::write_atomic for
O_EXCL + rename atomicity. Per-file errors are collected, not
propagated, so a single bad file doesn't break the whole batch.
Returns ReplaceResponse { files_changed, errors, total_replacements,
truncated }. Workspace authorization is provided by fs_write_file.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 1.6 — 单元测试：`whole_word` 的 regex / 字面量两条路径

**目标**：单独覆盖 whole_word 两个分支（regex 模式下由用户加 `\b`、字面量模式下 helper 自动加）。

**操作步骤**：
1. 已在 Task 1.3 中实现两个测试：`build_matcher_wraps_whole_word_when_literal`、`build_matcher_passes_regex_through_unchanged`。
2. 额外补一个集成测试：`fs_search_content` 整体带 `whole_word=true` 时只匹配单词边界。
3. 补一个反向用例：`whole_word=true + pattern="test"` 不应匹配 `testing`（验收场景 6）。

**涉及文件**：
- `src-tauri/src/modules/fs/grep.rs`

**验证步骤**：
- `cd src-tauri && cargo nextest run --locked whole_word` 通过。
- 输出断言：构造临时目录，写入 `this is a test.\ntesting 123\n`，搜 `test` + ww=true 应只命中 1 行。

**Commit message 草案**：
```
test(grep): cover whole_word literal/regex branches

Adds a focused test that fs_search_content with whole_word=true and
literal pattern "test" matches only "test" but not "testing". The
regex mode test asserts that build_matcher does NOT auto-wrap with
\b — that's the user's responsibility.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 1.7 — 单元测试：`fs_replace_all` 的 secret-path 拒绝路径

**目标**：覆盖 Design Doc §8"前端守门、后端不重复 deny-list 检查"的契约。

**操作步骤**：
1. 写测试 `test fs_replace_all_does_not_block_secret_paths_server_side`：在临时目录下创建模拟 secret 路径结构，调用 `fs_replace_all` 期望**正常执行**（后端不拦）。
2. 在 `useReplaceRun` 前端 hook 的单测里（Task 4.2）覆盖"secret-path 在前端被拦下"的路径——本 Task 只确保后端契约。
3. 不需要测后端的 deny-list（设计已说明不重复检查）。

**涉及文件**：
- `src-tauri/src/modules/fs/grep.rs`（测试）

**验证步骤**：
- `cd src-tauri && cargo nextest run --locked fs_replace_all_does_not_block` 通过。

**Commit message 草案**：
```
test(grep): lock fs_replace_all contract — server does not deny-list

Locks the architectural decision: fs_replace_all trusts its caller.
The frontend is the single source of deny-list enforcement. This test
exists to catch anyone who later adds a backend deny-list that breaks
the contract.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 1.8 — 单元测试：`fs_replace_all` 的部分失败返回结构

**目标**：确保部分失败时 `files_changed` / `errors` / `total_replacements` 三者各自正确。

**操作步骤**：
1. 测试 `test fs_replace_all_partial_failure_continues_remaining_files`（Task 1.5 已加）：构造 3 个文件，其中 1 个不存在（read 失败），其余成功；断言 `errors.len() == 1`、`files_changed.len() == 2`、`total_replacements` 准确。
2. 测试 `test fs_replace_all_reports_per_file_replacement_counts`：构造同一文件 2 处匹配，断言 `replacements == 2`。

**涉及文件**：
- `src-tauri/src/modules/fs/grep.rs`（测试）

**验证步骤**：
- `cd src-tauri && cargo nextest run --locked fs_replace_all_partial` 通过。
- `cd src-tauri && cargo nextest run --locked` 全套通过。

**Commit message 草案**：
```
test(grep): fs_replace_all partial-failure response shape

Two tests: (a) one unreadable file does not stop the rest of the
batch, (b) per-file replacement counts sum to total_replacements.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 1.9 — Rust 全套检查

**目标**：确保所有后端变更符合项目质量门槛。

**操作步骤**：
1. `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings`。
2. `cd src-tauri && cargo nextest run --locked`。
3. 若有 warning 或 fail，按 systematic-debugging 修。

**验证步骤**：两条命令都返回 0。

**Commit message 草案**：
```
chore(grep): all-targets clippy + full nextest green

Required by TERAX.md quality bar before the build moves to the
frontend side. Lock-file flags prevent an unintended dep upgrade.
```

archived-with: 2026-08-14-vscode-style-content-search
---

## P2 — IPC 注册

### Task 2.1 — 在 `src-tauri/src/lib.rs` 注册两个新命令

**目标**：让 `fs_search_content` / `fs_replace_all` 可被前端 invoke。

**操作步骤**：
1. 在 `src-tauri/src/lib.rs` 的 `invoke_handler!` 宏列表里，紧跟 `fs::grep::fs_grep_interactive` 之后追加：
   ```rust
   fs::grep::fs_search_content,
   fs::grep::fs_replace_all,
   ```
2. 重新跑 `cargo build -p terax-tauri --locked` 确认无类型错误。

**涉及文件**：
- `src-tauri/src/lib.rs`

**验证步骤**：
- `cd src-tauri && cargo build --locked` 成功。
- `cd src-tauri && cargo nextest run --locked` 仍全绿。
- `grep -n "fs_search_content\|fs_replace_all" src-tauri/src/lib.rs` 出现 2 行注册。

**Commit message 草案**：
```
feat(grep): register fs_search_content + fs_replace_all IPC handlers

Wired in src-tauri/src/lib.rs alongside the existing fs_grep_*
handlers. Both commands are now reachable from the webview via
invoke().
```

archived-with: 2026-08-14-vscode-style-content-search
---

## P3 — 前端 IPC 客户端（lib）

> 全部并行可启动，但 commit 必须串行（同一文件拆分 commit）。

### Task 3.1 — `src/modules/search/lib/types.ts`：与后端对齐的 TS 类型

**目标**：TS 类型与 Rust 结构严格对齐。

**操作步骤**：
1. 新建 `src/modules/search/lib/types.ts`：
   ```ts
   export type ContentHit = { path: string; rel: string; line: number; text: string };
   export type GrepResponse = { hits: ContentHit[]; truncated: boolean; files_scanned: number };
   export type ReplaceFileResult = { path: string; replacements: number };
   export type ReplaceError = { path: string; reason: string };
   export type ReplaceResponse = {
     files_changed: ReplaceFileResult[];
     errors: ReplaceError[];
     total_replacements: number;
     truncated: boolean;
   };
   export type SearchInput = {
     pattern: string;
     root: string;
     regex: boolean;
     case_sensitive: boolean;
     whole_word: boolean;
     include?: string | null;
     exclude?: string | null;
     max_results?: number | null;
   };
   export type ReplaceInput = SearchInput & { replacement: string };
   ```
2. 不引用 `useContentSearch` 的旧类型（那是 `command-palette` 内部）；`ContentHit` 与之结构相同但放在新模块。

**涉及文件**：
- `src/modules/search/lib/types.ts`（新建）

**验证步骤**：
- `pnpm check-types` 通过。
- 旧 `command-palette/hooks/useContentSearch.ts` 中的 `ContentHit` 可以后续迁移到共用，但本 Task **不动**它（避免扩大 diff）。

**Commit message 草案**：
```
feat(search): TS types mirroring Rust IPC contract

types.ts mirrors GrepResponse / ReplaceResponse / ReplaceFileResult
/ ReplaceError exactly. Kept separate from command-palette's
useContentSearch ContentHit so the diff stays scoped.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 3.2 — `src/modules/search/lib/api.ts`：invoke 包装

**目标**：把 IPC 调用封到 lib，对外暴露纯函数。

**操作步骤**：
1. 新建 `src/modules/search/lib/api.ts`：
   - `searchContent(input: SearchInput): Promise<GrepResponse>` → `invoke<GrepResponse>("fs_search_content", { ...input, workspace: currentWorkspaceEnv() })`。
   - `replaceAll(input: ReplaceInput): Promise<ReplaceResponse>` → 同上 invoke，key 用 camelCase。
2. 不在本 Task 加 deny-list 调用（那是 useReplaceRun 的责任）。
3. 不加 retry / 防抖（那是 hook 的责任）。

**涉及文件**：
- `src/modules/search/lib/api.ts`（新建）

**验证步骤**：
- `pnpm check-types` 通过。
- `pnpm lint` 通过。

**Commit message 草案**：
```
feat(search): invoke wrappers for fs_search_content + fs_replace_all

Pure functions over Tauri's invoke() with workspace env injected.
No debounce, no retry, no deny-list — those live in the hooks.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 3.3 — `src/modules/search/lib/mode.ts`：选项 → IPC payload

**目标**：把 UI 状态（pattern / switches / include / exclude）聚合成 `SearchInput`，便于 hook 单一调用。

**操作步骤**：
1. 新建 `src/modules/search/lib/mode.ts`：
   - `buildSearchInput(opts: { pattern: string; root: string; regex: boolean; case_sensitive: boolean; whole_word: boolean; include: string; exclude: string; max_results?: number }): SearchInput`。
   - 处理空字符串：`include` / `exclude` 为空时返回 `null`，否则 trim。
2. 加单测 `mode.test.ts`：空字符串归一为 `null`、trim 前后空格、max_results 不传时为 undefined。

**涉及文件**：
- `src/modules/search/lib/mode.ts`（新建）
- `src/modules/search/lib/mode.test.ts`（新建）

**验证步骤**：
- `pnpm test src/modules/search/lib/mode.test.ts` 通过。
- `pnpm check-types` 通过。

**Commit message 草案**：
```
feat(search): buildSearchInput normalizes UI state to IPC payload

Empty include/exclude collapse to null. Trimmed. Single source of
truth for the IPC payload shape so the hooks stay declarative.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 3.4 — `src/modules/search/lib/highlight.ts`：行内命中切分

**目标**：把命中行按 query 切成 `[before, match, after]` 段用于 `<mark>` 高亮。

**操作步骤**：
1. 新建 `src/modules/search/lib/highlight.ts`：
   - `splitHits(line: string, pattern: string, opts: { regex: boolean; case_sensitive: boolean; whole_word: boolean }): Array<{ text: string; match: boolean }>`。
   - regex 模式走 `RegExp`（用户原样，case_sensitive/whole_word 直传）。
   - 非 regex 模式走字面量切分（global + escape）。
   - 返回的段按出现顺序排列，首段 match=false，后续交替。
2. 单测 `highlight.test.ts`：
   - 多次命中：`"abc abc abc"` + `abc` → 3 段。
   - 零命中：`"abc"` + `xyz` → 单段 match=false。
   - 大小写敏感 + `abc` → 不切 `ABC`。
   - whole_word + `test` → 不切 `testing`。
   - 用户正则 `[A-Z]+`：高亮所有连续大写。

**涉及文件**：
- `src/modules/search/lib/highlight.ts`（新建）
- `src/modules/search/lib/highlight.test.ts`（新建）

**验证步骤**：
- `pnpm test src/modules/search/lib/highlight.test.ts` 通过。
- `pnpm check-types` / `pnpm lint` 通过。

**Commit message 草案**：
```
feat(search): inline-match splitter for highlighted results

Pure function splitHits returns alternating non-match/match segments
so SearchResults can render <mark> without re-implementing the regex
or escape logic. Regex mode passes the user pattern through verbatim.
```

archived-with: 2026-08-14-vscode-style-content-search
---

## P4 — 前端 UI 模块

### Task 4.1 — `src/modules/search/hooks/useSearchRun.ts`

**目标**：防抖 + generation 自取消的搜索 hook。

**操作步骤**：
1. 新建 `useSearchRun`：
   - 输入：`{ input: SearchInput | null; debounceMs?: number }`，默认 140ms（沿用 `useContentSearch` 的 `DEBOUNCE_MS`）。
   - 内部 generation 计数；每次新 input，generation+1，过期响应丢弃。
   - 暴露：`{ results: GrepResponse | null; loading: boolean; error: string | null; retry: () => void }`。
   - 复用 `searchContent(input)` 调 IPC。
2. 单测 `useSearchRun.test.ts`（用 `@testing-library/react` + 假 `invoke`）：
   - 旧响应到达后被丢弃（assertion 不污染最终结果）。
   - 防抖触发：300ms 内只发一次 invoke。
   - error 路径：invoke reject 时 error 字段被填。

**涉及文件**：
- `src/modules/search/hooks/useSearchRun.ts`（新建）
- `src/modules/search/hooks/useSearchRun.test.ts`（新建）

**验证步骤**：
- `pnpm test src/modules/search/hooks/useSearchRun.test.ts` 通过。
- `pnpm lint` / `pnpm check-types` 通过。

**Commit message 草案**：
```
feat(search): useSearchRun with debounce + generation cancel

140ms debounce (matches useContentSearch). Each new input bumps
generation; stale IPC responses are dropped. Returns { results,
loading, error, retry } — same shape as useContentSearch so the
two can be swapped behind a feature flag later if we ever want to.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 4.2 — `src/modules/search/hooks/useReplaceRun.ts`

**目标**：替换状态机（idle / previewing / running / done / error），前端 deny-list 守门。

**操作步骤**：
1. 实现状态机（Design Doc §5.2）。
2. `replace()` 方法：
   a. 校验 `replacement` 非空 + 有当前搜索结果（来自 useSearchRun）。
   b. 对每个目标文件调 `checkWritableCanonical`（`src/modules/ai/lib/security.ts:291` + `fs_canonicalize` invoke）。
   c. 任一失败 → 切到 `{ kind: "error", message: "refused: <path>" }`，return。
   d. 全过 → 切 `running`，调 `replaceAll(input)`，成功后切 `done` / `partial`。
3. 单测 `useReplaceRun.test.ts`：
   - 状态机从 idle → previewing（自动）/ running → done 的转换。
   - secret-path 被前端拒绝（mock `checkWritableCanonical` 返回 `{ ok: false, reason }`）。
   - 部分失败 → `kind: "partial"`，`errors` 数组非空。

**涉及文件**：
- `src/modules/search/hooks/useReplaceRun.ts`（新建）
- `src/modules/search/hooks/useReplaceRun.test.ts`（新建）

**验证步骤**：
- `pnpm test src/modules/search/hooks/useReplaceRun.test.ts` 通过。
- `pnpm lint` / `pnpm check-types` 通过。

**Commit message 草案**：
```
feat(search): useReplaceRun state machine + deny-list gate

States: idle / previewing / running / done / partial / error. Before
calling fs_replace_all, every target file passes through
checkWritableCanonical (the same deny-list AI tools use). A single
blocked path aborts the whole batch — we don't want to half-write
across a security boundary.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 4.3 — `src/modules/search/SearchInput.tsx`

**目标**：输入区（Search / Replace / 三件套开关 / include / exclude / 状态条）。

**操作步骤**：
1. 实现 `SearchInput`，两个 `<input>` + 三个 `Button`（regex / case / ww）+ 两个小 `<input>`（include / exclude）+ 顶部状态条 `files: N matches: M [truncated]`。
2. 行为：
   - `Replace` 输入为空时 `disabled` 视觉降级（仍可输入，但不参与 Replace All）。
   - 任意开关变化 → 重新触发 `useSearchRun`。
   - 状态条 props：`{ filesScanned: number; totalMatches: number; truncated: boolean }`。
3. 不引入新依赖；用项目已有 `Button` 组件（`src/components/ui/button.tsx`）和 `Tooltip` 组件。
4. i18n：所有 string 走 `t("searchPanel.*")`（key 在 Task 6.2 加）。

**涉及文件**：
- `src/modules/search/SearchInput.tsx`（新建）

**验证步骤**：
- `pnpm lint` / `pnpm check-types` 通过。
- 手动 smoke：UI 渲染时无控制台报错。

**Commit message 草案**：
```
feat(search): SearchInput with regex/case/ww toggles + include/exclude

Two text inputs (Search / Replace), three icon toggles, two globs.
State strip on top: files: N matches: M [truncated]. Disabled state
on Replace input when empty. Pure presentational — usesearchrun
lives in the panel.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 4.4 — `src/modules/search/SearchResults.tsx`

**目标**：按文件分组 + 可折叠 + 行内高亮。

**操作步骤**：
1. 实现 `SearchResults`，prop `{ hits: ContentHit[]; pattern: string; options: HighlightOptions }`。
2. 内部 `useMemo`：按 `rel` 分组，保留首次出现顺序。
3. 每个文件一个 `<details>`：filename + 命中数（默认 `open={hits.length > 0}`，空文件折叠）。
4. 命中行：`{line} │ {splitHits(text).map(seg => seg.match ? <mark> : seg.text)}`。
5. 高亮 key 取 `seg.text` 在原行的累计偏移，保证稳定。

**涉及文件**：
- `src/modules/search/SearchResults.tsx`（新建）

**验证步骤**：
- `pnpm lint` / `pnpm check-types` 通过。
- 与 `highlight.ts` 单测对齐（边界条件已在 lib 层覆盖）。

**Commit message 草案**：
```
feat(search): SearchResults grouped by file with inline highlights

Groups hits by rel (first-seen order). Each file is a <details> row
with filename + match count; auto-opens files with hits. Per-line
matches split through highlight.ts so regex/literal/whole_word/case
sensitive all render consistently.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 4.5 — `src/modules/search/ReplaceAffectedBar.tsx`

**目标**：底部 fixed 行，显示"将修改 N 个文件 / M 个匹配" + `Replace All` 按钮。

**操作步骤**：
1. 实现 `ReplaceAffectedBar`，props：
   - `{ affectedFiles: number; totalMatches: number; replaceState: ReplaceState; onReplace: () => void }`。
2. 当 `replacement` 为空或 `affectedFiles === 0`：组件不渲染。
3. 状态机非 `idle` 时按钮 disabled + 显示进度文案（"Replacing…" / "Done" / "Partial — N files failed"）。
4. i18n 文案用 `searchPanel.replaceAffected`。

**涉及文件**：
- `src/modules/search/ReplaceAffectedBar.tsx`（新建）

**验证步骤**：
- `pnpm lint` / `pnpm check-types` 通过。

**Commit message 草案**：
```
feat(search): ReplaceAffectedBar with state-aware Replace All button

Hidden when no replacement text or zero matches. Button text and
disabled state follow the ReplaceState machine. No batch-confirm
dialog — VS Code pattern: one click, file list visible above.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 4.6 — `src/modules/search/SearchPanel.tsx` 主面板

**目标**：组合上述组件，提供主面板 + 通过 ref 暴露 `focusSearchInput()`。

**操作步骤**：
1. 实现 `SearchPanel`，内部：
   - 持有 `[pattern, regex, case_sensitive, whole_word, include, exclude, replacement]` 状态。
   - `useSearchRun({ input: built })` → `results`。
   - `useReplaceRun({ results, input })` → `replaceState`。
   - 渲染 `SearchInput` / `SearchResults` / `ReplaceAffectedBar`。
2. 暴露 `useImperativeHandle({ focusSearchInput(): void })`——外部快捷键 handler 用。
3. 当 `root == null`（无 workspace）时显示 `searchPanel.noWorkspace`。

**涉及文件**：
- `src/modules/search/SearchPanel.tsx`（新建）

**验证步骤**：
- `pnpm lint` / `pnpm check-types` 通过。

**Commit message 草案**：
```
feat(search): SearchPanel composing SearchInput + Results + Replace

Owns the option state, drives useSearchRun + useReplaceRun. Forwards
focusSearchInput() via imperative handle so the global shortcut
handler can focus the input after switching the sidebar view.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 4.7 — `src/modules/search/index.ts` 公开导出

**目标**：模块 barrel。

**操作步骤**：
1. 导出 `SearchPanel`（含 `SearchPanelHandle` 类型）、`useSearchRun`、`useReplaceRun`、`buildSearchInput`、`splitHits`、所有 types。
2. 不导出内部 `_internals`。

**涉及文件**：
- `src/modules/search/index.ts`（新建）

**验证步骤**：
- `pnpm check-types` 通过。
- `pnpm lint` 通过。

**Commit message 草案**：
```
feat(search): public barrel exports
```

archived-with: 2026-08-14-vscode-style-content-search
---

## P5 — sidebar / 快捷键集成

### Task 5.1 — `src/modules/sidebar/types.ts` 新增 `"search"` view

**目标**：让 `SidebarViewId` 支持第三个顶级 view。

**操作步骤**：
1. `export type SidebarViewId = "explorer" | "search" | "source-control";`。

**涉及文件**：
- `src/modules/sidebar/types.ts`

**验证步骤**：
- `pnpm check-types` 通过（所有引用点要么已用字符串字面量，要么用枚举）。

**Commit message 草案**：
```
feat(sidebar): add "search" to SidebarViewId union

The third top-level view sits between explorer and source-control.
Order matters only for type inference; the rail renders whichever
items are in the items[] array.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 5.2 — `useSidebarPanel.ts` 接受 `"search"` 分支

**目标**：`readSidebarView()` / `persistSidebarView()` 不要把 `"search"` 当成非法值丢弃。

**操作步骤**：
1. `readSidebarView()`：把 `"explorer" | "search" | "source-control"` 三选一都接受，其余 fallback `"explorer"`。
2. `persistSidebarView` 不变（已支持任意 SidebarViewId）。
3. `cycleSidebarView` 不变（已接受任意 view）。

**涉及文件**：
- `src/modules/sidebar/useSidebarPanel.ts`

**验证步骤**：
- `pnpm check-types` 通过。
- `pnpm lint` 通过。

**Commit message 草案**：
```
fix(sidebar): readSidebarView accepts "search" view id

Without this, persisted sidebarView=search on next launch falls back
to explorer and the user sees the wrong panel.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 5.3 — `SidebarRail.tsx` 新增 Search rail item

**目标**：rail 上多一个 Search 按钮（与 Explorer、Source Control 并列）。

**操作步骤**：
1. import 增加 `Search01Icon`（`@hugeicons/core-free-icons`）。
2. `items` 数组插入 `{ id: "search", label: t("sidebar.search"), icon: Search01Icon }`，**位置在 explorer 与 source-control 之间**（验收场景 2：与 Explorer / Source Control 并列）。
3. 无 badge。

**涉及文件**：
- `src/modules/sidebar/SidebarRail.tsx`

**验证步骤**：
- `pnpm lint` / `pnpm check-types` 通过。

**Commit message 草案**：
```
feat(sidebar): add Search rail item between Explorer and Source Control
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 5.4 — `App.tsx` 渲染 `<SearchPanel />` 分支

**目标**：当 `sidebarView === "search"` 时，sidebar 主区显示 SearchPanel。

**操作步骤**：
1. 在 `src/app/App.tsx:1211` 的三元里加 `else if (sidebarView === "search")` 分支。
2. `<SearchPanel ref={searchPanelRef} rootPath={explorerRoot} />`。
3. `searchPanelRef` 用 `useRef<{ focusSearchInput: () => void }>(null)`。
4. **关键**：把 `<div key={sidebarView}>` 的 `key` 改成只在 source-control 之间切换时生效（避免切到 search 时整个 search 状态被重置）：
   - 方案 A（推荐）：保持 `key={sidebarView}`，但把 SearchPanel 的输入/结果状态提到 App 容器（hoist state）。后续 Task 5.6 会做。
   - 方案 B：去掉 `key`，统一一个子树，加条件渲染——会引发 source-control 内部 mount/unmount，需评估。
   - 优先选方案 A（保持现状隔离，把 SearchPanel 改成"无状态展示组件"，状态全部来自 props，状态从 App 层注入）。
5. 因此本 Task 只做"加分支 + 加 ref"，state hoist 留到 Task 5.6。

**涉及文件**：
- `src/app/App.tsx`

**验证步骤**：
- `pnpm check-types` / `pnpm lint` 通过。
- 启动应用：rail 点击 Search，主区出现 SearchPanel（手动 smoke）。

**Commit message 草案**：
```
feat(sidebar): render SearchPanel when sidebarView === "search"

Three-way branch in App.tsx replaces the previous explorer/source-
control binary. SearchPanel gets an imperative ref so the global
shortcut can focus its input after switching views.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 5.5 — 切换 tab 不丢失搜索状态

**目标**：从 Search 切到 Explorer 再切回，输入框文本 + 开关 + 结果仍保留。

**操作步骤**：
1. 在 `App.tsx` 顶层用 `useState` 持有 SearchPanel 的所有 UI state（pattern / regex / case_sensitive / whole_word / include / exclude / replacement / lastResult）。
2. SearchPanel 改成完全受控组件（所有状态都通过 props 进来 + onChange 回调）。
3. `<div key={sidebarView}>` 保留（独立 mount/unmount 不影响，因为状态在 App 层）。
4. 验收场景 13：用户输入 "TODO" → 切到 Explorer → 切回 Search，输入框仍是 "TODO" 且结果显示不变。

**涉及文件**：
- `src/app/App.tsx`
- `src/modules/search/SearchPanel.tsx`（改为受控）

**验证步骤**：
- `pnpm check-types` / `pnpm lint` 通过。
- 手动 smoke 验收场景 13。

**Commit message 草案**：
```
refactor(search): hoist SearchPanel state to App for tab-switch preservation

Keeping the sidebar view-key remount means SearchPanel must be
controlled. All inputs/switches/results live in App so switching to
Explorer and back loses nothing. Matches VS Code behavior.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 5.6 — 新增 `Cmd/Ctrl+Shift+F` 快捷键：`search.focusPanel`

**目标**：全局快捷键打开 Search 面板并聚焦输入框。

**操作步骤**：
1. `src/modules/shortcuts/shortcuts.ts`：
   - 把 `"explorer.search"` 重命名为 `"explorer.findFiles"`，defaultBindings 改 `{ [MOD_PROP]: true, shift: true, key: "k" }`。
   - 新增 `"search.focusPanel"`，defaultBindings `{ [MOD_PROP]: true, shift: true, key: "f" }`。
   - 注意 `"search.focus"` 仍存在（Find in tab，header 用），不动。
   - `ShortcutId` 联合类型同步更新。
2. `src/modules/shortcuts/lib/useGlobalShortcuts.ts`：增加 `"search.focusPanel"` 分支 handler（参考 `"explorer.search"` 实现位置）。
3. `src/modules/command-palette/commands.ts`：同步更新 `id` / `shortcutId` 引用（两处：`explorer.search` → `explorer.findFiles`、`search.focusPanel` 新增条目）。
4. `src/modules/explorer/FileExplorer.tsx`：把 `"explorer.search"` handler 改用新 id（按 grep 结果需要更新）。
5. `src/app/App.tsx`：
   - 在 `useGlobalShortcuts` 注册 `"search.focusPanel"` → 若 sidebar 折叠则展开 + `persistSidebarView("search")` + `requestAnimationFrame(() => searchPanelRef.current?.focusSearchInput())`。

**涉及文件**：
- `src/modules/shortcuts/shortcuts.ts`
- `src/modules/shortcuts/lib/useGlobalShortcuts.ts`
- `src/modules/command-palette/commands.ts
- `src/modules/explorer/FileExplorer.tsx`
- `src/app/App.tsx`

**验证步骤**：
- `pnpm lint` / `pnpm check-types` / `pnpm test` 全部通过。
- 手动 smoke 验收场景 14 / 15。
- 检查 `grep -rn "explorer.search" src` 不应再有引用（已全部改成 `explorer.findFiles`）。

**Commit message 草案**：
```
feat(shortcuts): search.focusPanel = Mod+Shift+F, explorer.findFiles = Mod+Shift+K

explorer.search is renamed and rebound (changelog note: users who
customized the binding under the old id will need to redo it).
search.focusPanel opens the new sidebar Search panel and focuses its
input. All call sites in App.tsx, FileExplorer.tsx, and commands.ts
updated. search.focus (Find in tab) is unchanged.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 5.7 — 简化 Command Palette `#` 模式：移除 UI 开关

**目标**：Command Palette `#` 模式（`fs_grep_interactive`）保留作为快速入口，但 UI 上不再展示三件套开关（已在 Search 面板）。

**操作步骤**：
1. 读 `src/modules/command-palette/CommandPalette.tsx`，找到 `#` 模式分支（`CommandPalette.tsx:297-333` per proposal）。
2. 如果那里有 regex / case 开关 UI：移除。
3. `useContentSearch` 调用本身保留（literal + smart-case 行为对齐 Search 面板默认）。
4. 不动 `search.focus`（Find in tab）的 UI。

**涉及文件**：
- `src/modules/command-palette/CommandPalette.tsx`

**验证步骤**：
- `pnpm lint` / `pnpm check-types` 通过。
- `pnpm test src/modules/command-palette` 通过。
- 手动 smoke：`Cmd+Shift+P` → `#` 模式搜文件内容，不出现开关 UI。

**Commit message 草案**：
```
refactor(command-palette): drop toggles from # content search mode

The new Search panel owns regex/case/ww/include/exclude. Command
palette's # mode becomes a quick literal search entry — same
backend (fs_grep_interactive), same hook (useContentSearch), no
toggle UI.
```

archived-with: 2026-08-14-vscode-style-content-search
---

## P6 — i18n + 端到端

### Task 6.1 — 新增 `searchPanel.*` key（英文）

**目标**：英文 locale 全部 key 落地。

**操作步骤**：
1. 在 `src/i18n/locales/en.json` 新增 `"searchPanel": { ... }`：
   - `search`, `replace`, `regex`, `caseSensitive`, `wholeWord`, `include`, `exclude`, `replaceAll`, `replaceAffected` (含 `{{files}}` / `{{matches}}`), `truncated`, `noResults`, `noWorkspace`。
2. 在 `sidebar` 段加 `"search": "Search"`。
3. 在 `shortcuts` 段加 `"search.focusPanel": "Open search panel"`，把 `"explorer.search"` 改名 `"explorer.findFiles"` + 文案改 `"Find files"`。

**涉及文件**：
- `src/i18n/locales/en.json`

**验证步骤**：
- `pnpm check-types` 通过（i18n 强类型检查会触发）。
- `grep -n "searchPanel" src/i18n/locales/en.json` 命中至少 12 行。

**Commit message 草案**：
```
feat(i18n/en): add searchPanel.* + sidebar.search + shortcut labels
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 6.2 — 新增 `searchPanel.*` key（中文）

**目标**：中文 locale 与英文严格对齐。

**操作步骤**：
1. 在 `src/i18n/locales/zh.json` 同样新增 `"searchPanel": { ... }`，翻译：
   - `search` → "搜索"，`replace` → "替换"，`regex` → "正则表达式"，`caseSensitive` → "区分大小写"，`wholeWord` → "全字匹配"，`include` → "包含文件"，`exclude` → "排除文件"，`replaceAll` → "全部替换"，`replaceAffected` → "将修改 {{files}} 个文件、{{matches}} 个匹配"，`truncated` → "结果已截断"，`noResults` → "无结果"，`noWorkspace` → "请先打开工作区"。
2. `sidebar.search` → "搜索"，`shortcuts.search.focusPanel` → "打开搜索面板"，`shortcuts.explorer.findFiles` → "查找文件"。

**涉及文件**：
- `src/i18n/locales/zh.json`

**验证步骤**：
- `pnpm check-types` 通过。
- `grep -c '"searchPanel"' src/i18n/locales/zh.json` ≥ 1 且键集合与 en.json 严格相等（用 jq 或脚本对比）。

**Commit message 草案**：
```
feat(i18n/zh): add searchPanel.* + sidebar.search + shortcut labels
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 6.3 — 前端静态检查

**目标**：`pnpm lint` / `pnpm check-types` / `pnpm test` 全绿。

**操作步骤**：
1. `pnpm lint`。
2. `pnpm check-types`。
3. `pnpm test`（含新写的所有 .test.ts 文件）。

**验证步骤**：三条命令返回 0。

**Commit message 草案**：
```
chore(search): lint + typecheck + tests green

Required by TERAX.md quality bar. No source change in this commit
unless the above surfaced a real issue — split fix commits first.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 6.4 — 手动跑通验收场景 1-15

**目标**：手动 smoke 全部 15 条验收场景（proposal.md + Design Doc §11）。

**操作步骤**：
1. 启动应用（开发模式或打包后的 build）。
2. 逐条跑：
   1. `Cmd/Ctrl+Shift+F` 打开 Search 面板 + 焦点在输入框。
   2. Search 是顶级 sidebar view。
   3. 输入 `TODO` → 按文件分组 + 折叠 + 行内高亮。
   4. Regex + `[A-Z]+` → 正则生效。
   5. Case Sensitive + `error` → 不匹配 `ERROR`。
   6. Whole Word + `test` → 不匹配 `testing`。
   7. include `*.ts` → 只搜 .ts。
   8. exclude `node_modules/**` → 跳过 node_modules。
   9. 触发 20000+ 命中 → 显示 "已截断"。
   10. Replace All → 显示文件清单 + 一次性写回。
   11. 改 secret-path → 前端 deny-list 拒绝（写不到 ~/.ssh/id_rsa）。
   12. Command Palette `#` 模式连续输入不卡顿（generation 取消生效）。
   13. 切 Search / Explorer tab → 输入与结果不丢。
   14. `Cmd/Ctrl+Shift+F` 在任意焦点下打开 Search 面板 + 聚焦输入框。
   15. `Cmd/Ctrl+Shift+K` 打开 Explorer 文件名搜索。
3. 任何一条失败 → 回对应 Task 修，**不允许**在这一步改源代码绕过。

**验证步骤**：15 条全部勾选，无 fail。

**Commit message 草案**：
```
docs: walk through 15 acceptance scenarios for vscode-style content search

All scenarios from proposal.md + Design Doc §11 manually verified.
No code change in this commit; this is the human sign-off.
```

archived-with: 2026-08-14-vscode-style-content-search
---

### Task 6.5 — Rust 端最终回归

**目标**：所有 Task 完成后重跑 Rust 全套。

**操作步骤**：
1. `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings`。
2. `cd src-tauri && cargo nextest run --locked`。

**验证步骤**：两条命令返回 0；测试数 ≥ 原 baseline + 新加的测试数。

**Commit message 草案**：
```
chore: rust clippy + nextest green after vscode-style content search
```

archived-with: 2026-08-14-vscode-style-content-search
---

## 3. 关键文件清单

后端：
- `src-tauri/src/modules/fs/grep.rs`（核心改动）
- `src-tauri/src/modules/fs/file.rs`（write_atomic 可见性，可能）
- `src-tauri/src/lib.rs`（IPC 注册）

前端新模块：
- `src/modules/search/index.ts`
- `src/modules/search/SearchPanel.tsx`
- `src/modules/search/SearchInput.tsx`
- `src/modules/search/SearchResults.tsx`
- `src/modules/search/ReplaceAffectedBar.tsx`
- `src/modules/search/hooks/useSearchRun.ts` (+ `.test.ts`)
- `src/modules/search/hooks/useReplaceRun.ts` (+ `.test.ts`)
- `src/modules/search/lib/api.ts`
- `src/modules/search/lib/types.ts`
- `src/modules/search/lib/mode.ts` (+ `.test.ts`)
- `src/modules/search/lib/highlight.ts` (+ `.test.ts`)

前端改动模块：
- `src/modules/sidebar/types.ts`
- `src/modules/sidebar/useSidebarPanel.ts`
- `src/modules/sidebar/SidebarRail.tsx`
- `src/modules/shortcuts/shortcuts.ts`
- `src/modules/shortcuts/lib/useGlobalShortcuts.ts`
- `src/modules/command-palette/commands.ts`
- `src/modules/command-palette/CommandPalette.tsx`
- `src/modules/explorer/FileExplorer.tsx`
- `src/app/App.tsx`
- `src/i18n/locales/en.json`
- `src/i18n/locales/zh.json`

archived-with: 2026-08-14-vscode-style-content-search
---

## 4. 测试覆盖总结

后端新增单测（grep.rs）：
- `build_matcher_escapes_literal_whole_word_off`
- `build_matcher_wraps_whole_word_when_literal`
- `build_matcher_passes_regex_through_unchanged`
- `build_matcher_case_sensitive_overrides_smart_case_for_regex`
- `fs_search_content_respects_include_glob`
- `fs_search_content_respects_exclude_glob`
- `fs_search_content_generation_self_cancels`
- `fs_search_content_whole_word_literal_excludes_partial_match`
- `fs_replace_all_partial_failure_continues_remaining_files`
- `fs_replace_all_skips_binary_files`
- `fs_replace_all_respects_exclude_glob`
- `fs_replace_all_zero_match_returns_empty_files_changed`
- `fs_replace_all_first_match_per_line_only`
- `fs_replace_all_reports_per_file_replacement_counts`
- `fs_replace_all_does_not_block_secret_paths_server_side`
- `HARD_MAX_RESULTS_constant_is_20000`

前端新增单测：
- `src/modules/search/lib/mode.test.ts`
- `src/modules/search/lib/highlight.test.ts`
- `src/modules/search/hooks/useSearchRun.test.ts`
- `src/modules/search/hooks/useReplaceRun.test.ts`

archived-with: 2026-08-14-vscode-style-content-search
---

## 5. 风险与回退点

| 风险 | 触发 Task | 回退方案 |
|---|---|---|
| `HARD_MAX_RESULTS` 提升影响其它调用者 | Task 1.2 | const 不改，回到 2000；`fs_search_content` 自己 `clamp(1, 20000)` |
| SearchPanel 状态 hoist 改动太大 | Task 5.5 | 接受 mount/unmount，状态在 SearchPanel 内部，每次重搜 |
| 快捷键改名破坏用户自定义 | Task 5.6 | 在 changelog 提示；旧 id 仍接受（向后兼容的 alias） |
| `WalkBuilder::filter_entry` 改造影响 `fs_grep` | Task 1.4 | `search_tree` 接受可选 `Box<dyn Fn(&DirEntry) -> bool>`，现有调用方传 `&|_| true` |
| 前端 deny-list race（搜索结果路径与 replace 时路径不一致） | Task 4.2 | replace 时再调一次 `checkWritableCanonical`，多一层防御 |

archived-with: 2026-08-14-vscode-style-content-search
---

## 6. 不在计划范围内

- build_mode / isolation / tdd_mode / review_mode 选择（comet-build 阶段决策）。
- 单元测试之外的端到端自动化测试（项目目前以 Rust 单测 + 手动 smoke 为主）。
- 跨工作区全局搜索（proposal 已声明为非目标）。
- ripgrep 外部依赖（proposal 已声明为非目标）。
- 修改 `fs_grep` / `fs_grep_interactive` 现有签名（proposal 已声明为非目标）。
- 内容索引（每次输入走文件树）。
- 自动更新 changelog 文案。

archived-with: 2026-08-14-vscode-style-content-search
---

## 7. 计划结束条件（comet-build 可继续）

- `openspec/changes/vscode-style-content-search/tasks.md` 所有项已勾选。
- 所有 commit message 与本计划草案一致（或在 PR 中有解释偏离）。
- 前端 + 后端静态检查与测试全绿。
- 15 条验收场景全部手动通过。
- 未在本计划中的源代码改动需经用户批准。
