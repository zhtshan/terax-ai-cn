# TERAX.md

Terax 从工作区根目录加载 `TERAX.md` 作为智能体内存（类似 AGENTS.md / CLAUDE.md）。此文件也是项目的活文档 - 在做出更改前请先阅读。

## 项目

**Terax**: 开源 AI 原生终端模拟器。Tauri 2 + Rust (`portable-pty`) 后端，React 19 + TypeScript + xterm.js (webgl) 前端，通过 Vercel AI SDK v6 实现 BYOK（自带密钥）AI。

- 包 ID: `app.crynta.terax`
- 包管理器: **pnpm**
- 平台: macOS, Linux, Windows
- 前端检查: `pnpm lint`, `pnpm check-types`, `pnpm test`
- Rust 检查: `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings`, `cd src-tauri && cargo nextest run --locked` (本地回退: `cargo test --locked`)

## 质量标准

生产级标准，否则不发布。每项更改都需符合以下所有标准，而非仅"能运行就行":

- **正确性**: 边界情况、失败模式、并发访问。拒绝"暂时能用"。
- **性能**: 极致轻量是产品核心。~7-8 MB 包大小，高性能终端。对每项更改都要问：消耗多少 RAM？是否增加 IPC 往返或冗余请求？是否触发额外重渲染或浪费工作？是否引入重型依赖？未使用的功能零资源消耗。
- **安全性**: 无关键安全漏洞。在每处边界验证（IPC、文件系统、网络、AI 工具表面）。密钥路径 deny-list 同时适用于读写操作，绝不被绕过。
- **UI/UX**: 精致、专业、高端。考虑所有状态和细节。
- **架构**: 新增或变更逻辑位于纯函数、低依赖的模块中（函数式核心）；tauri 命令和 React 组件保持精简（命令式外壳）。确保无需后续重构即可测试。

声称完成前请验证：

- 前端: `pnpm lint`, `pnpm check-types`, `pnpm test`
- Rust: `cd src-tauri && cargo clippy --all-targets --locked -- -D warnings`, `cd src-tauri && cargo nextest run --locked` (或 `cargo test --locked`)

对核心子系统（终端/shell 启动、工作区认证、git、文件系统、IPC 或 AI 工具表面）的更改需要添加测试来锁定不变量。

## 约定

- **注释**: 默认不加注释，代码应自我解释。如果确实需要，仅写 1-2 行关于 *为什么*，而非 *是什么*。禁止 AI 通用填充内容。
- **禁止使用破折号**：代码、注释、提交信息、文档中均不得出现。
- **禁止使用表情符号**：任何地方都不允许。
- **导入**: 前端始终使用 `@/...`，模块间禁止相对路径。
- **仅限 pnpm**：禁止使用 npm/npx/yarn。

## 架构

### 双进程模型

**Rust (`src-tauri/`)** 拥有所有 OS 访问权限。webview 从不直接操作文件系统、进程或 shell - 所有操作都通过 `invoke()` 调用 `src-tauri/src/lib.rs` 中注册的命令：

