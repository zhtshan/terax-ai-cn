# Subagent Progress Ledger

- Change: vscode-style-content-search
- Build mode: subagent-driven-development
- TDD mode: tdd
- Review mode: standard
- Base ref: 7b431b02c018c558ba47ce0db536cb52fd5b7224
- Branch: feature/20260729/vscode-style-content-search

## Current task

- Phase: implementing
- Plan task: P1 Task 1.3 — 抽出公共 `build_matcher` helper
- OpenSpec task: 在 `grep.rs` 抽出公共 search helper（参数化 matcher + include glob + exclude glob + cancel）

## Completed tasks

- ✅ Task 1.1 — write_atomic visibility + grep.rs use (commit ab5c31e)
  - DONE_WITH_CONCERNS: package name is `terax` not `terax-tauri`; cargo-nextest not installed
- ✅ Task 1.2 — HARD_MAX_RESULTS 2000 → 20000 (commit e67134e)
  - DONE; clean TDD red/green
  - Note: test fn name auto-renamed to snake_case (`hard_max_results_constant_is_20000`) for clippy; commit body explains

## Pre-flight notes

- Plan Task 1.7 must implement "锁定后端不重复 deny-list"——明确传给 implementer，不要写成"后端拒绝"测试
- Plan Task 4.6 + 5.5：SearchPanel 先写"内部 state"，Task 5.5 重构为"受控 props"——在 Task 5.5 dispatch 时明确告知 implementer 是重构关系
- Plan Task 5.6 commands.ts markdown 漏了一个反引号（行 899），不影响 implementer
- TDD 模式要求每个 implementer 先红后绿；systematic-debugging 在失败时加载（提示加进 dispatch）
- Environment notes: package name is `terax` (not `terax-tauri`); cargo-nextest not installed → use `cargo test --locked` as fallback per TERAX.md "local fallback" note

## Tooling gotchas

- task-checkoff script matches `- [ ] text` / `- [x] text` (with leading spaces); added checkbox index block to plan §2 for the contract
- cwd: bash sessions don't auto-reset cwd; always `cd /Users/startiasoft/work/terax-ai-cn` first