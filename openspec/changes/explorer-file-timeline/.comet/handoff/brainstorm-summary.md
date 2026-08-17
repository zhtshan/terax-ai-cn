# Brainstorm Summary

- Change: explorer-file-timeline
- Date: 2026-08-17

## 确认的技术方案

### 后端
- 新增独立 `git_log_file` Tauri 命令，签名 `log_file(registry, repo_root, file_path, limit, before_sha, workspace)`，复用 `resolve_within_repo` + `pathspec` 路径校验
- CLI: `git log --follow --shortstat --max-count=N --format=<FMT> -- <rel_path>`
- 复用 `GitLogEntry` 类型，新增可选 `oldPath` 字段（仅 `git_log_file` 填充）
- 分页游标复用 `before_sha` 模式

### 前端
- 方案 A: TimelineSection 内部自包含（状态管理、数据获取、分页都在组件内）
- repoRoot: TimelineSection 内部调用 `native.gitRepoRoot(filePath)` 解析（选项 2）
- 点击提交: 调用 `openCommitFileDiffTab` 打开 git-commit-file Tab（与 GitHistoryPane 行为一致）
- 分页: IntersectionObserver 监听列表底部哨兵元素
- 新增 `formatRelativeTime(unixSecs)` 纯函数到 `git-history/lib/relativeTime.ts`

## 关键取舍与风险

- `--follow` 在重命名历史上需要额外字段支持 → 后端返回 `oldPath` 解决
- `GitDiffResult` 是整个提交的 diff → 不使用它，改用 `openCommitFileDiffTab` 走现有 per-file diff 管线
- 相对时间格式化无现有可复用函数 → 新建轻量纯函数

## 测试策略

- `relativeTime.ts` 纯函数单元测试
- `operations::log_file` 单元测试：普通文件、重命名文件、空仓库、路径穿越拒绝
- 手动端到端测试：重命名文件的 `--follow` 跟踪

## Spec Patch

无（现有 spec.md 已覆盖所有验收场景）
