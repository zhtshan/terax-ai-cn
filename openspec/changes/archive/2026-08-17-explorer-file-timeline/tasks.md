## 1. 后端：文件级 git log 命令

- [x] 1.1 在 `operations.rs` 新增 `log_file(registry, repo_root, file_path, limit, before_sha, workspace)`：鉴权 + `resolve_within_repo` + `pathspec` 得到 git 相对路径
- [x] 1.2 CLI 参数在现有 `log` 基础上追加 `--follow` 和 `-- <rel_path>`，复用 `GitLogEntry`/`LOG_FORMAT`
- [x] 1.3 在 `commands.rs` 新增 `#[tauri::command] git_log_file`，签名镜像 `git_log` + `git_diff_content`
- [x] 1.4 手测：普通文件、重命名过的文件、新建未提交文件三种场景下命令返回是否符合预期

## 2. 前端：时间线数据获取

- [x] 2.1 新增 native 绑定调用 `git_log_file`（参照现有 `git_log` 前端调用位置的模式）
- [x] 2.2 时间线区块组件接收 `activeFilePath` prop，随其变化触发重新请求
- [x] 2.3 无历史文件（命令返回空列表）时显示空态提示

## 3. 前端：列表展示

- [x] 3.1 实现提交列表项 UI（sha 短哈希、message、作者、相对时间），参照截图样式
- [x] 3.2 相对时间格式化：确认 `git-history/lib` 是否已有可复用函数，没有则新写一个轻量函数
- [x] 3.3 接入 `explorer-collapsible-sections` 留的时间线区块容器（替换占位文案）

## 4. 分页加载

- [x] 4.1 滚动到列表底部时，用最后一条记录的 sha 作为 `before_sha` 发起下一页请求
- [x] 4.2 追加新一页记录到列表末尾，处理加载中/加载失败状态

## 5. 点击查看 diff

- [x] 5.1 确认 `GitDiffResult`（`git_show_commit` 返回类型）是否已支持按文件筛选 diff
- [x] 5.2 点击提交条目时调用 `git_show_commit`，在现有 diff 展示组件中展示该文件的改动（如后端不支持按文件筛选，前端过滤）

## 6. 验收与收尾

- [x] 6.1 逐条走查 `specs/explorer-file-timeline/spec.md` 的全部场景
- [x] 6.2 跑 `pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`