- `pty::pty_*` - 长期存活的交互式 PTY 会话（xterm ↔ portable-pty），由 `PtyState`（`RwLock<HashMap<id, Session>>`）管理。输出通过 Tauri `Channel<PtyEvent>` 流式传输。
- `fs::tree::*`（`fs_read_dir`、`list_subdirs`）、`fs::file::*`（`fs_read_file`、`fs_write_file`、`fs_stat`、`fs_canonicalize`）、`fs::mutate::*`（`fs_create_file`、`fs_create_dir`、`fs_rename`、`fs_delete`）：文件浏览器 + 编辑器 IO。
- `fs::search::*`（`fs_search`、`fs_list_files`）、`fs::grep::*`（`fs_grep`、`fs_glob`）：模糊文件查找 + 内容搜索（由 `ignore` + `grep-*` crates 支持）。
- `git::commands::*`：完整源代码控制接口（`git_status`、`git_diff`、`git_diff_content`、`git_stage`、`git_unstage`、`git_discard`、`git_commit`、`git_fetch`、`git_pull_ff_only`、`git_push`、`git_log`、`git_show_commit`、`git_commit_files`、`git_commit_file_diff`、`git_panel_snapshot`、`git_resolve_repo`、`git_remote_url`）。所有操作通过工作区认证注册表进行 Gate 控制。
- `shell::shell_run_command`：一次性子 shell 执行，供 AI 工具使用。与 PTY 会话不同；不是用户的交互式终端。Windows 通过 PowerShell（`-NoProfile -Command`），Unix 通过 `$SHELL -lc`。共享辅助函数 `build_oneshot_command`。
- `shell::shell_session_*`：跨调用持久化的智能体 shell。`shell::shell_bg_*`（`spawn`、`logs`、`kill`、`list`）：长期运行的后台进程（如开发服务器等），带有有界环形缓冲区日志捕获。
- `workspace::*`：`workspace_authorize` / `workspace_current_dir`（启动/git/AI cwd 认证注册表）以及 WSL 桥接（`wsl_list_distros`、`wsl_default_distro`、`wsl_home`）。
- `lsp::*`（`lsp_detect`、`lsp_host_pid`、`lsp_resolve_root`、`lsp_spawn`、`lsp_send`、`lsp_kill`）：语言服务器进程宿主。简单的 JSON-RPC 管道：Content-Length 帧 + Rust 中的进程生命周期（`lsp/framing.rs`，纯函数 + 已测试），协议智能在前端。启动 cwd 通过工作区注册表 Gate 控制；二进制文件通过捕获的登录 shell 环境解析（`lsp/env.rs`，GUI 应用在 macOS 上获得精简 PATH）；根检测向上遍历到标记但不超过 `$HOME`。服务器在 Unix 上运行在自己的进程组中并被组杀（cargo check / proc-macro 子进程随服务器一起死亡）；Windows 子进程获得 `proc::job::ProcessJob`（关闭时杀死，与 pty 共享）。`RunEvent::Exit` 时终止所有会话。
- `net::*`（`ai_http_request`、`ai_http_stream`、`lm_ping`）：带 SSRF 防护的 AI HTTP 代理；将提供商调用和本地模型 ping 隔离在 webview 之外。
- `secrets::secrets_*`：通过 `keyring` crate 实现的 OS 密钥链。服务常量 `terax-ai`。Linux 使用文件回退，通过 `#[cfg(target_os = "linux")]` Gate 控制。
- `open_settings_window`：Settings 的独立 webview 窗口（可选 `tab` 参数深度链接到特定部分）。

### PTY Shell 集成

PTY shell 通过 `src-tauri/src/modules/pty/scripts/` 中注入的初始化脚本启动：

- **Unix**（`zshenv.zsh`、`zprofile.zsh`、`zlogin.zsh`、`zshrc.zsh`、`bashrc.bash`）用于 zsh/bash，以及安装到 `~/.config/fish/conf.d/terax.fish` 的 `init.fish` 用于 fish。发出 OSC 7（cwd）和 OSC 133 A/B/C/D（提示符边界 + 退出码），使主机能在不重新解析提示符的情况下跟踪 cwd 并检测命令边界。Fish 4.0+ 写入自己的 OSC 133 提示符标记；Terax 设置 `fish_features=no-mark-prompt` 并通过 `-C` 重新声明自己的提示符以避免重复。
- **Windows**（`profile.ps1`）- 通过 `pwsh -NoLogo -NoExit -ExecutionPolicy Bypass -File <path>` 传递。包装用户现有的 `prompt` 函数（在 `$PROFILE` 运行后）以发出 OSC 7 + OSC 133 A/B/D。Shell 优先级：`pwsh.exe`（PS 7+）→ `powershell.exe`（PS 5.1）→ `cmd.exe`（无集成）。cwd 在传递给 ConPTY 前规范化为反斜杠（`CreateProcessW` 对正斜杠 cwd 行为异常）。

`pty/shell_init.rs` 分为 `#[cfg(unix)]` / `#[cfg(windows)]` 模块 - 将新的平台特定代码保留在正确的 cfg 分支中。

