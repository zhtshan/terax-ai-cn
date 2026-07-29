# Subagent Progress Ledger

- Change: vscode-style-content-search
- Build mode: subagent-driven-development
- TDD mode: tdd
- Review mode: standard
- Base ref: 7b431b02c018c558ba47ce0db536cb52fd5b7224
- Branch: feature/20260729/vscode-style-content-search

## Current task

- Phase: implementing
- Plan task: P3 Task 3.4 — src/modules/search/lib/highlight.ts
- OpenSpec task: （plan 中无对应 OpenSpec 行；P3 是前端细节）

## Completed tasks

- ✅ Tasks 1.1–1.9 (P1 后端契约 + 单测 + clippy)
- ✅ Task 2.1 — IPC handlers registered (commit b5329b6)
- ✅ Task 3.1 — TS types (commit 0a4e382)
- ✅ Task 3.2 — api.ts invoke wrappers (commit df27df8)
- ✅ Task 3.3 — mode.ts (commit ead6f89)

## Pre-flight notes

- Plan Task 1.7 must implement "锁定后端不重复 deny-list"——明确传给 implementer，不要写成"后端拒绝"测试
- Plan Task 4.6 + 5.5：SearchPanel 先写"内部 state"，Task 5.5 重构为"受控 props"——在 Task 5.5 dispatch 时明确告知 implementer 是重构关系
- Plan Task 5.6 commands.ts markdown 漏了一个反引号（行 899），不影响 implementer
- Environment notes: package name is `terax` (not `terax-tauri`); cargo-nextest not installed → use `cargo test --locked` as fallback per TERAX.md "local fallback" note
- **TDD skill 不需要加载**：TDD 是红→绿→重构方法论，按 inline instructions 执行即可。dispatch 里说明"不要尝试加载 test-driven-development skill，按下面的步骤执行"。之前 implementer 误读 subagent-dispatch.md §3 把 skill 不可用判为 BLOCKED——这是错误防御，不是真 blocker。

## Tooling gotchas

- task-checkoff script matches `- [ ] text` / `- [x] text` (with leading spaces); added checkbox index block to plan §2 for the contract
- cwd: bash sessions don't auto-reset cwd; always `cd /Users/startiasoft/work/terax-ai-cn` first