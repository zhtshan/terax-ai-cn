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
