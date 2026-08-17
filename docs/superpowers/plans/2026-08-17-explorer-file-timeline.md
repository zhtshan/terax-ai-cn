---
change: explorer-file-timeline
design-doc: docs/superpowers/specs/2026-08-17-explorer-file-timeline-design.md
base-ref: 3bc49f3f603a1b68be6cc5d1b28efa5d6ddd8077
---

# Explorer File Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 侧栏时间线区块接入真实 Git 提交历史：展示当前激活文件的提交列表，支持跟随文件切换、分页加载、点击查看 diff。

**Architecture:** 后端新增 `git_log_file` Tauri 命令（复用 `log` 解析器并追加 `--follow --name-status`），`GitLogEntry` 增加 `old_path` 字段（默认 None，零影响现有消费者）。前端 `TimelineSection` 重写：按 `activeFilePath` 切换时调 `native.gitLogFile`、IntersectionObserver 触发分页、点击条目调 `openCommitFileDiffTab`。

**Tech Stack:** Rust（git operations/commands/types） / TypeScript + React 19（TimelineSection、native.ts）/ Vitest + Testing Library（前端测试）/ Rust nextest（后端测试）

**Spec:** `openspec/changes/explorer-file-timeline/specs/explorer-file-timeline/spec.md`、Design Doc `docs/superpowers/specs/2026-08-17-explorer-file-timeline-design.md`、Tasks `openspec/changes/explorer-file-timeline/tasks.md`

## Global Constraints

- 包管理: **pnpm**（必须）
- Tauri 2 + Rust 后端，React 19 + TS 前端，路径别名 `@/...`
- 跨平台路径: 使用 `.split(/[\\/]/)`，避免直接 `.split("/")`
- 安全: 路径穿越（`../../etc/passwd`）必须被 `resolve_within_repo` 拒绝
- 提交 SHA 校验: `sha_is_safe` 拒绝非 16 进制字符
- i18n: 所有用户可见字符串必须经过 i18n（zh.json + en.json）
- Tailwind v4、Biome（lint + format）、TypeScript 严格模式（无 `any`）
- 注释: 默认无；需要时只写 WHY（不写 WHAT）
- 提交信息: 中文，遵循现有 feat/fix/chore 风格
- 现有 `git_log` 命令行为零变化（`old_path` 默认 `None`）

## File Structure

| 路径 | 变更类型 | 职责 |
|------|----------|------|
| `src-tauri/src/modules/git/types.rs` | 修改 | 给 `GitLogEntry` 增加 `old_path: Option<String>` |
| `src-tauri/src/modules/git/operations.rs` | 修改 | 新增 `pub fn log_file(...)` + 单元测试 |
| `src-tauri/src/modules/git/commands.rs` | 修改 | 新增 `#[tauri::command] git_log_file` |
| `src-tauri/tests/git_operations.rs` | 修改 | 集成测试 `log_file` 各场景 |
| `src/modules/ai/lib/native.ts` | 修改 | 给 `GitLogEntry` 增加 `oldPath: string \| null`；新增 `gitLogFile` 绑定 |
| `src/modules/git-history/lib/relativeTime.ts` | 新建 | `formatRelativeTime(unixSecs)` 中文时间格式 |
| `src/modules/git-history/lib/relativeTime.test.ts` | 新建 | 单元测试 |
| `src/modules/explorer/TimelineSection.tsx` | 重写 | 数据获取、列表、分页、点击 |
| `src/modules/explorer/TimelineSection.test.tsx` | 新建 | 组件测试 |
| `src/modules/explorer/FileExplorer.tsx` | 修改 | 增加 `onOpenCommitFile` prop 透传给 `TimelineSection` |
| `src/app/App.tsx` | 修改 | 将 `openCommitFileDiffTab` 传给 `FileExplorer`（若尚未透传） |
| `src/i18n/locales/zh.json` + `en.json` | 修改 | 新增 `explorer.timeline.*` 键 |

---

## Task 1: 后端 `GitLogEntry` 增加 `old_path` 字段

**Files:**
- Modify: `src-tauri/src/modules/git/types.rs:95-108`

**Interfaces:**
- Consumes: （无）
- Produces: `GitLogEntry.old_path: Option<String>`（序列化字段名 `oldPath`）

- [x] **Step 1: 修改 `GitLogEntry` 结构体**

在 `src-tauri/src/modules/git/types.rs` 中给 `GitLogEntry` 增加字段：

```rust
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitLogEntry {
    pub sha: String,
    pub short_sha: String,
    pub author: String,
    pub author_email: String,
    pub timestamp_secs: i64,
    pub parents: Vec<String>,
    pub subject: String,
    pub files_changed: u32,
    pub insertions: u32,
    pub deletions: u32,
    pub old_path: Option<String>,  // 仅 git_log_file 填充；git_log 恒为 None
}
```

- [x] **Step 2: 编译验证**

Run: `cd /Users/startiasoft/work/terax-ai-cn/src-tauri && cargo check --locked`
Expected: 编译失败（`operations::log` 构造 `GitLogEntry` 未提供 `old_path`）。

- [x] **Step 3: 修复 `operations::log` 调用点**

在 `src-tauri/src/modules/git/operations.rs` 的 `log` 函数（行 557-568）补 `old_path: None`：

```rust
entries.push(GitLogEntry {
    sha,
    short_sha,
    author,
    author_email,
    timestamp_secs: timestamp,
    parents,
    subject,
    files_changed: 0,
    insertions: 0,
    deletions: 0,
    old_path: None,
});
```

- [x] **Step 4: 重新编译**

Run: `cd /Users/startiasoft/work/terax-ai-cn/src-tauri && cargo check --locked`
Expected: 成功，无 warning。

