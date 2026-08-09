# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此仓库工作时提供指导。

---

## 项目概览

**Terax 中文版** —— 开源轻量级 AI 原生终端（ADE）
- **技术栈**：Tauri 2 + Rust（后端）/ React 19 + TypeScript（前端）
- **包管理**：**pnpm**（必须）
- **平台**：macOS、Linux、Windows
- **Bundle 大小**：~7-8 MB（超轻量）
- **架构**：双进程模型（Rust PTY/IPC 后端 + 隔离 React webview 前端）
- **无遥测、无账号、密钥存系统 keychain**

---

## 开发命令速查

### 前端（pnpm）

```bash
pnpm install           # 安装依赖
pnpm dev               # 开发模式（Vite + Tauri 联动）
pnpm build             # 生产打包（tsc + vite build）
pnpm preview           # 预览生产构建

pnpm lint              # Biome 代码检查
pnpm lint:fix          # 自动修复
pnpm check-types       # TypeScript 类型检查
pnpm test              # Vitest 单元测试（一次性运行）
pnpm test:watch        # 监听模式

pnpm format            # Biome 代码格式化
pnpm size              # size-limit 分析
pnpm analyze:bundle    # Vite 依赖可视化分析
pnpm analyze:eager     # 检查 eager 包大小预算
```

### Rust（src-tauri/）

```bash
cd src-tauri

cargo clippy --all-targets --locked -- -D warnings    # Lint（与 CI 一致）
cargo nextest run --locked                             # 并行测试（推荐）
cargo test --locked                                    # 顺序测试（本地备选）
cargo build --release                                  # 生产构建
```

### 完整检查清单（CI 同步）

在声称完成前必须通过：
```bash
pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked
```

---

## 核心架构

### 双进程模型

**Rust（src-tauri/）** 独占所有 OS 访问权，webview 通过 `invoke()` 调用 Tauri 命令与之通信：

| 模块 | 职责 |
|------|------|
| `pty::*` | PTY 会话生命周期（portable-pty）、xterm 数据流、OSC 7/133 解析 |
| `fs::*` | 文件树读取、编辑器 I/O、模糊查找、内容搜索 |
| `git::*` | 完整 Git 操作（status/diff/stage/commit/push/log）+ 工作区授权网关 |
| `shell::*` | 一次性 shell 命令（AI 工具用）、持久 agent shell、后台进程管理 |
| `workspace::*` | 工作区/WSL 环境切换、授权注册表 |
| `lsp::*` | 语言服务器宿主（JSON-RPC 管道） |
| `net::*` | AI HTTP 代理（SSRF 防护） |
| `secrets::*` | OS keychain 集成 |

**React（src/）** 是单窗口应用，通过 `@/…` 路径别名组织模块。

### 前端模块布局

```
src/modules/
├── terminal/       # xterm.js 栈、OSC 处理、渲染器池（max 12）
├── editor/         # CodeMirror 6 + vim、格式化、LSP 集成、AI 自动补全
├── explorer/       # 文件树、模糊搜索、上下文菜单
├── preview/        # 本地开发服务器预览检测
├── tabs/           # 标签管理、cwd 继承、后台流式传输（未卸载）
├── source-control/ # Git 暂存/提交、diff 工作流
├── git-history/    # 提交图谱、分支、ref 管理
├── lsp/            # 语言服务器池、session 管理、诊断
├── ai/             # Agent、会话、Composer、工具审批、技能库
├── theme/          # 主题引擎、CSS 变量、预设 + 用户主题
├── agents/         # 终端 agent 通知（Claude/Codex/Gemini/Pi）
├── settings/       # 偏好设置、keychain 绑定
└── workspace/      # 环境切换（本地/WSL）
```

### 关键设计原则

1. **纯函数核心 + 命令式外壳**：业务逻辑在轻量纯函数中（易测试），Tauri 命令和 React 组件保持精简。
2. **零成本抽象**：已禁用的功能不占资源（无 LSP 进程、无多余 re-render）。
3. **渲染器池**：xterm 最多 12 个实例，后台标签页流式传输到 DormantRing 缓冲（1 MiB），避免重排。
4. **标签页不卸载**：`invisible pointer-events-none` 隐藏而非销毁，PTY/dev-server 持续流式。
5. **跨平台路径规范**：前端使用 forward-slash，Windows 路径在边界规范化。

---

## 质量标准（必读）

生产级代码或不交付。每个改动都需通过以下四道：

| 标准 | 说明 |
|------|------|
| **正确性** | 边界情况、失败模式、并发访问——无"先这样行" |
| **性能** | RAM/IPC/重排/依赖权衡——每改动都问"成本多少" |
| **安全** | 边界验证、密钥路径拒绝列表（读写都适用） |
| **UX/UI** | 抛光、专业、细节完善 |

