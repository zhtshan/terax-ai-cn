# Changelog

All notable changes to Terax 中文版. Format loosely follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/) (pre-`1.0`, minor bumps may include breaking changes).

## [0.8.7] - 2026-08-24

### Added
- 文件右键菜单「打开时间线」：点击后直接在左侧 Timeline 面板显示该文件的 git 提交历史，无需打开 editor tab
- 文件浏览器剪贴板操作：支持复制（Copy）、剪切（Cut）、粘贴（Paste）文件和文件夹，粘贴冲突自动追加后缀
- Rust 新增 `fs_copy` / `fs_cut` 命令（deny-list 网关 + atomic rename）
- 编辑器 diff 视图并排对比：支持提交与工作区 diff 对比，打开后自动定位到第一处差异
- 底部状态栏添加 diff 可视化标记
- codegraph 索引入库，支持本地代码图检索
- 时间线提交记录添加右键复制菜单

### Changed
- Explorer 大纲/时间线分区折叠逻辑统一为通用带下限保护的布局函数（`shiftLayout`），各分区互不干扰
- 大纲/时间线分区样式优化，折叠态持久化更稳定
- i18n(命令面板): 命令标题、禁用原因、搜索提示改为多语言
- 优化 claude 自动加载资源文件

### Fixed
- 修复 reload 按钮无效问题
- 修复原生右键菜单误杀终端会话的问题
- 修复大纲/时间线分区展开折叠交互问题
- 修复 diff 合并视图 settle 动画帧清理泄漏
- 修复 TimelineSection 注释引用未更新问题
- 标签页状态管理优化（`useTabs`）
- 修复 IME 输入符号需按两次才显示的问题

---

## [0.8.6] - 2026-08-16

### Added
- VS Code 风格内容搜索面板（`SearchPanel` / `SearchInput` / `SearchResults` / `ReplaceAffectedBar`）：支持正则、大小写敏感、全词匹配、include/exclude glob 过滤、Replace All、状态条 + 高亮分组渲染
- 新增侧边栏 Search 入口（位于 Explorer 与 Source Control 之间），快捷键 `Mod+Shift+F` 聚焦；`Mod+Shift+K` 切到文件搜索
- 编辑器导航历史：跨文件前进/后退（`pushNavigationHistory` / `goBack` / `goForward`），关闭标签与切换 workspace 时自动清理
- 终端文件路径链接（`FileLinkProvider` + `fs_stat` 校验），`setExplorerRoot` 激活后点击即可在编辑器打开
- 搜索结果点击直接在编辑器打开目标行（`openContentHit` 接入导航历史）
- 新增 Tauri 命令 `fs_search_content` 与 `fs_replace_all`（deny-list 网关 + `write_atomic` 写入 + 20000 条硬上限）
- AI agent 视图模式（mini-window 国际化修复）
- 底部模型选择器与 Settings 默认模型双向同步
- 仅显示已配置 API key（或本地端点可用）的 provider 模型
- `defaultModel` 支持自定义 OpenAI 兼容端点
- Workspace 停靠 AI 输入框高度可拖拽
- 文件浏览器 `F2` / macOS `Enter` 重命名快捷键
- 侧栏 Markdown 大纲区块（基于 LSP documentSymbol，支持树形展示 + 展开/折叠全部）
- 侧栏文件级 Git 时间线（基于 git_log_file，支持 follow + 分页）
- Windows 盘符快速切换功能（drive-letter-switcher）
- 终端分屏 pane 关闭按钮（带前台进程确认）

### Changed
- 标签页切换性能优化 50-60%（renderer pool 5 → 12，`POOL_MAX_SIZE = 12`）
- `SearchPanel` 状态提升至 `App.tsx`，跨标签切换不丢失
- 前端与 Tauri IPC 参数命名统一为 camelCase（`whole_word → wholeWord`、`case_sensitive → caseSensitive`）
- macOS 优先尝试官方 updater，仅在失败时 fallback 到手动下载
- 更新检查改用 `tags` API（不再依赖 `releases/latest`），含 `v` 前缀去重与 `-N-cn` 数字解析
- Release CI：发布为正式 release（不再是 draft），并新增 macOS 构建
- `grep` 模块拆分 `build_matcher` 辅助函数，`fs_replace_all` 单行仅替换首个匹配
- 命令面板 `#` 内容搜索模式移除冗余 toggle
- 文档：项目 `CLAUDE.md` 拆分模块、剔除可推导内容（约节省 1.6k tokens/会话）；commit message 统一使用中文
- 仓库地址统一为 `zhtshan/terax-ai-cn`（updater + about 页面）

### Fixed
- 编辑器 `Cmd+ArrowLeft/Right` 跨文件导航历史失效（修复 `useEffect` 顺序导致的 stale closure）
- Updater 版本号解析在 `-N-cn` 格式下截断数字后缀
- 更新提示文案重复 `v` 前缀
- `checkLinuxRelease` 排序比较器在非版本号 tag 下出现非传递比较
- Windows MSI 在 `-cn` 版本号下构建失败（跳过 MSI，仅出便携版）
- LSP 跳转定义/查找引用无结果时不再静默失败，明确提示用户
- `grep` IPC 在 WSL 路径与并发双击场景下加固
- 分屏关闭按钮相关的若干回归问题
- pane 关闭按钮补上前台进程确认
- 标签关闭按钮改回关闭被点击标签而非当前激活标签
- AI 代理关闭时输入条整块收起而非留空盒子
- 终端文件路径点击后编辑器未激活及失活后链接消失
- 文件链接路径归一化去除 node:path 依赖，支持波浪号路径展开
- LSP 冷启动时先等 initialize 完成再判断 documentSymbol 能力
- LSP symbolKind.valueSet 用字面量数组匹配协议类型
- LSP 扁平 SymbolInformation 用 containerName 还原大纲层级
- 大纲无可折叠节点时隐藏展开/折叠全部按钮
- 大纲首次打开文件时不显示标题
- 文件无提交历史时显示时间线空态
- 时间线无数据时显示空白
- 时间线 bad revision 错误处理
- 非 Markdown 文件不显示大纲占位提示