- [x] **Step 5: Commit**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add src-tauri/src/modules/git/types.rs src-tauri/src/modules/git/operations.rs && git commit -m "feat(git): GitLogEntry 增加 old_path 可选字段"
```

---

## Task 2: 后端 `operations::log_file` 实现（含 rename 解析）

**Files:**
- Modify: `src-tauri/src/modules/git/operations.rs`（新增 `log_file` 函数及私有解析辅助）
- Test: `src-tauri/tests/git_operations.rs`（新增集成测试）

**Interfaces:**
- Consumes: `WorkspaceRegistry`、`WorkspaceEnv`、`GitLogEntry`
- Produces: `pub fn log_file(registry, repo_root, file_path, limit, before_sha, workspace) -> Result<Vec<GitLogEntry>>`

- [x] **Step 1: 写失败用例（普通文件）**

在 `src-tauri/tests/git_operations.rs` 末尾追加：

```rust
#[test]
fn log_file_returns_commits_for_tracked_file() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("seed.txt", "seed\n");
    fx.run_git(&["add", "seed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "seed"]);

    let entries = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "seed.txt",
        30,
        None,
        &fx.workspace,
    )
    .expect("log_file");
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].subject, "seed");
    assert_eq!(entries[0].old_path, None);
}
```

- [x] **Step 2: 运行确认失败**

Run: `cd /Users/startiasoft/work/terax-ai-cn/src-tauri && cargo nextest run --locked log_file_returns_commits_for_tracked_file`
Expected: 编译错误（`log_file` 不存在）。

- [x] **Step 3: 实现 `log_file` 函数**

在 `src-tauri/src/modules/git/operations.rs` 中，在 `log` 函数之前新增：

```rust
pub fn log_file(
    registry: &WorkspaceRegistry,
    repo_root: &str,
    file_path: &str,
    limit: u32,
    before_sha: Option<&str>,
    workspace: &WorkspaceEnv,
) -> Result<Vec<GitLogEntry>> {
    let repo_root = authorized_repo_root(registry, repo_root, workspace)?;
    ensure_git_available(&repo_root.workspace)?;
    let bounded = limit.clamp(1, MAX_LOG_LIMIT);
    let count_arg = format!("--max-count={bounded}");
    let format_arg = format!("--format={LOG_FORMAT}");
    let cursor = match before_sha {
        Some(sha) if !sha.is_empty() => {
            if !sha_is_safe(sha) {
                return Err(GitError::command("git log", "invalid cursor sha"));
            }
            Some(format!("{sha}^"))
        }
        _ => None,
    };
    let rel_path = {
        let worktree_path = resolve_within_repo(&repo_root.local_path, file_path)?;
        pathspec(&repo_root.local_path, &worktree_path)
    };
    let mut args: Vec<&OsStr> = vec![
        OsStr::new("log"),
        OsStr::new("--no-color"),
        OsStr::new("--shortstat"),
        OsStr::new("--follow"),
        OsStr::new("--name-status"),
        OsStr::new(&count_arg),
        OsStr::new(&format_arg),
        OsStr::new("--"),
        OsStr::new(&rel_path),
    ];
    if let Some(spec) = cursor.as_deref() {
        // 插入到 `--` 之前，让游标语义与 `log` 一致
        let cursor_pos = args.len() - 2;
        args.insert(cursor_pos, OsStr::new(spec));
    }
    let output = run_git(
        &repo_root.workspace,
        Some(&repo_root.git_path),
        args,
        DEFAULT_TIMEOUT_SECS,
    )?;
    if output.timed_out {
        return Err(GitError::TimedOut("git log"));
    }
    if output.exit_code != Some(0) {
        let stderr = String::from_utf8_lossy(&output.stderr).to_ascii_lowercase();
        if stderr.contains("does not have any commits yet")
            || stderr.contains("bad default revision")
            || stderr.contains("unknown revision")
            || stderr.contains("ambiguous argument 'head'")
        {
            return Ok(Vec::new());
        }
        // 文件不在 HEAD 中（未跟踪且无历史）也视为空历史
        if stderr.contains("pathspec") && stderr.contains("did not match") {
            return Ok(Vec::new());
        }
        return ensure_success(&output, "git log failed").map(|_| Vec::new());
    }
    let stdout = std::str::from_utf8(&output.stdout).unwrap_or("");
    parse_log_file_output(stdout)
}
```

并在文件末尾（`log` 函数附近或新增私有函数块）添加解析逻辑。复用 `log` 的解析骨架，扩展出对 `R100\told\tnew` 的处理：

```rust
fn parse_log_file_output(stdout: &str) -> Result<Vec<GitLogEntry>> {
    let mut entries: Vec<GitLogEntry> = Vec::new();
    for raw_line in stdout.lines() {
        let line = raw_line.trim_end_matches('\r');
        if line.is_empty() {
            continue;
        }
        if line.contains('\x1f') {
            let mut fields = line.splitn(6, '\x1f');
            let sha = fields.next().unwrap_or("").to_string();
            if !sha_is_safe(&sha) {
                continue;
            }
            let author = fields.next().unwrap_or("").to_string();
            let author_email = fields.next().unwrap_or("").to_string();
            let timestamp = fields.next().unwrap_or("0").parse::<i64>().unwrap_or(0);
            let parents_raw = fields.next().unwrap_or("");
            let parents: Vec<String> = parents_raw
                .split_ascii_whitespace()
                .map(|s| s.to_string())
                .collect();
            let subject = fields.next().unwrap_or("").to_string();
            let short_sha = sha.chars().take(7).collect::<String>();
            entries.push(GitLogEntry {
                sha,
                short_sha,
                author,
                author_email,
                timestamp_secs: timestamp,
                parents,
                subject,
                files_changed: 0,
                insertions: 0,
                deletions: 0,
                old_path: None,
            });
            continue;
        }
        if let Some(current) = entries.last_mut() {
            if line.contains("file changed") || line.contains("files changed") {
                let (files, ins, del) = parse_shortstat(line);
                current.files_changed = files;
                current.insertions = ins;
                current.deletions = del;
                continue;
            }
            // --name-status 行：R<num>\t<old>\t<new> 或 M\t<path> 等
            if let Some((status_part, rest)) = line.split_once('\t') {
                let status_char = status_part.chars().next().unwrap_or(' ');
                if status_char == 'R' {
                    if let Some((old, _new)) = rest.split_once('\t') {
                        current.old_path = Some(old.to_string());
                    }
                }
            }
        }
    }
    Ok(entries)
}
```

- [x] **Step 4: 运行测试确认通过**

Run: `cd /Users/startiasoft/work/terax-ai-cn/src-tauri && cargo nextest run --locked log_file_returns_commits_for_tracked_file`
Expected: PASS

- [x] **Step 5: 追加 rename 用例**

在 `git_operations.rs` 末尾新增：

```rust
#[test]
fn log_file_follows_renames_and_populates_old_path() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("alpha.txt", "a\n");
    fx.run_git(&["add", "alpha.txt"]);
    fx.run_git(&["commit", "-q", "-m", "create alpha"]);
    fx.run_git(&["mv", "alpha.txt", "beta.txt"]);
    fx.run_git(&["commit", "-q", "-m", "rename to beta"]);
    fx.write_file("beta.txt", "b\n");
    fx.run_git(&["commit", "-aq", "-m", "update beta"]);

    let entries = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "beta.txt",
        30,
        None,
        &fx.workspace,
    )
    .expect("log_file");
    assert!(entries.len() >= 3, "应至少 3 条记录");

    // 最新一条（update beta）不是 rename，old_path = None
    assert!(entries[0].old_path.is_none());

    // rename 那条 old_path = "alpha.txt"
    let rename_entry = entries
        .iter()
        .find(|e| e.subject == "rename to beta")
        .expect("应能找到 rename 记录");
    assert_eq!(rename_entry.old_path.as_deref(), Some("alpha.txt"));
}