Windows 上的 ConPTY 需要在 `session.rs` 中对 `openpty + spawn_command` 使用 `SPAWN_LOCK`（Mutex）进行序列化。并发启动会导致其中一个 PTY 的输出管道挂起。未经验证快速标签切换下的稳定性前，不要移除此锁。

每个 ConPTY 子进程还被分配到基于会话的 **Job Object**（`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`）（`pty/job.rs`）。当 Job HANDLE 丢失 - 干净关闭、panic 或即使 Terax 进程被 SIGKILL - 内核会杀死 shell 的每个后代（例如从 pwsh 内部启动的 `npm run dev`）。没有这个机制，Windows 上会泄露整个进程子树，因为 `TerminateProcess` 只杀死直接子进程。macOS/Linux 依赖 `Drop for Session → killer.kill()`；在开发时 `cargo run` 的 Ctrl-C 不触发析构函数，那里也可能出现孤儿进程 - 目前可接受，因为是开发环境。

`AiComposerProvider` 在 App.tsx 根节点无条件挂载：条件包装会在密钥加载时改变父元素类型，在 `getAllKeys()` 解析的瞬间重新挂载整个树（并重新启动每个 PTY）。生产环境碰巧避免了这个问题，因为密钥链读取可能落在同一个绘制帧；开发环境没有。保持无条件包装。

### 前端（`src/`）

单窗口 React 应用。路径别名 `@/*` → `src/*`。标签页是标签联合类型（`kind`：`terminal` | `editor` | `preview` | `markdown` | `ai-diff` | `git-diff` | `git-history` | `git-commit-file`）且在切换时**不卸载** - 它们通过 `invisible pointer-events-none` 隐藏，使 PTY 和开发服务器能在后台继续流式传输。

`App.tsx` 连接各模块 - 保持其协调者角色。新功能应放入适当的 `modules/<area>/` 中。

### 模块布局（`src/modules/`）

每个模块自包含，通过 `index.ts` 导出薄 barrel，并在 `lib/` 下拥有自己的 hooks。

