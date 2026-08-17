# Comet Design Handoff

- Change: explorer-file-timeline
- Phase: design
- Mode: compact
- Context hash: 7cce840ef8a17d47d8e072e5b684195a67d5b1e6667b12ba4c9f9af385f1efb6

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/explorer-file-timeline/proposal.md

- Source: openspec/changes/explorer-file-timeline/proposal.md
- Lines: 1-26
- SHA256: 552d94890b3fa48ce4a5fe0e83fd48b7f6df1e1bbdeb182a1e76d74b12223601

```md
## Why

`explorer-collapsible-sections` change 为侧栏提供了「文件树/大纲/时间线」三区块布局地基，但时间线区块目前只有空态占位文案。用户需要在不离开侧栏的情况下，快速查看当前正在编辑的文件的 Git 提交历史（类似 VS Code 的 Timeline 面板），定位"这段代码是谁、什么时候、因为什么提交改的"。

## What Changes

- 后端新增一个文件级 Git 日志命令：给定仓库根目录、文件路径、可选的 `before_sha` 游标和 `workspace`，返回该文件的提交历史（`git log --follow -- <path>`），沿用 `operations::log` 现有的 CLI 调用与鉴权模式。
- 前端在 `explorer-collapsible-sections` 留出的时间线区块里接入真实数据：展示当前激活文件的提交列表（sha、message、作者、相对时间），最新在前。
- 时间线区块随编辑器活动文件切换自动刷新；无 Git 历史的文件显示空态。
- 支持下拉加载更多（复用 `before_sha` 游标分页）。
- 点击某条提交，打开该文件在该次提交的 diff（复用现有 `git_show_commit` / diff 展示能力）。

## Capabilities

### New Capabilities
- `explorer-file-timeline`：侧栏时间线区块展示当前激活文件的 Git 提交历史，支持跟随文件切换刷新、分页加载、点击查看 diff。

### Modified Capabilities
（无。`git-history` 模块现有的仓库级时间线（`GitHistoryPane`）行为不变。）

## Impact

- `src-tauri/src/modules/git/commands.rs` + `operations.rs`：新增文件级 git log 命令。
- `src/modules/explorer/`：时间线区块组件从占位态改为真实数据态，接入编辑器活动文件状态。
- 可能复用/抽取 `src/modules/git-history/lib` 的部分数据处理逻辑（如相对时间格式化）。
- 依赖 `explorer-collapsible-sections` 提供的时间线区块容器先落地。
```

## openspec/changes/explorer-file-timeline/design.md

- Source: openspec/changes/explorer-file-timeline/design.md
- Lines: 1-55
- SHA256: 9dd5048c2680fc92e3086235e841ff788177fdd4d059428ffc7b7833239abdcf

```md
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
```

## openspec/changes/explorer-file-timeline/tasks.md

- Source: openspec/changes/explorer-file-timeline/tasks.md
- Lines: 1-33
- SHA256: dc38e4bef7475ee0eff501c57f89fd69316b780f1b6cf6535bc86cc30b4653df

```md
## 1. 后端：文件级 git log 命令

- [ ] 1.1 在 `operations.rs` 新增 `log_file(registry, repo_root, file_path, limit, before_sha, workspace)`：鉴权 + `resolve_within_repo` + `pathspec` 得到 git 相对路径
- [ ] 1.2 CLI 参数在现有 `log` 基础上追加 `--follow` 和 `-- <rel_path>`，复用 `GitLogEntry`/`LOG_FORMAT`
- [ ] 1.3 在 `commands.rs` 新增 `#[tauri::command] git_log_file`，签名镜像 `git_log` + `git_diff_content`
- [ ] 1.4 手测：普通文件、重命名过的文件、新建未提交文件三种场景下命令返回是否符合预期

## 2. 前端：时间线数据获取

- [ ] 2.1 新增 native 绑定调用 `git_log_file`（参照现有 `git_log` 前端调用位置的模式）
- [ ] 2.2 时间线区块组件接收 `activeFilePath` prop，随其变化触发重新请求
- [ ] 2.3 无历史文件（命令返回空列表）时显示空态提示

## 3. 前端：列表展示

- [ ] 3.1 实现提交列表项 UI（sha 短哈希、message、作者、相对时间），参照截图样式
- [ ] 3.2 相对时间格式化：确认 `git-history/lib` 是否已有可复用函数，没有则新写一个轻量函数
- [ ] 3.3 接入 `explorer-collapsible-sections` 留的时间线区块容器（替换占位文案）

## 4. 分页加载

- [ ] 4.1 滚动到列表底部时，用最后一条记录的 sha 作为 `before_sha` 发起下一页请求
- [ ] 4.2 追加新一页记录到列表末尾，处理加载中/加载失败状态

## 5. 点击查看 diff

- [ ] 5.1 确认 `GitDiffResult`（`git_show_commit` 返回类型）是否已支持按文件筛选 diff
- [ ] 5.2 点击提交条目时调用 `git_show_commit`，在现有 diff 展示组件中展示该文件的改动（如后端不支持按文件筛选，前端过滤）

## 6. 验收与收尾

- [ ] 6.1 逐条走查 `specs/explorer-file-timeline/spec.md` 的全部场景
- [ ] 6.2 跑 `pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`
```

## openspec/changes/explorer-file-timeline/specs/explorer-file-timeline/spec.md

- Source: openspec/changes/explorer-file-timeline/specs/explorer-file-timeline/spec.md
- Lines: 1-40
- SHA256: 236bb88c89792998567379247941fc3ad3a49cc518b7d3bd1fd4eb2114eb7c06

```md
## Purpose

侧栏时间线区块展示当前激活文件的 Git 提交历史，让用户无需切到独立的 Git 历史面板即可快速回溯某个文件的改动脉络。

## ADDED Requirements

### Requirement: 显示当前激活文件的提交历史
时间线区块 SHALL 展示当前编辑器激活文件的 Git 提交列表，按提交时间从新到旧排序，每条记录包含提交摘要（sha 短哈希、message、作者、相对时间）。

#### Scenario: 打开有历史的文件
- **WHEN** 用户打开一个在当前仓库中有提交历史的文件
- **THEN** 时间线区块显示该文件的提交列表，最新提交排在最前

### Requirement: 跟随编辑器活动文件切换
时间线区块 SHALL 在编辑器的活动文件发生切换时自动刷新为新文件的提交历史。

#### Scenario: 切换到另一个文件
- **WHEN** 用户从一个文件切换到另一个文件
- **THEN** 时间线区块自动刷新，显示新文件的提交历史，不需要手动操作

### Requirement: 无历史文件的空态
对于在当前仓库中没有提交历史的文件（如新建未提交文件、不在仓库内的文件），时间线区块 SHALL 显示空态提示而非报错或空白。

#### Scenario: 查看新建文件的时间线
- **WHEN** 用户打开一个尚未提交过的新文件
- **THEN** 时间线区块显示"暂无提交历史"一类的空态提示

### Requirement: 分页加载更早的提交
时间线区块 SHALL 支持在列表末尾触发加载更早的提交记录。

#### Scenario: 下拉加载更多
- **WHEN** 用户将时间线列表滚动到当前已加载记录的底部
- **THEN** 区块自动或通过明确操作加载更早的提交记录并追加到列表末尾

### Requirement: 点击提交查看该文件的 diff
点击时间线中的某条提交记录，SHALL 打开该文件在该次提交中的具体改动（diff）。

#### Scenario: 点击提交条目
- **WHEN** 用户点击时间线列表中的一条提交记录
- **THEN** 系统展示该文件在该次提交的 diff 内容
```