#[test]
fn log_file_paginates_with_before_sha() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("seed.txt", "v0\n");
    fx.run_git(&["add", "seed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "v0"]);
    for i in 1..=5 {
        fx.write_file("seed.txt", &format!("v{i}\n"));
        fx.run_git(&["commit", "-aq", "-m", &format!("v{i}")]);
    }

    let first_page = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "seed.txt",
        3,
        None,
        &fx.workspace,
    )
    .expect("first page");
    assert_eq!(first_page.len(), 3);
    let cursor = first_page.last().unwrap().sha.clone();

    let second_page = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "seed.txt",
        3,
        Some(&cursor),
        &fx.workspace,
    )
    .expect("second page");
    assert_eq!(second_page.len(), 3);
    assert_ne!(second_page[0].sha, first_page[0].sha);
    // 游标之前的提交不应出现在第二页
    assert!(!first_page.iter().any(|e| second_page.iter().any(|n| n.sha == e.sha)));
}

#[test]
fn log_file_rejects_path_traversal() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("seed.txt", "x\n");
    fx.run_git(&["add", "seed.txt"]);
    fx.run_git(&["commit", "-q", "-m", "x"]);

    let result = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "../../etc/passwd",
        30,
        None,
        &fx.workspace,
    );
    assert!(matches!(
        result,
        Err(GitError::InvalidPath(_)) | Err(GitError::PathOutsideWorkspace(_))
    ));
}

#[test]
fn log_file_returns_empty_for_untracked_file() {
    if skip_if_no_git() {
        return;
    }
    let fx = GitRepoFixture::new();
    fx.write_file("untracked.txt", "x\n");
    // 不 add / 不 commit
    let entries = operations::log_file(
        &fx.registry,
        &fx.repo_str(),
        "untracked.txt",
        30,
        None,
        &fx.workspace,
    )
    .expect("log_file");
    assert!(entries.is_empty());
}
```

- [x] **Step 6: 跑全部新用例**

Run: `cd /Users/startiasoft/work/terax-ai-cn/src-tauri && cargo nextest run --locked log_file_`
Expected: 全部 PASS（5 个用例）。

- [x] **Step 7: Lint 与完整测试**

Run: `cd /Users/startiasoft/work/terax-ai-cn/src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`
Expected: 无 clippy warning；既有测试无回归。

- [x] **Step 8: Commit**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add src-tauri/src/modules/git/operations.rs src-tauri/tests/git_operations.rs && git commit -m "feat(git): operations::log_file 支持单文件 follow + name-status"
```

---

## Task 3: 后端 `commands::git_log_file` Tauri 命令

**Files:**
- Modify: `src-tauri/src/modules/git/commands.rs`

**Interfaces:**
- Consumes: `operations::log_file`
- Produces: `pub async fn git_log_file(repo_root, file_path, limit, before_sha, workspace, app) -> Result<Vec<GitLogEntry>, String>`

- [x] **Step 1: 新增 `git_log_file` 命令**

在 `src-tauri/src/modules/git/commands.rs` 的 `git_log` 之后追加：

```rust
#[tauri::command]
pub async fn git_log_file(
    repo_root: String,
    file_path: String,
    limit: Option<u32>,
    before_sha: Option<String>,
    workspace: Option<WorkspaceEnv>,
    app: AppHandle,
) -> Result<Vec<GitLogEntry>, String> {
    let workspace = WorkspaceEnv::from_option(workspace);
    blocking(app, move |r| {
        operations::log_file(
            r,
            &repo_root,
            &file_path,
            limit.unwrap_or(30),
            before_sha.as_deref(),
            &workspace,
        )
        .map_err(Into::into)
    })
    .await
}
```