## [0.8.5] - 2026-07-23

### Added
- 完整中文语言支持（zh-CN）：全界面、设置、编辑器、AI 面板、终端、快捷键面板、主题描述、提示文案
- 新增 `src/i18n/` 目录：`i18n/index.ts` + `locales/en.json` + `locales/zh.json`（793 个 key，中英完全对等）
- 设置 - 通用 - Language 加入中/英切换 dropdown

### Changed
- 所有 UI 文案改由 react-i18next 渲染，切换语言可即时生效
- 部分 Radix / forwardRef 组件通过 `useTranslation` reactive hook 确保刷新
- `.gitignore` 强化：新增 `src-tauri/target/`、`src-tauri/gen/`、`.env*`、IDE、OS、`release/`

### Fixed
- 修复 `nonExplicitSupportedLngs: true` 导致 zh-CN 找不到资源、falls back 到 en 的 bug
- 修复语言切换后部分组件（如 forwardRef、Radix Select）不刷新的问题

## [0.6.6] - 2026-05-17

### Added
- 首次正式发布中文汉化版本，对应上游 v0.6.6
- GitHub Releases 提供 Windows 便携版

## [0.5.9] - 2026

## Added
- Window management for linux

## Changed
- Secrets (keyring) redesign
- Auto updater stabilization

## [0.5.8] - 2026

### Added
- Auto-updater wired into release builds.
- GitHub Actions workflow for cross-platform builds and releases.

### Fixed
- Linux window initialization issue on first launch.

### Changed
- CI: bumped Node and pnpm versions used in release pipeline.

## [0.5.7]

### Changed
- Default working directory for new sessions is now `$HOME`.
- Stabilized shell init scripts (zsh / bash / pwsh) - fewer edge cases on first prompt.

## [0.5.6]

### Changed
- Reduced app size and startup cost via lazy loading of editor/AI modules.

## [0.5.5]

### Added
- Demo assets and updated README screenshots.

### Changed
- Dependency version sweep.

## [0.5.4]

### Changed
- Combined snippets and commands into a single surface for a cleaner UX.

## [0.5.3]

### Changed
- UI polish across AI / agent views.

## [0.5.2]

### Changed
- AI mini-window UI/UX improvements.

## [0.5.1]

### Added
- Full agentic workflow: plans, sub-agents, tasks, project init.
- Improved shell tool for the agent.

## [0.4.7]

### Added
- Vim mode in the code editor.
- Keyboard navigation across the file explorer.

## [0.4.6]

### Changed
- Cleanup pass: dependencies, UI, icon set.

## [0.4.5]

### Changed
- Optimized PTY resizing, session lifecycle, and AI context handling.

## [0.4.4]

### Changed
- Agents UI/UX improvements.

## [0.4.3]

### Added
- Skills and multi-agent support.
- Settings UI improvements.

## [0.4.2]

### Changed
- AI autocomplete improvements (latency, accuracy).

## [0.4.1]

### Added
- Local LLM support via LM Studio.
- Groq and Cerebras providers.
- AI autocomplete in the code editor.

## [0.3.9]

### Added
- AI edit diffs - preview and approve agent edits before applying.

## [0.3.8]

### Added
- File search across the workspace.
- Separate editor tab type, decoupled from terminal tabs.

## [0.3.7]

### Added
- Web preview tab with auto-detection of local dev servers.

## [0.3.6]

### Added
- Autostart and window-state persistence.

### Changed
- Settings UI improvements.

## [0.3.5]

### Added
- Standalone settings window.

## [0.3.4]

### Added
- New AI mini-window.
- Text selection handling and session persistence.

## [0.3.1]

### Changed
- Internal refactor.

## [0.3.0]

### Added
- AI agents (initial implementation).
- Apache-2.0 license.

## [0.2.9]

### Added
- Tauri keyring integration - API keys now stored in the OS keychain.

### Changed
- Internal renaming pass.

## [0.2.8]

### Changed
- Icon set and theme refresh.

## [0.2.7]

### Added
- Context menu in the file explorer.

### Changed
- General refactor; editor improvements.

## [0.2.4]

### Fixed
- Various bug fixes.

## [0.2.3]

### Added
- File explorer (first version).
- Code editor based on CodeMirror 6.

## [0.2.1]

### Added
- Logging.

### Fixed
- Shell script handling and session edge cases.

## [0.2.0]

### Added
- AI side panel.
- Status bar.
- Keyboard shortcuts.

## [0.1.3]

### Added
- AI SDK and AI Elements integration.

## [0.1.2]

### Added
- New app logo.
- Configurable window size.

## [0.1.1]

### Changed
- Rendering and resize improvements.
- Header and tabs UI polish.

## [0.1.0]

### Changed
- New UI shell.
- Internal refactor; fixed render/resize race.

## [0.0.8]

### Added
- Multi-tab support.
- Basic layout UI.

## [0.0.7]

### Changed
- Switched icon library from Lucide to HugeIcons.

## [0.0.6]

### Added
- Custom font and theme.
- Tauri window management.

## [0.0.5]

### Added
- xterm.js WebGL renderer, search, and link plugins.

## [0.0.4]

### Added
- shadcn/ui component set and supporting deps.

## [0.0.3]

### Added
- Child process lifecycle handling.
- Per-session locking.

## [0.0.2]

### Added
- Initial Rust PTY backend with xterm.js in React (prototype).