- **terminal/** - `TerminalStack` 通过 `useTerminalSession` + `pty-bridge` 为每个标签页保持一个挂载的 xterm。`osc-handlers.ts` 解析 OSC 7（带 Windows 驱动器字母规范化：`/C:/Users/foo` → `C:/Users/foo`）和 OSC 133 标记。xterm 调色板由中央主题引擎（`modules/theme`）驱动，而非本地表。渲染器槽位池化（`rendererPool.ts`，`POOL_MAX_SIZE` = 5，只限渲染器，不限 PTY/agent 并发）：带有前台任务的隐藏叶节点（OSC 133 C..D、智能体信号或 `pty_has_foreground_job`）保持其活动网格停放，通过 `display:none` 暂停渲染；空闲隐藏叶节点释放其槽位但保留缓冲区，仅在另一个叶节点窃取时才懒序列化。`DormantRing`（1 MiB，溢出时不重置终端）仅为槽位被窃取或未绑定的叶节点缓冲字节。绝不在命令执行中序列化叶节点：在快照上重放增量 TUI 重绘正是曾经导致 Claude Code 数据丢失的原因。
- **editor/** - CodeMirror 6 栈（`EditorStack` 镜像 `TerminalStack`）。`extensions.ts` 配置语言模式；支持 vim 模式。缓冲区在 LF 空间生存，原始 EOL（`lib/eol.ts`，多数投票检测）在保存时恢复；缩进单位/制表符大小通过每面板 compartment 按文件检测（`lib/indent.ts`）。保存时与 `fs_read_file`/`fs_write_file` 返回的磁盘 mtime 冲突检查（不匹配 → 警告 toast，显式 Overwrite，绝不静默最终写入者获胜）；外部 format-on-save 仅在文档自保存快照以来未更改时才应用磁盘回读。超过 10 MB 的文件提供"仍要打开"（硬性上限 50 MB，`force` 参数）；超过 4 MB 时语法高亮和 LSP 保持关闭。Cmd-F 在编辑器标签页激活时路由到 CodeMirror 自己的搜索面板（查找/替换/正则），Ctrl-G 打开跳转行；两个面板都在 `chromeTheme.ts` 中样式化。Format-on-save 格式化器位于 `lib/externalFormat.ts`（`FORMATTERS` 注册表：biome、prettier、ruff、rustfmt、gofmt、clang-format、shfmt、zig fmt，加上自定义 `{file}` 命令模板）；`resolveFormatter` 在全局默认之上应用按语言覆盖（`editorFormatterByLang`），全局外部默认仅在工具理解的语言上运行。Diff 面板在挂载 CodeMirror 前解析语言：晚期的 compartment 重新配置会导致合并视图的删除块部件未高亮。AI 内联补全（`lib/autocomplete/`）随请求发送缓冲区的缩进单位并规范化响应中无歧义的 tab/空格不匹配（`normalizeIndent.ts`）；触发方式是 `autocompleteTrigger` auto 或 manual，带有 `editor.aiComplete` / `editor.codeComplete` 注册表快捷键（保护到编辑器标签页使键能穿透到终端），Tab 在接受前接受打开的补全弹出。多行 ghost 渲染第一行内联加块部件在线下方（绝不内联 `<br>`s）；仅关闭器的行后缀（光标在 `fn(|)` 内）隐藏并在块后重新附加使预览等于接受结果，带真实代码的行后缀将 ghost 限制为一行（`capToLineSuffix`）。回显最近前缀的建议被丢弃，多行建议和关闭括号从不以以 `;` 结尾的行开始，仅关闭器的行从上一行重新缩进（`trimSuggestion`/`reindentClosers`，全部已测试）。Markdown 编辑是 GFM（`markdownLanguage` 基础），通过共享懒语言注册表解析围栏代码高亮，Cmd/Ctrl+Click URL，可点击的任务复选框（`markdownExtras.ts`，全部在懒 markdown 块中；急切预算测试强制执行此规则）。Dotenv 文件（`.env`、`.env.*` 和 `*.env`）使用懒 shell 语法。编辑器主题与应用主题解耦：`editorTheme` 偏好为 `"auto" | EditorThemeId`（默认 `"auto"`），在渲染时由 `useEditorThemeExt` 通过 `resolveEditorThemeId` 解析。在 `auto` 模式下编辑器跟随活动应用主题的 `editorTheme[mode]` 配对（实时，永不过时）；显式选择覆盖。主题 ID + 标签位于 `settings/store.ts`（`EDITOR_THEMES`/`EDITOR_THEME_LABELS`）；匹配扩展在 `editor/lib/themes.ts`（`EDITOR_THEME_EXT`）。预构建的 `@uiw` 主题加上本地构建的主题在 `editor/lib/cmThemes.ts`（Kanagawa wave/lotus/dragon、Everforest、Dracula、Solarized、Catppuccin、Rosé Pine）通过 `createTheme`（无额外依赖）。三个 CM 表面（`EditorPane`、`AiDiffPane`、`GitDiffPane`）都通过 `useEditorThemeExt` 读取主题。
  编辑器代码大小单独存储为 `editorFontSize`，不影响 `terminalFontSize`。
- **explorer/** - 带 Material/Catppuccin 图标（`iconResolver.ts`）的文件树、模糊搜索、键盘导航、内联重命名、上下文操作。反斜杠感知的 `basename`。
- **preview/** - 自动检测的开发服务器预览标签页（状态栏药丸在检测到 localhost URL 时建议打开）。
- **tabs/** - `useTabs` 是标签页列表 + 活动 ID 的真源。`useWorkspaceCwd` 从活动标签页推导资源管理器根 + 新标签页的继承 cwd。`basename` 同时拆分 `/` 和 `\`。
- **header/** - 顶栏 + 内联搜索（`SearchInline` 通过 `SearchTarget` 适配终端 vs 编辑器）。`WindowControls` 在 `USE_CUSTOM_WINDOW_CONTROLS` 为 true 时渲染（Linux + Windows；macOS 使用原生交通灯）。
- **statusbar/** - 底栏，`CwdBreadcrumb`（通过 `pathUtils.segmentsFromCwd` 处理 Unix 路径、Windows 驱动器字母和主页 `~` 段）、AI 工具指示器。
- **shortcuts/** - 快捷键注册表（`shortcuts.ts`）+ `useGlobalShortcuts`。处理器位于 `App.tsx` 并按 ID 传入（`tab.new`、`ai.toggle`…）。跨平台 Cmd/Ctrl 使用 `metaKey || ctrlKey`。
- **settings/** - 设置存储（通过 `tauri-plugin-store` 的 `store.ts`）、偏好 hooks、设置窗口开启器。
- **sidebar/** - 活动栏 + 可折叠侧面板（explorer、源代码控制、git 历史）。
- **source-control/** - git 状态 / 暂存 / 提交面板和 diff 工作流。
- **git-history/** - 提交图轨道、refs、每提交文件 diff。
- **lsp/** - 可选语言服务器支持，启用前零成本（无进程、无 PATH 检查、急切 bundle 中无额外内容，除了一个 14.5 kB shell）。状态栏药丸为每种语言提供启用（找到二进制）或安装（带可复制命令）；激活持久化为设置存储中的 `lspActivation`（`enabled`/`dismissed`/未设置）。`sessionManager.ts` 按（服务器、工作区根）键入会话、引用计数打开文档、3 分钟后空闲杀死、崩溃退避（ respawn 前的冷却期；5 分钟内 3 次 → 放弃 + toast 带服务器 stderr 尾部）。资源不变量：**无根标记 → 无会话**（dirname 回退曾为每个目录启动服务器并烧毁 GBs），每服务器硬上限 4 个会话，精简的 per-preset `initializationOptions`（rust-analyzer：`cachePriming` 关 + 有界 `lru`；tsls：`maxTsServerMemory`）。客户端是懒导入后的 `codemirror-languageserver`，子类化（`lib/client.ts`）添加 didClose/didSave/shutdown、`textDocument/references`（Shift-F12；多结果定义和引用共享 `locationsPanel.ts` 选择器）和 lib 遗忘的 publishDiagnostics 能力（tsls 没有它就不发送诊断）；`lib/transport.ts` 桥接到 Rust 管道并回答 lib 忽略的服务器到客户端请求。`vscode-languageserver-protocol` 在 vite.config.ts 中别名为 4 枚举 shim（节省 ~117 kB）。预设：typescript、rust-analyzer、pyright、ruff、gopls 等；通过 Settings 的自定义 stdio 服务器。多个预设可声称一种语言（pyright 和 ruff 都取 `py`）：`serverForLanguage` 优先启用候选者，因此在 pyright 未设置或已忽略时启用 ruff 会将 Python 路由到 ruff。WSL 工作区暂时排除。
- **markdown/** - markdown 预览渲染器（支持 `markdown` 标签页类型）。
- **workspace/** - 工作区环境切换（本地 + WSL 发行版）。
- **theme/** - 自定义主题引擎（无 `next-themes`）。`ThemeProvider` + `applyTheme` 写入 CSS 变量；内置预设位于 `themes/`（terax-default、claude、kanagawa、kanagawa-dragon、tokyo-night、catppuccin、rose-pine、everforest、nord、gruvbox、dracula、solarized、tide、sage、caffeine），每种可选择声明 `editorTheme` 配对，由 `resolveEditorThemeId` 消费（见 editor/）。用户主题通过 `customThemes.ts` + `validateTheme.ts`，可选背景图片通过 `bgImageStore.ts` + `SurfaceLayer`。
- **updater/** - 基于 `tauri-plugin-updater` 的自动更新 UI。
- **agents/** - 内置 Terax 智能体和终端编码智能体（Claude Code、Codex、Gemini CLI、Pi）的智能体通知 + 管理。共享存储（`store/agentStore.ts`：终端 `sessions` + `localAgent` + `notifications`）和共享路由器（`lib/route.ts`：聚焦且可见时抑制、未聚焦时 OS 通知、聚焦但隐藏时应用内 Sonner toast） feeding 到头部的 `NotificationBell`（管理表面，Terax 智能体列在首位，每智能体挂钩启用行）。Toasts 使用通过中央引擎主题化的 Sonner（`components/ui/sonner.tsx`）；`lib/agentIcon.tsx` 渲染每智能体品牌标记（Terax 和 Pi logo、Claude/ChatGPT/Gemini hugeicon）。终端检测在 Rust 侧（`pty/agent_detect.rs`）在 PTY 读取器的字节过滤器上，在 `OSC 133;C;<cmd>` 时武装或由标记自我武装，发出 `terax:agent-signal` 转换（`started`/`working`/`attention`/`finished`/`exited`）仅由 OSC 序列驱动（绝不为原始输出，因此重绘的 TUI 永不 flap）- 无智能体运行时零成本。所有终端智能体收敛于检测器读取的相同 `OSC 777` 标记，通过 `modules/agent.rs` 中的 `agent_enable_hooks(agent)` / `agent_hooks_status(agent)` 安装（数据驱动的 `AgentSpec` 用于 JSON-hook 智能体加上 Terax 拥有的 Pi 扩展；原子写入、保留外国配置、幂等；在 `TERAX_TERMINAL` 上 Gate 控制）。交付方式不同，因为只有 Claude 的挂钩协议能在挂钩 *响应* 中返回终端字节：**Claude**（`~/.claude/settings.json`、`UserPromptSubmit`/`Notification`/`Stop`）通过 `terminalSequence` 字段返回标记（遗留 3 字段 `notify;Terax;<event>`）。**Codex**（`~/.codex/hooks.json`、`UserPromptSubmit`/`PermissionRequest`/`Stop`）和 **Gemini**（`~/.gemini/settings.json`、`BeforeAgent`/`Notification`/`AfterAgent`，`matcher:"*"`）不能，因此挂钩 *命令* 本身发出 4 字段 `notify;Terax;<agent>;<event>` 标记（Unix 上 `printf > /dev/tty`，或 Windows 上 `AttachConsole` 后 `terax __terax_notify` 写入 `CONOUT$`）并打印 `{}` 作为 JSON stdout 空操作（Codex 的 `Stop` 和 Gemini 都拒绝空/非 JSON stdout）。**Pi**（`~/.pi/agent/extensions/terax-notifications.ts`）使用 `agent_start`/`agent_settled` 扩展事件并将命名标记直接写入 stdout。智能体命名标记允许在无 preexec 触发时自我武装命名正确的智能体（bash/tmux/Windows）。Terax 智能体路径是 `ai/components/LocalAgentNotificationsBridge.tsx`，将 `chatStore.agentMeta`（`awaiting-approval`→attention，busy→idle→finished，`error`）映射到相同路由器。
- **command-palette/** - 用于操作和导航的模态命令面板（`CommandPalette.tsx`、`commands.ts`）。
- **spaces/** - 工作区空间/项目（名称、根、环境、颜色、每空间标签页持久化）通过 `useSpaces` 和 `SpaceSwitcher`。
- **ai/** - 见下文。

### AI 子系统（`src/modules/ai/`）

BYOK。通过 `@ai-sdk/*` 的云服务提供商：**OpenAI、Anthropic、Google、xAI、Cerebras、Groq、DeepSeek、Mistral、OpenRouter**，加上用于任何自定义基础 URL 的 **OpenAI-compatible**。本地/离线提供商（密钥可选、运行时提供模型 ID）：**LM Studio、MLX、Ollama**。提供商列表在 `config.ts`（`PROVIDERS`）；模型注册表包括 `DEFAULT_MODEL_ID` + `DEFAULT_AUTOCOMPLETE_MODEL`。

- **密钥存储**：通过 `keyring`（Rust）的 OS 密钥链。前端通过 `secrets_*` 命令读写。服务 `KEYRING_SERVICE = "terax-ai"`。绝不将密钥持久化到磁盘、设置存储或 `localStorage`。
- **智能体**（`lib/agent.ts`）：`Experimental_Agent` 带 `stopWhen: stepCountIs(MAX_AGENT_STEPS)` 和来自 `config.ts` 的系统提示。提供商分支发生在这里 - 保持 `Agent` / `DirectChatTransport` 形状；系统其余部分依赖 AI SDK v6 聊天语义。
- **子智能体**（`agents/registry.ts`、`agents/runSubagent.ts`）：具有自己系统提示和工具子集的命名子智能体，由主智能体通过 `run_subagent` 工具调用。
- **会话**（`lib/sessions.ts` + `store/chatStore.ts`）：对话组织为命名会话，通过 `tauri-plugin-store` 持久化在 `terax-ai-sessions.json`（列表 + `activeId` + 每会话 `messages:<id>` 键）。`chatStore.ts` 保持模块作用域的 `Map<sessionId, Chat<UIMessage>>`；`getOrCreateChat(apiKey, sessionId)` 惰性构建 `Chat`，由 `hydrateSessions()` 填充的水合地图中的消息播种（从 `App.tsx` 调用一次）。`AgentRunBridge` 在每次更改时将活动会话消息镜像到磁盘并从第一条用户消息自动派生标题。切换 API 密钥会清除聊天地图；会话持久化。
- **Composer**（`lib/composer.tsx`）：React 上下文为 docked `AiInputBar` 和其他任何表面提供共享输入状态（文本、附件、语音）。附件包括图像、文本文件和 `selection` 类型 - 选择来自 `useChatStore.attachSelection(text, source)`（排入 chips，不粘贴到 textarea）并在提交时包装为 `<selection source="terminal|editor">…</selection>` 块。Composer 从 `agentMeta.status` 派生 `isBusy` 以便在会话水合前安全挂载。
- **语音输入**：流式转录管道。从 composer 切换。
- **实时上下文桥接**：`App.tsx` 调用 `setLive({ getCwd, getTerminalContext, … })` 使工具能读取 *当前活动* 终端的 cwd + 缓冲区最后 300 行。设计为懒 - 不要预先快照。
- **工具**（`tools/tools.ts`）：`read_file`、`list_directory`、`fs_search`、`fs_grep` 自动执行。`write_file`、`create_directory`、`rename`、`delete`、`run_command`、`shell_session_run`、`shell_bg_spawn` 设置 `needsApproval: true`，AI SDK 暂停等待 UI 确认卡片。审批后自动发送使用 `lastAssistantMessageIsCompleteWithApprovalResponses`。`lib/security.ts` 是 deny-list，拒绝明显的密钥路径（`.env*`、`.ssh/`、凭证、密钥链目录）- 在**读写**路径上都应用，不要绕过它。
- **编辑 diff**：AI 提议的编辑在并排 diff 标签页（`ai-diff` 标签页类型）中打开；用户在写工具实际运行前按块接受/拒绝。
- **技能/片段**：可重用的提示片段 + 工具包在 composer 中显示。

### UI 约定

- **shadcn/ui** 已配置（`components.json`，风格 `radix-luma`，基础 `mist`，图标库 **hugeicons**）。基本组件在 `src/components/ui/` - 不要手动编辑；重新运行 `pnpm dlx shadcn add` 升级。
- **AI Elements**（Vercel）位于 `src/components/ai-elements/`，来自 `components.json` 中的 `@ai-elements` 注册表。相同规则：重新生成，不要手动修补 - 组合包装属于 `modules/ai/components/`。
- **Tailwind v4** - 无 `tailwind.config.*`，配置在 `src/App.css` 中通过 `@theme`。使用来自 `@/lib/utils` 的 `cn()`。
- 动画：`motion`（Framer Motion 继任者）。可调整大小的布局：`react-resizable-panels`。
- 路径导入：始终 `@/…`，模块间禁止相对路径。
- 跨平台路径：任何可能源自 OSC 7、资源管理器或 OS 的路径，用 `.split(/[\\/]/)` 规范化分隔符而非 `.split("/")`。
- 前端的规范路径形式是**正斜杠**。`homeDir()` 在 Windows 上返回反斜杠；在边界转换（App.tsx setHome）。OSC 7 已作为正斜杠到达。相等的规范字符串使 `useFileTree` 在 `tab.cwd` 首次到达时不会清除其树并闪烁资源管理器。

### 窗口样式

- macOS：`titleBarStyle: Overlay` + `hiddenTitle: true` 在 `tauri.conf.json` 中（通过 overlay 的原生交通灯）。
- Linux：`decorations: false` + `transparent: true` 来自 `tauri.linux.conf.json`；在 GNOME/Mutter CSD 的 post-realize 后重新断言。
- Windows：与 Linux 相同，通过 `tauri.windows.conf.json`。React 渲染自定义 `WindowControls`。

### Tauri 能力

`src-tauri/capabilities/default.json` 是 webview 可用的插件 API 的白名单。新插件（dialog、autostart、updater、window-state、store、opener、os、log 已在 `lib.rs` 中接线）通常需要：
1. `Cargo.toml` 依赖
2. `lib.rs` `run()` 中的 `.plugin(...)` 调用
3. `default.json` 中的能力条目

### 跨平台约定

- HOME / 缓存目录：使用 `dirs` crate（`dirs::home_dir()`、`dirs::cache_dir()`），永远不使用原始的 `$HOME` / `%USERPROFILE%`。
- Shell 初始化脚本：将 Unix 专用逻辑 Gate 在 `#[cfg(unix)]` 后；Windows 分支在 `pty::shell_init::windows`。
- 终端输入：发送 `\\r`（CR）作为 Enter，而非 `\\n`（LF）- Windows 上的 PowerShell 需要 CR。

### Bundle 配置

- `bundle.targets: "all"` 加上 `tauri.conf.json` 中的每平台部分：
  - **macOS**：`minimumSystemVersion: 10.15`。
  - **Linux**：deb 依赖 `libwebkit2gtk-4.1-0`、`libgtk-3-0`；rpm `webkit2gtk4.1`、`gtk3`；AppImage bundle 其媒体框架。
  - **Windows**：NSIS 安装程序在 `currentUser` 模式（不需要管理员），WebView2 通过 `embedBootstrapper`（离线安装）。
- 自动更新配置了公开 minisign 密钥；发布制品在 `https://github.com/crynta/terax-ai/releases/latest/download/latest.json`。

### 已知陷阱

- **React 19 strict mode** 在开发中双挂载 `useEffect` → 首次渲染时终端启动两次。第一个 PTY 几乎立即清理。`SPAWN_LOCK` 互斥序列化此问题；不要对开发日志中 `pty opened id=1` 后跟 `pty closed id=1` 感到惊讶。
- **Windows PowerShell 进程生命周期**：`portable-pty` 的 `killer.kill()` 只杀死直接子进程。后代（例如在 pwsh 内启动的 `npm run dev`）除非其他东西将其关闭才会存活。`pty/job.rs` 中的 Job Object 处理 Terax 进程死亡情况；来自 JS 的显式 `pty_close` 也仅杀死直接子进程 + 依赖 Job 处理其余部分。没有替代方案不要禁用 Job。
- **标签页 `cwd` 存储**：来自 OSC 7，带正斜杠（`parseOsc7` 剥离 `/C:` → `C:` 后）。任何消费 `tab.cwd` 并在 Windows 上传递给 Rust fs 命令的东西必须规范化分隔符或接受两种形式 - `pty::shell_init` 中的 `apply_common` 为此处理 PTY 启动；其他调用点必须自己处理。

## 延伸阅读

长篇贡献者指南位于 `docs/` 下。这些指南阐述 `TERAX.md`；如有任何冲突，`TERAX.md` 优先。

- `docs/README.md` - 贡献者指南索引
- `docs/architecture/two-process-model.md` - IPC 边界和命令参考
- `docs/architecture/pty-shell-integration.md` - PTY、shell 初始化脚本、OSC、ConPTY、Job Object
- `docs/architecture/security-model.md` - 综合安全模型和边界
- `docs/architecture/ai-subsystem.md` - AI 栈、会话、工具、添加提供商
- `docs/architecture/terminal-renderer-pool.md` - 渲染器池和 DormantRing 不变量
- `docs/contributing/testing.md` - 测试合同和核心子系统不变量