- [x] **Step 2: 注册命令**

查找 `tauri::generate_handler!` 宏所在文件（通常是 `src-tauri/src/main.rs` 或 `src-tauri/src/lib.rs`），将 `git_log_file` 加入命令列表。例如：

```rust
tauri::generate_handler![
    // ... existing commands
    git_log,
    git_log_file,
    // ...
]
```

- [x] **Step 3: 编译验证**

Run: `cd /Users/startiasoft/work/terax-ai-cn/src-tauri && cargo check --locked`
Expected: 成功。

- [x] **Step 4: Commit**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add src-tauri/src/modules/git/commands.rs src-tauri/src/main.rs src-tauri/src/lib.rs && git commit -m "feat(git): 新增 git_log_file Tauri 命令"
```

---

## Task 4: 前端 `native.ts` 扩展 `GitLogEntry` + `gitLogFile` 绑定

**Files:**
- Modify: `src/modules/ai/lib/native.ts`

**Interfaces:**
- Consumes: Tauri command `git_log_file`
- Produces: 类型 `GitLogEntry.oldPath: string | null`；绑定 `native.gitLogFile(repoRoot, filePath, options?)`

- [x] **Step 1: 扩展 `GitLogEntry` 类型**

在 `src/modules/ai/lib/native.ts` 第 94-105 行：

```ts
export type GitLogEntry = {
  sha: string;
  shortSha: string;
  author: string;
  authorEmail: string;
  timestampSecs: number;
  parents: string[];
  subject: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  oldPath: string | null;
};
```

- [x] **Step 2: 新增 `gitLogFile` 绑定**

在 `native.ts` 的 `gitLog` 绑定之后追加：

```ts
gitLogFile: (
  repoRoot: string,
  filePath: string,
  options?: { limit?: number; beforeSha?: string },
) =>
  invoke<GitLogEntry[]>("git_log_file", {
    repoRoot,
    filePath,
    limit: options?.limit ?? null,
    beforeSha: options?.beforeSha ?? null,
    workspace: currentWorkspaceEnv(),
  }),
```

- [x] **Step 3: 类型检查**

Run: `cd /Users/startiasoft/work/terax-ai-cn && pnpm check-types`
Expected: 通过（前端尚未引用 `oldPath`，但类型已就绪）。

- [x] **Step 4: Commit**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add src/modules/ai/lib/native.ts && git commit -m "feat(native): 暴露 gitLogFile 绑定与 oldPath 字段"
```

---

## Task 5: 前端 `formatRelativeTime` 工具函数

**Files:**
- Create: `src/modules/git-history/lib/relativeTime.ts`
- Create: `src/modules/git-history/lib/relativeTime.test.ts`

**Interfaces:**
- Consumes: `unixSecs: number`
- Produces: `function formatRelativeTime(unixSecs: number, now?: number): string`

- [x] **Step 1: 写失败测试**

新建 `src/modules/git-history/lib/relativeTime.test.ts`：

```ts
import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relativeTime";

describe("formatRelativeTime", () => {
  const NOW = 1_700_000_000; // 2023-11-14T22:13:20Z
  const secs = (delta: number) => NOW - delta;

  it("returns 刚刚 within 60 seconds", () => {
    expect(formatRelativeTime(secs(10), NOW)).toBe("刚刚");
    expect(formatRelativeTime(secs(59), NOW)).toBe("刚刚");
  });

  it("returns N分钟前 under 1 hour", () => {
    expect(formatRelativeTime(secs(60), NOW)).toBe("1分钟前");
    expect(formatRelativeTime(secs(60 * 30), NOW)).toBe("30分钟前");
    expect(formatRelativeTime(secs(60 * 59 + 59), NOW)).toBe("59分钟前");
  });

  it("returns N小时前 under 24 hours", () => {
    expect(formatRelativeTime(secs(60 * 60), NOW)).toBe("1小时前");
    expect(formatRelativeTime(secs(60 * 60 * 5), NOW)).toBe("5小时前");
  });

  it("returns N天前 under 7 days", () => {
    expect(formatRelativeTime(secs(60 * 60 * 24), NOW)).toBe("1天前");
    expect(formatRelativeTime(secs(60 * 60 * 24 * 6 + 3599), NOW)).toBe("6天前");
  });

  it("returns M月D日 within same year", () => {
    // 30 天前但仍在 2023 年（NOW = 2023-11-14）
    const ts = secs(60 * 60 * 24 * 30);
    expect(formatRelativeTime(ts, NOW)).toBe("10月15日");
  });

  it("returns YYYY年M月D日 for older than current year", () => {
    // 假设 NOW 是 2023，2022 年同一天
    const ts = secs(60 * 60 * 24 * 365);
    expect(formatRelativeTime(ts, NOW)).toMatch(/^2022年\d{1,2}月\d{1,2}日$/);
  });

  it("accepts missing now and falls back to Date.now()", () => {
    const before = Math.floor(Date.now() / 1000) - 5;
    expect(formatRelativeTime(before)).toBe("刚刚");
  });
});
```

- [x] **Step 2: 运行确认失败**

Run: `cd /Users/startiasoft/work/terax-ai-cn && pnpm test src/modules/git-history/lib/relativeTime.test.ts`
Expected: 失败（模块不存在）。

- [x] **Step 3: 实现 `formatRelativeTime`**

新建 `src/modules/git-history/lib/relativeTime.ts`：

