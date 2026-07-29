# Subagent Progress Ledger

- Change: vscode-style-content-search
- Build mode: subagent-driven-development
- TDD mode: tdd
- Review mode: standard
- Base ref: 7b431b02c018c558ba47ce0db536cb52fd5b7224
- Branch: feature/20260729/vscode-style-content-search

## Current task

- Phase: implementing
- Plan task: P2 Task 2.1 — 在 src-tauri/src/lib.rs 注册两个新命令
- OpenSpec task: 在 `src-tauri/src/lib.rs` 注册两个新命令

## Completed tasks (P1 — 后端契约完成 ✅)

- ✅ Task 1.1 — write_atomic visibility + grep.rs use (commit ab5c31e)
- ✅ Task 1.2 — HARD_MAX_RESULTS 2000 → 20000 (commit e67134e)
- ✅ Task 1.3 — extract build_matcher helper (commit f29ddcc)
- ✅ Task 1.4 — fs_search_content IPC + search_tree exclude (commit 3957a5a)
- ✅ Task 1.5 — fs_replace_all IPC (commit 8d25baa) — DONE_WITH_CONCERNS
- ✅ Task 1.6 — whole_word integration tests (commit 11f7c97)
- ✅ Task 1.7 — deny-list contract lock (commit c9c7007)
- ✅ Task 1.8 — per-file replacement counts (commit 3f89e62) — already in 1.5
- ✅ Task 1.9 — clippy + full tests green (commit d44467a)
  - DONE_WITH_CONCERNS: implementer fixed 5 pre-existing clippy warnings (Option::as_slice + sort_by_key) as cleanup. Acceptable.

## Pre-flight notes

- Plan Task 1.7 must implement "锁定后端不重复 deny-list"——明确传给 implementer，不要写成"后端拒绝"测试
- Plan Task 4.6 + 5.5：SearchPanel 先写"内部 state"，Task 5.5 重构为"受控 props"——在 Task 5.5 dispatch 时明确告知 implementer 是重构关系
- Plan Task 5.6 commands.ts markdown 漏了一个反引号（行 899），不影响 implementer
- Environment notes: package name is `terax` (not `terax-tauri`); cargo-nextest not installed → use `cargo test --locked` as fallback per TERAX.md "local fallback" note
- **TDD skill 不需要加载**：TDD 是红→绿→重构方法论，按 inline instructions 执行即可。dispatch 里说明"不要尝试加载 test-driven-development skill，按下面的步骤执行"。之前 implementer 误读 subagent-dispatch.md §3 把 skill 不可用判为 BLOCKED——这是错误防御，不是真 blocker。

## Tooling gotchas

- task-checkoff script matches `- [ ] text` / `- [x] text` (with leading spaces); added checkbox index block to plan §2 for the contract
- cwd: bash sessions don't auto-reset cwd; always `cd /Users/startiasoft/work/terax-ai-cn` first