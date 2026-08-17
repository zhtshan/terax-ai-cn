## Context

见 proposal.md - Why。技术约束（已核实）：

- `operations::log`（`src-tauri/src/modules/git/operations.rs:476`）是仓库级日志：`git log --no-color --shortstat --max-count=N --format=<LOG_FORMAT> [<before_sha>^]`，鉴权用 `authorized_repo_root`，游标用 `sha_is_safe` 校验后拼 `<sha>^`。
- 项目里已有文件路径安全解析的既定模式：`operations::diff_content`（`operations.rs:208`）用 `resolve_within_repo(&repo_root.local_path, path)?` 做路径穿越校验，再用 `pathspec(&repo_root.local_path, &worktree_path)` 转成 git 相对路径字符串。新命令应复用这两个函数，不要重新发明路径校验逻辑。
- 前端 `git-history` 模块（`GitHistoryPane.tsx`、`graph.ts`）已有仓库级提交列表的数据结构和展示逻辑，但包含 graph rail（提交图谱），本 change 不需要图谱，只需要列表部分的展示模式可参考。
- `explorer-collapsible-sections` 提供的时间线区块容器（`ResizablePanel` + `SectionHeader`）是本 change 的前置依赖，接入点是该区块内部的内容组件。

## Goals / Non-Goals

**Goals:**
- 新增文件级 git log 后端命令，复用现有路径校验和 CLI 调用模式。
- 时间线区块展示当前激活文件的提交列表，跟随文件切换、支持分页、支持点击查看 diff。

**Non-Goals:**
- 不做提交图谱（graph rail），不改动仓库级 `GitHistoryPane`。
- 不改动 `explorer-collapsible-sections` 的布局地基本身。
- 不新增专门的"文件历史"独立面板/Tab——只在侧栏时间线区块内展示。

## Decisions

**1. 新增 `git_log_file` 命令，签名镜像 `git_log` + `git_diff_content` 的路径处理模式**
后端新增 `git_log_file(repo_root, file_path, limit, before_sha, workspace)`，内部：
- 用 `authorized_repo_root` 鉴权（同 `log`）。
- 用 `resolve_within_repo` + `pathspec` 把 `file_path` 转成 git 相对路径（同 `diff_content`）。
- CLI 参数在现有 `log` 的基础上追加 `--follow` 和 `-- <rel_path>`（pathspec 需放在 `--` 之后，且需要放在所有其他 flag 之后，符合 git 的参数顺序要求）。
- 复用现有 `GitLogEntry` 类型和 `LOG_FORMAT`，不需要新的数据结构。

备选方案（用现有 `git_log` 加一个可选 `path` 参数）被否决：`git_log` 是仓库级视图的既有契约（`git-history` 模块直接依赖它的仓库级语义），混入按文件过滤的 `--follow` 语义会让这个命令的行为复杂化、职责不单一，新增独立命令更清晰。

**2. 前端时间线内容组件独立实现，不复用 `GitHistoryPane` 的图谱渲染**
只复用 `git-history/lib` 里与图谱无关的纯函数（如相对时间格式化，需在实现时确认 `graph.ts`/其他 lib 文件里是否已有可直接复用的工具函数；如没有则新写一个轻量的格式化函数，不引入新依赖）。列表项 UI（sha、message、作者、时间）参照截图样式，自行实现，不套用 `GitHistoryPane` 的复杂交互。

**3. 跟随活动文件：由父组件（`FileExplorer`/侧栏容器）传入当前激活文件路径 prop**
时间线区块组件接收 `activeFilePath: string | null` prop，内部用该 prop 变化触发重新请求（如用 `useEffect` 依赖 `activeFilePath`），而不是自己订阅编辑器状态或全局 store。这与 `FileExplorer` 现有的 `activeFilePath` prop（`FileExplorer.tsx:59`）保持同一数据来源，避免时间线区块和文件树对"当前激活文件"的理解不一致。

**4. 分页：复用 `before_sha` 游标模式**
`git_log_file` 的 `before_sha` 参数语义与现有 `git_log` 一致（`<sha>^` 作为下一页起点），前端滚动到底部时用最后一条记录的 sha 发起下一页请求并追加。

**5. 点击提交查看 diff：复用已有的提交 diff 展示能力**
点击时间线条目时，调用现有的 `git_show_commit`（返回 `GitDiffResult`）并在既有的 diff 展示组件（`GitDiffPane`/`GitDiffStack`，具体接入方式在实现阶段确认，可能需要限定只展示该文件而非整个提交的 diff，取决于 `GitDiffResult` 结构是否已支持按文件筛选）中展示，不新建 diff 渲染逻辑。

## Risks / Trade-offs

- **[Risk]** `--follow` 在文件重命名/移动历史上，`git log` 每次只能跟踪一条重命名链路，且 `--follow` 与 `--format` 组合时某些 git 版本对 rename 记录的字段（如 old path）输出格式可能不同于普通记录。
  → **Mitigation**：实现时用一个有过重命名历史的真实文件手测，确认 `GitLogEntry` 解析不会因 rename 记录格式差异而出错；如有问题，对 rename 记录做单独的容错解析。
- **[Risk]** `GitDiffResult`（`git_show_commit` 返回类型）目前是否已支持"只看某个提交里某个文件的 diff"还是必须展示整个提交的全部文件 diff，需要在实现时确认；如果只能拿到整个提交的 diff，需要前端从中筛选出目标文件的部分再展示。
  → **Mitigation**：实现阶段先读 `GitDiffResult` 类型定义确认，若不支持按文件筛选，在前端展示时做过滤，不改动后端返回结构。
- **[Risk]** `git log --follow -- <path>` 在大仓库、长历史文件上可能比仓库级 `git log` 慢。
  → **Mitigation**：`limit` 默认值参照现有 `git_log` 的 30 条上限逻辑，不做无限制查询。

## Migration Plan

纯新增功能，无需迁移或 feature flag。依赖 `explorer-collapsible-sections` 的时间线区块容器先落地；如该 change 尚未合并，本 change 的前端部分可以先在独立分支/临时容器里开发和验证，最终合并时再对齐容器接口。