```ts
const SECONDS_IN_MIN = 60;
const SECONDS_IN_HOUR = 60 * 60;
const SECONDS_IN_DAY = 60 * 60 * 24;
const DAYS_THRESHOLD = 7;

export function formatRelativeTime(unixSecs: number, now?: number): string {
  const reference = now ?? Math.floor(Date.now() / 1000);
  const delta = reference - unixSecs;
  if (delta < SECONDS_IN_MIN) {
    return "刚刚";
  }
  if (delta < SECONDS_IN_HOUR) {
    return `${Math.floor(delta / SECONDS_IN_MIN)}分钟前`;
  }
  if (delta < SECONDS_IN_DAY) {
    return `${Math.floor(delta / SECONDS_IN_HOUR)}小时前`;
  }
  if (delta < SECONDS_IN_DAY * DAYS_THRESHOLD) {
    return `${Math.floor(delta / SECONDS_IN_DAY)}天前`;
  }
  const date = new Date(unixSecs * 1000);
  const refDate = new Date(reference * 1000);
  const sameYear = date.getFullYear() === refDate.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (sameYear) {
    return `${month}月${day}日`;
  }
  return `${date.getFullYear()}年${month}月${day}日`;
}
```

- [x] **Step 4: 重新运行测试**

Run: `cd /Users/startiasoft/work/terax-ai-cn && pnpm test src/modules/git-history/lib/relativeTime.test.ts`
Expected: 全部 PASS。

- [x] **Step 5: Commit**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add src/modules/git-history/lib/relativeTime.ts src/modules/git-history/lib/relativeTime.test.ts && git commit -m "feat(git-history): 新增 formatRelativeTime 时间格式化工具"
```

---

## Task 6: 前端 `TimelineSection.tsx` 重写（基础：数据获取 + 列表展示）

**Files:**
- Modify: `src/modules/explorer/TimelineSection.tsx`（重写）
- Modify: `src/i18n/locales/zh.json`（新增键）
- Modify: `src/i18n/locales/en.json`（新增键）
- Create: `src/modules/explorer/TimelineSection.test.tsx`

**Interfaces:**
- Consumes: `native.gitLogFile`、`native.gitResolveRepo`、`formatRelativeTime`、`openCommitFileDiffTab`（来自 props）
- Produces: 组件 `TimelineSection({ collapsed, onToggle, activeFilePath, repoRoot, onOpenCommitFile })`

- [x] **Step 1: 新增 i18n 键**

在 `src/i18n/locales/zh.json` 的 `explorer` 段（约 704 行附近）追加：

```json
"timelineNoFile": "未选择文件",
"timelineEmpty": "暂无提交历史",
"timelineLoading": "加载中…",
"timelineLoadMore": "加载更早的提交",
"timelineLoadMoreFailed": "加载失败，点击重试",
"timelineOutsideRepo": "当前文件不在 Git 仓库内"
```

在 `src/i18n/locales/en.json` 对应位置追加：

```json
"timelineNoFile": "No file selected",
"timelineEmpty": "No commit history",
"timelineLoading": "Loading…",
"timelineLoadMore": "Load earlier commits",
"timelineLoadMoreFailed": "Failed to load — tap to retry",
"timelineOutsideRepo": "File is outside any Git repository"
```

- [x] **Step 2: 写失败组件测试**

新建 `src/modules/explorer/TimelineSection.test.tsx`（使用 `vitest` + `@testing-library/react`）：

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TimelineSection } from "./TimelineSection";

vi.mock("@/modules/ai/lib/native", () => ({
  native: {
    gitResolveRepo: vi.fn(),
    gitLogFile: vi.fn(),
  },
}));

import { native } from "@/modules/ai/lib/native";

const FIXED_TS = 1_700_000_000;

function makeEntry(over: Partial<{
  sha: string;
  subject: string;
  author: string;
  timestampSecs: number;
  oldPath: string | null;
}> = {}) {
  return {
    sha: "deadbeef1234567890abcdef",
    shortSha: "deadbee",
    author: "Alice",
    authorEmail: "alice@example.com",
    timestampSecs: FIXED_TS,
    parents: [],
    subject: "fix: timeline test",
    filesChanged: 1,
    insertions: 1,
    deletions: 0,
    oldPath: null,
    ...over,
  };
}

describe("TimelineSection", () => {
  it("shows no-file empty state when activeFilePath is null", () => {
    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath={null}
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );
    expect(screen.getByText("未选择文件")).toBeTruthy();
  });

  it("loads and renders commits when activeFilePath resolves to a repo", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
      repoRoot: "/r",
      branch: "main",
      upstream: null,
      isDetached: false,
    });
    (native.gitLogFile as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeEntry({ subject: "first commit" }),
      makeEntry({ sha: "beefcafebeefcafebeefcafe", shortSha: "beefcaf", subject: "second commit" }),
    ]);

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/r/foo.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("first commit")).toBeTruthy();
    });
    expect(screen.getByText("second commit")).toBeTruthy();
    expect(screen.getByText("deadbee")).toBeTruthy();
  });

  it("shows empty state when gitLogFile returns []", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
      repoRoot: "/r",
      branch: "main",
      upstream: null,
      isDetached: false,
    });
    (native.gitLogFile as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/r/new.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("暂无提交历史")).toBeTruthy();
    });
  });

  it("shows outside-repo message when gitResolveRepo returns null", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/tmp/loose.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("当前文件不在 Git 仓库内")).toBeTruthy();
    });
  });
});
```

- [x] **Step 3: 运行确认失败**

Run: `cd /Users/startiasoft/work/terax-ai-cn && pnpm test src/modules/explorer/TimelineSection.test.tsx`
Expected: 失败（组件签名不匹配 / 缺失状态）。

- [x] **Step 4: 重写 `TimelineSection.tsx`**

完整重写 `src/modules/explorer/TimelineSection.tsx`：