---

## 代码约定

- **注释**：默认无，代码自解释。需要时只写 1-2 行 WHY，不写 WHAT。
- **导入**：前端统一 `@/…`，禁止跨模块相对路径。
- **路径**：跨平台用 `.split(/[\\/]/)` 而非 `.split("/")`。
- **Tailwind**：v4，配置在 `src/App.css` 的 `@theme` 块，用 `cn()` 工具函数。
- **Biome**：代码检查 + 格式化（配置在 `biome.json`）。
- **TypeScript**：严格模式，无 `any`。
- **无 em-dash、无 emoji**（代码/注释/commits 都不用）。

---

## PTY 和 Shell 集成

### 启动脚本注入

Shell 初始化脚本在 `src-tauri/src/modules/pty/scripts/`：

- **Unix**（zsh/bash/fish）：注入 OSC 7（cwd 报告）+ OSC 133 A/B/C/D（提示符界限、退出码）
- **Windows**（PowerShell）：`profile.ps1` 通过 `-File` 传入，同样发送 OSC 7 + 133

### ConPTY 锁

Windows ConPTY 需 `SPAWN_LOCK` 互斥体（`session.rs`）。并发启动会导致其中一个 PTY 输出管道卡顿——删除前验证 tab 快速切换稳定。

### Job Object（Windows）

每个 ConPTY 子进程加入 per-session **Job Object**（`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`）。`Terax` 进程被 kill 时，kernel 自动杀死所有后代（避免孤儿）。

---

## AI 子系统

### 工具管理

- **自动执行**：`read_file`, `list_directory`, `fs_search`, `fs_grep`
- **需审批**：`write_file`, `delete`, `run_command`, `shell_*`（审批卡片 UI 确认后才执行）
- **安全层**：`lib/security.ts` 拒绝列表（`.env*`, `.ssh/`, 凭证路径）适用读写两端

### 会话存储

会话通过 `tauri-plugin-store` 持久化到 `terax-ai-sessions.json`，**密钥永不落盘**（仅 OS keychain）。

---

## LSP（语言服务器）

- **零成本启用**：未激活时无进程、无 PATH 检查、没有 eager bundle 负担（14.5 kB shell 而已）
- **会话管理**：按 (server, workspace-root) 键值、引用计数、idle 3 分钟自动杀、连续崩溃回退
- **资源上限**：4 sessions per server；root marker 缺失则不启动；>4MB 文件关闭语法高亮和 LSP

---

## 编辑器细节

- **缓冲 EOL**：LF 内部，保存时恢复原始 EOL（多数投票检测）
- **缩进单位**：per-file 检测，支持 compartment 动态切换
- **冲突检查**：写入前对比 mtime，不一致→警告 toast（显式 Overwrite）
- **文件大小**：>10 MB 提示"继续打开"，>50 MB 硬上限
- **格式化**：支持 biome/prettier/ruff/rustfmt/gofmt/clang-format/shfmt/zig fmt + 自定义 `{file}` 模板
- **AI 补全**：缓冲缩进单位随请求发送，响应规范化 tab/space 混用、多行 ghost 带块级 widget、closer-only 行隐藏重排

---

## 主题系统

- **无 next-themes**：自建 ThemeProvider（CSS 变量）
- **预设**：terax-default, claude, kanagawa（3 款）, tokyo-night, catppuccin, rose-pine, everforest, nord, gruvbox, dracula, solarized, tide, sage, caffeine
- **用户主题**：`customThemes.ts` + `validateTheme.ts`，可选背景图（blur + opacity）
- **编辑器主题独立**：`editorTheme` pref 可 `"auto"` 或指定 id，自动模式跟随应用主题

---

## 已知陷阱（Gotchas）

| 陷阱 | 原因 | 处理 |
|------|------|------|
| React 19 strict 双挂载 | dev 双调用 useEffect | 第一个 PTY 立即清理，SPAWN_LOCK 序列化 |
| Windows PowerShell 孤儿 | `killer.kill()` 仅杀即时子进程 | Job Object（进程组杀）+ pty_close 清理 |
| Tab cwd 存储格式 | OSC 7 forward-slash，Win 命令接 backslash | 边界规范化（fs 命令已处理） |
| AiComposerProvider 挂载 | 条件 mount 在 key 加载时重挂全树 | 无条件挂载（keychain 读通常同一帧） |
| DormantRing 缓冲 | 后台标签页中途卡阻 | 切换后再序列化，禁止 mid-command 标签快照 |
