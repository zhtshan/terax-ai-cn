# Tasks: VS Code 风格内容搜索

> 任务顺序：先建后端契约，再建前端骨架，最后两端贯通。
> 每完成一项必须勾选并 git commit（不积攒）。

## 后端

- [x] 核实 `fs_write_file` 是否已有原子写路径；若没有补上（写临时文件 + rename）
- [x] `HARD_MAX_RESULTS` 从 2000 提升到 20000，跑现有测试确认无回归
- [x] 在 `grep.rs` 抽出公共 search helper（参数化 matcher + include glob + exclude glob + cancel）
- [x] 实现 `fs_search_content` 命令（regex / ci / whole_word / include / exclude / max_results）
- [x] 实现 `fs_replace_all` 命令（内部搜索 + 原子写 + secret-path 拒绝 + workspace 鉴权）
- [ ] 在 `src-tauri/src/lib.rs` 注册两个新命令
- [ ] 单元测试：`whole_word` 的 regex / 字面量两条路径
- [ ] 单元测试：`fs_replace_all` 的 secret-path 拒绝路径
- [ ] 单元测试：`fs_replace_all` 的部分失败返回结构
- [ ] `cargo clippy --all-targets --locked -- -D warnings`
- [ ] `cargo nextest run --locked`

## 前端 — IPC 客户端

- [ ] 新增 `src/modules/search/lib/api.ts`：封装 `fs_search_content` / `fs_replace_all` 的 invoke 包装（含 WorkspaceEnv 注入）
- [ ] 新增 `src/modules/search/lib/types.ts`：与后端结构对齐的 TS 类型

## 前端 — UI 模块

- [ ] 新增 `src/modules/search/index.ts` 公开导出
- [ ] 新增 `src/modules/search/hooks/useSearchRun.ts`：防抖 + 自取消（沿用 `ContentSearchState` 思路）
- [ ] 新增 `src/modules/search/hooks/useReplaceRun.ts`：替换状态机（idle / previewing / running / done / error）
- [ ] 新增 `src/modules/search/SearchInput.tsx`：搜索 + 替换 + 三件套开关 + include/exclude
- [ ] 新增 `src/modules/search/SearchResults.tsx`：按文件分组、可折叠、行内高亮
- [ ] 新增 `src/modules/search/ReplaceAffectedBar.tsx`：预览文件清单 + Replace All
- [ ] 新增 `src/modules/search/SearchPanel.tsx`：组合上述组件的主面板

## 前端 — 集成

- [ ] 修改左侧 Explorer 列容器（参考 git-history 的 tab 切换）：在 Explorer / Search 之间切换
- [ ] 切换 tab 不丢失当前搜索状态（保留输入与结果在内存）
- [ ] 新增 `Cmd+Shift+F` / `Ctrl+Shift+F` 快捷键：打开 Search 面板并聚焦输入框（`src/modules/shortcuts/shortcuts.ts`）
- [ ] 简化 Command Palette `#` 模式：移除 UI 上的开关（保留 `useContentSearch` 调用）
- [ ] 新增 i18n key 到 `src/i18n/locales/en.json` + `zh.json`（`search.*`）

## 端到端验证

- [ ] `pnpm lint`
- [ ] `pnpm check-types`
- [ ] `pnpm test`
- [ ] 手动跑通验收场景 1-12（见 proposal.md）