```tsx
import { Spinner } from "@/components/ui/spinner";
import { native, type GitLogEntry } from "@/modules/ai/lib/native";
import { formatRelativeTime } from "@/modules/git-history/lib/relativeTime";
import { cn } from "@/lib/utils";
import {
  Clock01Icon,
  GitBranchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SectionHeader } from "./SectionHeader";

const PAGE_SIZE = 30;

type CommitFileDiffOpenInput = {
  repoRoot: string;
  sha: string;
  shortSha: string;
  subject: string;
  path: string;
  originalPath: string | null;
};

type LoadStatus = "idle" | "loading" | "more" | "error" | "initial";

type Props = {
  collapsed: boolean;
  onToggle: () => void;
  activeFilePath?: string | null;
  repoRoot?: string | null;
  onOpenCommitFile: (input: CommitFileDiffOpenInput) => void;
};

export function TimelineSection({
  collapsed,
  onToggle,
  activeFilePath,
  repoRoot: providedRepoRoot,
  onOpenCommitFile,
}: Props) {
  const { t } = useTranslation();
  const [commits, setCommits] = useState<GitLogEntry[]>([]);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [endReached, setEndReached] = useState(false);
  const [resolvedRepoRoot, setResolvedRepoRoot] = useState<string | null>(
    providedRepoRoot ?? null,
  );

  const requestIdRef = useRef(0);
  const moreInflightRef = useRef(false);

  // activeFilePath 变化：重置 + 解析 repo root + 加载首页
  useEffect(() => {
    if (!activeFilePath) {
      setCommits([]);
      setStatus("idle");
      setError(null);
      setResolvedRepoRoot(null);
      return;
    }
    const requestId = ++requestIdRef.current;
    setCommits([]);
    setStatus("initial");
    setError(null);
    setEndReached(false);
    let cancelled = false;

    const resolveAndLoad = async () => {
      let root = providedRepoRoot ?? null;
      if (!root) {
        try {
          const info = await native.gitResolveRepo(activeFilePath);
          if (cancelled || requestId !== requestIdRef.current) return;
          root = info?.repoRoot ?? null;
        } catch (err) {
          if (cancelled || requestId !== requestIdRef.current) return;
          setStatus("error");
          setError(err instanceof Error ? err.message : String(err));
          return;
        }
      }
      setResolvedRepoRoot(root);
      if (!root) {
        setStatus("idle");
        return;
      }
      try {
        const entries = await native.gitLogFile(root, activeFilePath, {
          limit: PAGE_SIZE,
        });
        if (cancelled || requestId !== requestIdRef.current) return;
        setCommits(entries);
        setStatus("idle");
        if (entries.length < PAGE_SIZE) setEndReached(true);
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    };

    void resolveAndLoad();
    return () => {
      cancelled = true;
    };
  }, [activeFilePath, providedRepoRoot]);

  const loadMore = useCallback(async () => {
    if (!resolvedRepoRoot || !activeFilePath) return;
    if (moreInflightRef.current) return;
    if (status !== "idle" || endReached) return;
    const last = commits[commits.length - 1];
    if (!last) return;
    moreInflightRef.current = true;
    setStatus("more");
    try {
      const entries = await native.gitLogFile(resolvedRepoRoot, activeFilePath, {
        limit: PAGE_SIZE,
        beforeSha: last.sha,
      });
      setCommits((prev) => {
        const seen = new Set(prev.map((c) => c.sha));
        const merged = [...prev];
        for (const e of entries) if (!seen.has(e.sha)) merged.push(e);
        return merged;
      });
      if (entries.length < PAGE_SIZE) setEndReached(true);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    } finally {
      moreInflightRef.current = false;
    }
  }, [resolvedRepoRoot, activeFilePath, commits, endReached, status]);

  // 列表内容
  const listContent = useMemo(() => {
    if (!activeFilePath) {
      return (
        <div className="flex flex-1 items-center justify-center px-3 py-3 text-center text-[11px] text-muted-foreground">
          {t("explorer.timelineNoFile")}
        </div>
      );
    }
    if (status === "initial") {
      return (
        <div className="flex flex-1 items-center justify-center gap-2 px-3 py-3 text-[11px] text-muted-foreground">
          <Spinner size={12} />
          <span>{t("explorer.timelineLoading")}</span>
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="flex flex-1 items-center justify-center px-3 py-3 text-center text-[11px] text-destructive">
          {error ?? t("explorer.timelineLoadMoreFailed")}
        </div>
      );
    }
    if (!resolvedRepoRoot) {
      return (
        <div className="flex flex-1 items-center justify-center px-3 py-3 text-center text-[11px] text-muted-foreground">
          {t("explorer.timelineOutsideRepo")}
        </div>
      );
    }
    if (commits.length === 0) {
      return (
        <div className="flex flex-1 items-center justify-center px-3 py-3 text-center text-[11px] text-muted-foreground">
          {t("explorer.timelineEmpty")}
        </div>
      );
    }
    return (
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-border">
          {commits.map((c) => (
            <li key={c.sha}>
              <button
                type="button"
                onClick={() =>
                  onOpenCommitFile({
                    repoRoot: resolvedRepoRoot,
                    sha: c.sha,
                    shortSha: c.shortSha,
                    subject: c.subject,
                    path: activeFilePath,
                    originalPath: c.oldPath,
                  })
                }
                className="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left transition-colors hover:bg-accent/60"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <HugeiconsIcon
                    icon={GitBranchIcon}
                    size={11}
                    strokeWidth={2}
                  />
                  <span className="font-mono">{c.shortSha}</span>
                  <span className="flex-1 truncate text-foreground/80">
                    {c.subject}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate">{c.author}</span>
                  <span className="shrink-0">
                    {formatRelativeTime(c.timestampSecs)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
        <Sentinel
          endReached={endReached}
          moreStatus={status === "more"}
          onIntersect={loadMore}
        />
      </div>
    );
  }, [
    activeFilePath,
    status,
    error,
    resolvedRepoRoot,
    commits,
    endReached,
    onOpenCommitFile,
    loadMore,
    t,
  ]);

  return (
    <div className="flex h-full flex-col">
      <SectionHeader
        title={t("explorer.timeline")}
        collapsed={collapsed}
        onToggle={onToggle}
        icon={<HugeiconsIcon icon={Clock01Icon} size={12} strokeWidth={2} />}
      />
      {!collapsed && <div className="flex min-h-0 flex-1 flex-col">{listContent}</div>}
    </div>
  );
}

type SentinelProps = {
  endReached: boolean;
  moreStatus: boolean;
  onIntersect: () => void;
};

function Sentinel({ endReached, moreStatus, onIntersect }: SentinelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (endReached) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onIntersect();
      },
      { rootMargin: "120px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [endReached, onIntersect]);
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-center px-3 py-2 text-[10px] text-muted-foreground",
        endReached && "opacity-50",
      )}
    >
      {moreStatus ? (
        <span className="flex items-center gap-1.5">
          <Spinner size={10} />
          <span>…</span>
        </span>
      ) : endReached ? (
        <span>—</span>
      ) : (
        <span />
      )}
    </div>
  );
}
```

