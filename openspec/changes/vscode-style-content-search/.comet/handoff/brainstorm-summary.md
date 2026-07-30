# Brainstorm Summary

- Change: vscode-style-content-search
- Date: 2026-07-29

## 已确认的事实（项目上下文）

- `src-tauri/src/modules/fs/grep.rs` 已有 `fs_grep`（正则/大小写/glob include）和 `fs_grep_interactive`（smart-case、自取消 generation）。两个都用 `search_tree` + `WalkBuilder`。
- `src-tauri/src/modules/fs/file.rs:114-123` 的 `write_atomic`（O_EXCL tempfile + persist）已经实现，原子写路径可直接复用。
- Secret-path deny-list 当前只在 `src/modules/ai/lib/security.ts`（前端 AI 工具层），后端 `fs_write_file` 不检查。架构上"前端守门"，不替换——本次保持同样模型：`fs_replace_all` 也走前端 deny-list 检查后再调后端原子写。
- Workspace 鉴权走 `src-tauri/src/modules/workspace.rs` 的 `WorkspaceRegistry`。`fs_replace_all` 接收 `(path, content)` 时复用 `fs_write_file` 的解析路径（自动走 workspace 鉴权），无需新加鉴权链路。
- Sidebar 当前顶级视图：`explorer` / `source-control`（`src/modules/sidebar/types.ts:1`），路由由 `useSidebarPanel`（`src/modules/sidebar/useSidebarPanel.ts:37`）通过 localStorage 持久化。
- 现有快捷键冲突：`explorer.search` = `Cmd/Ctrl+Shift+F`（= Explorer 内文件名搜索），`commandPalette.content` = `Cmd/Ctrl+Shift+P`（= Command Palette 内容搜索）。

## 已确认的设计方案（用户答复）

1. **位置**：Search 作为第三个顶级 sidebar view（与 explorer / source-control 并列），**不是 explorer 内的二级 tab**。Visual 与功能与 VS Code activity bar 对齐。
2. **快捷键冲突**：
   - `explorer.search` → 重命名为 `explorer.findFiles`，快捷键从 `Cmd/Ctrl+Shift+F` 改为 `Cmd/Ctrl+Shift+K`（避开 `Cmd+Shift+E/H/I/O/P/S/T` 等已用组合）。
   - `Search` 面板 → 新快捷键 `search.focusPanel` = `Cmd/Ctrl+Shift+F`（对齐 VS Code）。
   - `commandPalette.content`（`Cmd/Ctrl+Shift+P` → `#` 模式）保留不动，作为快速入口。
3. **三件套开关**：Regex / Case Sensitive / Whole Word 都在 Search 面板里。
4. **include/exclude**：单值 glob 输入框。
5. **结果集**：按文件分组、可折叠、行内高亮。单次总命中上限 20000，截断 UI 提示。
6. **替换**：Replace All 一键写入；写前显示"将修改 N 个文件 / M 个匹配"的文件清单；不弹二次确认。**安全模型**：前端调用 `fs_replace_all` 前用 `security.ts` 的 `checkWritableCanonical`（已含 symlink 解析）过滤每个目标路径；后端仍走 `write_atomic`（O_EXCL + persist）。
7. **Command Palette `#` 模式**：保留作为快速入口，**移除任何开关 UI**（都迁到面板）；复用现有 `useContentSearch`。
8. **i18n**：新增 `search.*` 命名空间到 `en.json`/`zh.json`，避开现有 `search.*` 命名空间冲突（`en.json:596-601` 是 header 内联搜索用的）——使用 `sidebar.search` 与 `searchPanel.*` 拆分。

## 关键技术决策（来自 explore）

| 决策 | 选择 | 理由 |
|---|---|---|
| 前端是否参与 regex 拼装 | 否 | 用户输入原样下发；whole_word 由后端加 `\b...\b` 包裹 |
| `whole_word` 实现位置 | 后端 `RegexMatcherBuilder` + `\b` 包裹 | 集中在一处 |
| include/exclude 单值 vs 多值 | 单值 | VS Code 默认单值；UI 简单 |
| 后端是否流式推 | 否 | 同步阻塞调用足够 |
| 替换安全模型 | 前端 `checkWritableCanonical` 过滤 + 后端 `write_atomic` | 与现有架构一致；保留前端 deny-list 单一来源 |
| 20000 上限 | 接受 | ~4 MB 单次峰值无害 |
| `replace` 的 secret-path 拒绝策略 | 复用 `security.ts`，前端在调 IPC 前过滤 | 与 AI 工具同模型；用户对"AI 工具路径"熟悉 |

## Spec Patch 候选

- 验收场景 12 增加："Search 面板为顶级 sidebar view，与 Explorer / Source Control 并列"。
- 验收场景 13 增加："`Cmd/Ctrl+Shift+F` 在任意焦点下都打开 Search 面板并聚焦输入框；不再打开 Explorer 内文件名搜索"。
- 验收场景 14 增加："`Cmd/Ctrl+Shift+K` 打开 Explorer 文件名搜索（旧的 explorer.search 行为迁移）"。

## 测试策略

- **后端单元测试**：
  - `whole_word` 在 regex 与字面量两条路径的匹配行为
  - `fs_replace_all` 的 secret-path 拒绝路径（前端 deny-list 已测；后端只验证 atomic 写 + workspace 鉴权）
  - `fs_replace_all` 的部分失败返回结构（已写成功的文件 + 失败列表）
  - `HARD_MAX_RESULTS = 20000` 后现有测试不回归
- **后端集成**：跑 `cargo nextest run --locked`
- **前端**：复用 `useContentSearch` 的 debounce + 自取消语义；新增组件单测不强制（项目惯例：UI 改动不做单测；手动验收）
- **端到端**：手动跑通 14 条验收场景

## 当前阶段

- 已完成 explore + 澄清 + 4 段方案对比与确认
- 用户已确认设计方案（方案 A + sidebar 顶级视图 + 快捷键迁移 + 替换 UX）
- 下一步：创建 Design Doc + 写回 Spec Patch → design guard → /comet-build