- [x] **Step 5: 运行测试**

Run: `cd /Users/startiasoft/work/terax-ai-cn && pnpm test src/modules/explorer/TimelineSection.test.tsx`
Expected: 4 个用例全部 PASS（点击 + 分页测试在下一任务补）。

- [x] **Step 6: Lint / 类型**

Run: `cd /Users/startiasoft/work/terax-ai-cn && pnpm lint && pnpm check-types`
Expected: 无错误。

- [x] **Step 7: Commit**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add src/modules/explorer/TimelineSection.tsx src/modules/explorer/TimelineSection.test.tsx src/i18n/locales/zh.json src/i18n/locales/en.json && git commit -m "feat(explorer): TimelineSection 接入 git_log_file 数据与渲染"
```

---

## Task 7: 前端 `TimelineSection` 分页测试 + 点击测试

**Files:**
- Modify: `src/modules/explorer/TimelineSection.test.tsx`

**Interfaces:**
- Consumes: 既有组件 API
- Produces: 分页与点击的回归用例

- [x] **Step 1: 写失败用例（分页 + 点击）**

在 `TimelineSection.test.tsx` 末尾追加：

```tsx
import { fireEvent } from "@testing-library/react";

describe("TimelineSection pagination & click", () => {
  it("triggers loadMore when sentinel intersects and appends entries", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
      repoRoot: "/r",
      branch: "main",
      upstream: null,
      isDetached: false,
    });
    const first = makeEntry({ sha: "1".repeat(40), shortSha: "1".repeat(7), subject: "first" });
    const second = makeEntry({ sha: "2".repeat(40), shortSha: "2".repeat(7), subject: "second" });
    (native.gitLogFile as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([second]);

    // IntersectionObserver 桩
    class IOStub {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    // @ts-expect-error -- 测试桩
    globalThis.IntersectionObserver = IOStub;
    // 主动触发：把 observe 的 element 存起来，手动触发 callback
    let capturedCb: ((entries: Array<{ isIntersecting: boolean }>) => void) | null = null;
    // @ts-expect-error -- 测试桩替换
    globalThis.IntersectionObserver = class {
      constructor(cb: (entries: Array<{ isIntersecting: boolean }>) => void) {
        capturedCb = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/r/foo.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => screen.getByText("first"));

    // 触发 IntersectionObserver
    capturedCb?.([{ isIntersecting: true }]);

    await waitFor(() => screen.getByText("second"));
    expect(native.gitLogFile).toHaveBeenCalledTimes(2);
    const lastCall = (native.gitLogFile as ReturnType<typeof vi.fn>).mock.lastCall;
    expect(lastCall?.[2]).toMatchObject({ beforeSha: "1".repeat(40) });
  });

  it("invokes onOpenCommitFile with originalPath when entry was a rename", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
      repoRoot: "/r",
      branch: "main",
      upstream: null,
      isDetached: false,
    });
    (native.gitLogFile as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeEntry({
        sha: "abc1234",
        shortSha: "abc1234",
        subject: "rename",
        oldPath: "old/path.txt",
      }),
    ]);

    const onOpen = vi.fn();
    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/r/foo.txt"
        repoRoot={null}
        onOpenCommitFile={onOpen}
      />,
    );

    await waitFor(() => screen.getByText("rename"));
    fireEvent.click(screen.getByText("rename"));

    expect(onOpen).toHaveBeenCalledWith({
      repoRoot: "/r",
      sha: "abc1234",
      shortSha: "abc1234",
      subject: "rename",
      path: "/r/foo.txt",
      originalPath: "old/path.txt",
    });
  });
});
```

- [x] **Step 2: 运行测试**

Run: `cd /Users/startiasoft/work/terax-ai-cn && pnpm test src/modules/explorer/TimelineSection.test.tsx`
Expected: 全部 PASS（含上一任务的 4 个 + 本任务的 2 个）。

- [x] **Step 3: Commit**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add src/modules/explorer/TimelineSection.test.tsx && git commit -m "test(explorer): TimelineSection 分页与点击回归用例"
```

---

## Task 8: 前端 `FileExplorer` + `App.tsx` 接入 `onOpenCommitFile`

**Files:**
- Modify: `src/modules/explorer/FileExplorer.tsx`
- Modify: `src/app/App.tsx`（如尚未透传）

**Interfaces:**
- Consumes: `openCommitFileDiffTab`（来自 `useTabs`）
- Produces: `FileExplorer` 新 prop `onOpenCommitFile`，透传给 `TimelineSection`

- [x] **Step 1: `FileExplorer.tsx` 接受并透传 prop**

在 `src/modules/explorer/FileExplorer.tsx` 的 `Props` 类型（行 21-31）中追加：

```ts
type Props = {
  rootPath: string | null;
  activeFilePath?: string | null;
  onOpenFile: (path: string, pin?: boolean) => void;
  onPathRenamed?: (from: string, to: string) => void;
  onPathDeleted?: (path: string) => void;
  onRevealInTerminal?: (path: string) => void;
  onAttachToAgent?: (path: string) => void;
  pathDropTarget?: TerminalPathDropTarget;
  gitStatus?: GitStatusSnapshot | null;
  onOpenCommitFile?: (input: {
    repoRoot: string;
    sha: string;
    shortSha: string;
    subject: string;
    path: string;
    originalPath: string | null;
  }) => void;
};
```

将 `TimelineSection` 的渲染处（行 100-104）改为：

```tsx
<TimelineSection
  collapsed={timeline.collapsed}
  onToggle={timeline.toggle}
  activeFilePath={props.activeFilePath}
  repoRoot={props.gitStatus?.repoRoot ?? null}
  onOpenCommitFile={props.onOpenCommitFile ?? (() => {})}
/>
```

> 注：当 `onOpenCommitFile` 未传入时，组件会拿到一个 no-op 兜底（避免 TimelineSection 在孤立测试环境外崩溃）。后续 Task 6 已要求组件签名包含该 prop。

- [x] **Step 2: 在 `App.tsx` 中传入**

定位 `src/app/App.tsx` 中 `<FileExplorer ... />` 的渲染处（行 1357 附近），添加：

```tsx
onOpenCommitFile={openCommitFileDiffTab}
```

如已有同名 prop，跳过本步。

- [x] **Step 3: 类型检查**

Run: `cd /Users/startiasoft/work/terax-ai-cn && pnpm check-types && pnpm lint`
Expected: 无错误。

- [x] **Step 4: Commit**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add src/modules/explorer/FileExplorer.tsx src/app/App.tsx && git commit -m "feat(explorer): FileExplorer 透传 onOpenCommitFile 到 TimelineSection"
```

---

## Task 9: 收尾验证

**Files:** 无新增（仅执行）

- [x] **Step 1: 前端 lint + 类型 + 测试**

Run:
```bash
cd /Users/startiasoft/work/terax-ai-cn && pnpm lint && pnpm check-types && pnpm test
```
Expected: 全部 PASS，无 warning。

- [x] **Step 2: 后端 clippy + 测试**

Run:
```bash
cd /Users/startiasoft/work/terax-ai-cn/src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked
```
Expected: clippy 无 warning；既有测试与新增测试全部 PASS。

- [x] **Step 3: 完整 CI 链路**

Run:
```bash
cd /Users/startiasoft/work/terax-ai-cn && pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked
```
Expected: 全部 PASS。

- [x] **Step 4: 走查 spec 场景**

打开一份真实仓库，验证：
1. 打开有历史的文件 → 时间线区块显示该文件的提交列表，最新在前
2. 切换文件 → 时间线自动刷新
3. 新建未提交文件 → 显示"暂无提交历史"
4. 滚到底部 → 加载更早的提交
5. 点击提交条目 → 打开对应 diff 标签页（含 rename 时 old_path 正确传入）

- [x] **Step 5: 最终提交（仅若有修复）**

```bash
cd /Users/startiasoft/work/terax-ai-cn && git status
```
若无修改则跳过；否则 commit：

```bash
cd /Users/startiasoft/work/terax-ai-cn && git add -A && git commit -m "chore: explorer-file-timeline 收尾修复"
```

---

## Self-Review Checklist

- [x] **Spec coverage**:
  - "显示当前激活文件的提交历史" → Task 6（数据获取 + 列表渲染）
  - "跟随编辑器活动文件切换" → Task 6（`useEffect([activeFilePath])` 重置 + 重新加载）
  - "无历史文件的空态" → Task 6（commits 空 → 显示"暂无提交历史"）
  - "分页加载更早的提交" → Task 6 + Task 7（`Sentinel` + IntersectionObserver）
  - "点击提交查看该文件的 diff" → Task 6（按钮 onClick）+ Task 8（prop 透传）
- [x] **Placeholder scan**: 计划中无 TBD / TODO / "implement later"；每个 Step 都给出具体代码或命令。
- [x] **Type consistency**: `GitLogEntry.old_path` ↔ `GitLogEntry.oldPath`；`openCommitFileDiffTab` 输入签名在 Task 8 与 useTabs.ts:843 一致（`repoRoot / sha / shortSha / subject / path / originalPath`）。
- [x] **SHA safety**: `log_file` 复用 `sha_is_safe`（Task 2），路径穿越经 `resolve_within_repo` 拒绝（Task 2 用例验证）。
- [x] **设计文档校准**:
  - 设计文档提及 `native.gitRepoRoot(filePath)`，但代码内仅有 `native.gitResolveRepo(cwd)`（native.ts:261），Task 6 已改用后者解析 repoRoot。
  - 设计文档示例使用 `HistoryIcon` / `CommitIcon` 图标，但这俩在 `@hugeicons/core-free-icons` 包内未被项目使用过（grep 无命中），Task 6 已改用项目实际在用的 `Clock01Icon` / `GitBranchIcon`。
  - `props.gitStatus?.repoRoot` 字段确认存在于 `native.ts:60` 的 `GitStatusSnapshot` 类型中。
  - `tauri::generate_handler!` 确认位于 `src-tauri/src/lib.rs:287` 附近（`git_log` 在第 287 行注册），新命令 `git_log_file` 应插在同位置。
