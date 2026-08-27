# 上游 Issue 修复计划（2026-08-27 更新）

来源：`gh issue list --repo crynta/terax-ai --state open --limit 200`，2026-08-27 抓取。
原始明细见 `docs/2026-08-27-upstream-issues.md`（200 条原始 issue）。

---

## 一、已在本仓库修复（不再处理）

| Issue | 修复提交 |
|-------|---------|
| #1137 custom endpoint commit message 报错 | `4224a5d` |
| #1089 markdown 公式 + 外链图片 | `3827c96..3c8dd38`（6 个提交）|
| #1159 space 切换后侧栏不更新 | `169416c` |
| #1156 + #977 ConPTY race（drop_session emit → 前端 await） | `5362206` |
| #1028 breadcrumb `sendCd` 加 `leafBusy` 守卫 | `c962152` |
| #816 启动 cwd 校验（被删目录回退 home） | `26c8649` |
| #951 提交新消息前自动 deny 未处理 approval | `e80998b` |
| #845 前半：抽取 `resolveComposerEnterAction` 纯函数固化已知限制 | `02d20b0` |
| #873 macOS IME 组播时 picker Tab/Enter 不误选 | `a145a27` |
| #909 自定义终端 agent 命令名检测 | `fa203c9..6bb7507`（8 个提交）|

---

## 二、上游 PR 已开未合（等上游合并后 cherry-pick）

| Issue | 上游 PR | 说明 |
|-------|---------|------|
| #1009 Option+Arrow/Backspace macOS 失效 | [pr/1215](https://github.com/crynta/terax-ai/pull/1215) | 窄化 IME keyCode 229 守卫 |
| #857 Windows 首键吞没 | [pr/962](https://github.com/crynta/terax-ai/pull/962) | 新 terminal 打开后首 keystroke 丢失 |
| #1148 preview iframe cookie 被拦 | [pr/1228](https://github.com/crynta/terax-ai/pull/1228) | 仅加提示 hint，不修 sandbox |

**行动**：跟踪这三个 PR，上游合并后 cherry-pick 到中文版。

---

## 三、Windows 平台 Bug（按优先级排序）

### P0 — 崩溃 / 数据丢失

| # | 标题 | 根因分析 | 工作量 | 备注 |
|---|------|---------|--------|------|
| **1156** | Crash switching WSL→Local（静默退出） | `switchWorkspace` 同步调用 `clearWorkspaceState()`（dispose 所有 session）→ 立即 `resetWorkspace()` 创建新 tab。Windows 上 `pty_close` → `drop_session` 是异步线程（spawn "terax-pty-drop-{id}"），50ms 等待期不够 reader thread 从 master pipe 的 `ReadFile` 返回。新 `pty_open` 在旧 reader 还持 master handle 时触发，ConPTY 状态被破坏，新 shell 无法 pump 输出，进程直接退出。**CONPTY_LIFECYCLE_LOCK 只序列化 pty_close/pty_open 的 mutex，不保证 reader thread 已退出** | 中（Rust + TS） | 见下文方案 |
| **977** | WSL→Local 后 tab 丢失 | 与 #1156 同根因；crash 较轻时表现是 tab 状态丢失 | 小（附随于 #1156 修复） | |
| **592** | agent 运行时 tab 失去焦点时终端冻结 | 可能相关：reader thread 竞争 + agent detector 占用 flusher | 待确认 | 需 Windows 复现 |
| **659** | cmd+w 在 Preview tab 关闭整个 terminal 并丢失 session | `handleWorkspaceChange` 触发 `clearWorkspaceState()` 会 dispose 所有 live sessions；Preview tab 按 cmd+w 可能误触发 workspace switch 而非 tab close | 小 | 确认路径后单行修复 |
| **951** | 错过 AI approval 弹框后 app 失去响应 | approval 状态机未重置，后续所有消息被拦截 | 小 | |

### P1 — 核心体验（输入/检测）

| # | 标题 | 根因分析 | 工作量 |
|---|------|---------|--------|
| **845** | Windows 多行 paste 自动提交 + voice-to-text 无效 | 后半段（voice-to-text）已通过 `isComposing` 守卫修复（`cfc4daa`）。前半段（多行 paste 自动提交）根因推测：Win+V 剪贴板历史/部分语音工具用模拟按键逐字符注入文本而非真正粘贴，换行会变成真实的 `Enter` keydown，与用户主动按 Enter 提交在 DOM 层不可区分；**未在真实 Windows 环境验证**，暂未改运行时逻辑。已提取 `resolveComposerEnterAction`（`AiComposerInput.tsx`）并在 `AiComposerInput.test.ts` 中用测试记录该已知限制，等待 Windows 复现后再决定采用按键时间间隔启发式等修复方案 | 小（测试已写，运行时修复待定） |
| **1077** | Windows IME candidate window 在 TUI 输出时跳动 | TUI OSC 流触发 xterm 重绘 → textarea blur/focus 抖动 → IME candidate window 位置重算 | 中（xterm IME 已知问题） |
| **909** | Windows 上 Claude Code 不被检测 | 默认检测 `claude` 命令；用户用别名 `cc` 启动时无效。需支持自定义命令名配置 | 小 |
| **909** | 同上（中文版扩展） | 支持任意用户配置的 alias（如 `ca`、`cca`），且内置 AI agent 都可通过 Settings > Agents 设置 `terminalCommand`/`terminalAgent`，自动派生到 alias map | 小 |
| **1132** | Win11 codeblocks 不嵌入 | Windows WebView2 markdown 渲染差异，可能 CSP 或 HTML 转义路径不同 | 待诊断 |
| **630** | Windows WebGL off 导致无法输入 | WebGL 初始化失败时 fallback 路径未正确建立 textarea focus | 小 |

### P2 — 稳定性 / 路径

| # | 标题 | 工作量 |
|---|------|--------|
| **816** | 右键"用 Terax 打开"的目录被删除后 app 卡死 | 启动时校验 cwd 存在性，不存在则 fallback 到 home | 小 |
| **814** | git add 全选随机失败（删除文件后） | git status parsing 竞态，需加重试或锁 | 中 |
| **566** | Windows explorer 无法访问 D:\ 盘 | `list_drives` 已有；explorer 未使用盘符选择器，仍走固定 cwd | 小（接线） |
| **1222** | macOS 快速打字字符遗漏 | xterm buffer overflow 或 keydown 事件丢帧；需在 macOS 复现确认 | 待诊断 |

---

## 四、macOS 平台 Bug

| # | 标题 | 根因分析 | 工作量 |
|---|------|---------|--------|
| **873** | macOS IME  composing 时 Enter 直接提交 AI 消息 | `AiComposerInput.tsx:257` Enter handler 缺 `isComposing` 守卫（同 #845 前半段） | 小（1 行） |
| **1168** | macOS 中文渲染乱码/重叠 | WebGL renderer + CJK glyph 已知问题（上游 #750 同类）；fallback Canvas renderer 可能正常 | 中 |
| **933** | macOS 13.0.1 安装后白屏 | 旧版 macOS WebGL 不支持 + 启动时未 fallback | 小 |
| **449** | macOS 外接硬盘目录新 tab 挂起 | `is_usable_launch_dir` 对外接卷响应慢；`canonicalize` 卡住 | 中 |

---

## 五、Linux / Wayland Bug

| # | 标题 | 根因分析 | 工作量 |
|---|------|---------|--------|
| **1167** | Wayland 下按键指数倍增（1,2,4,8...） | 报告推测 `wl_seat::capabilities` 事件重复调用 `get_keyboard()` 未 release 旧对象，导致多个 keyboard listener 同时接收事件 | 中（需 Rust Wayland 客户端代码审查） |
| **1001** | Linux fcitx5 IME commit 文本重复 | GTK IM context `commit_string` 信号后 composition buffer 未清空 | 中（WebKitGTK IM 管线） |
| **1104** | Ubuntu markdown 外链无法打开 | `openExternalLink` 在 Linux WebKit2GTK 下实现缺失或有 bug | 小 |
| **1039** | LSP 全部不工作 | LSP SDK 路径配置问题，需看具体 log | 待诊断 |
| **424/422/615** | CachyOS/AppImage/libpcre2 启动失败 | 打包依赖兼容性问题，上游发行版差异 | 中（非代码问题，需 release 配置调整） |

---

## 六、跨平台 Bug

| # | 标题 | 根因分析 | 工作量 |
|---|------|---------|--------|
| **1028** | 状态栏 breadcrumb `cd` 打入前台 TUI | `sendCd`（`App.tsx:650`）直接 `term.write()` 无 `leafBusy` 检查；`leafBusy` 已在 `useTerminalSession.ts:295` 实现但未暴露给 App 层 | 小（暴露 + 加守卫） |
| **988** | 撤销 editor 变更后面板不刷新 | editor undo/redo 后未触发 pane re-render | 待诊断 |
| **807** | localhost:3000 preview 白屏 | preview iframe CORS / CSP 限制，或 dev server HMR 路径问题 | 中 |
| **672** | Windows Composer AI "Failed to fetch" | Windows WebView2 fetch 代理/证书问题 | 待诊断 |
| **1107** | macOS "Request failed / load failed" | AI transport 错误处理路径，需看 log | 待诊断 |
| **974** | 连接 LLM provider 后 agent 不工作 | 同 #1107 类问题，provider 配置未正确下发 | 待诊断 |
| **514** | 待 tool call 时发 follow-up prompt 卡死 | agent session 状态机不允许 pending 时的新消息 | 中 |

---

## 七、推荐修复顺序

### 第一批（本周，低 hanging fruit）

1. **#873** — macOS IME Enter 守卫（1 行，`AiComposerInput.tsx`）— ✅ `a145a27`
2. **#845 前半** — Windows 多行 paste 自动提交：已写测试固化已知限制（`resolveComposerEnterAction`），运行时修复待 Windows 复现后再定
3. **#1028** — breadcrumb `sendCd` 加 `leafBusy` 守卫 — ✅ `c962152`
4. **#816** — 启动 cwd 不存在性检查 — ✅ `26c8649`
5. **#951** — AI approval 状态机重置 — ✅ `e80998b`

### 第二批（本周，中等）

6. **#1156 + #977** — ConPTY lifecycle race（Rust `drop_session` 加 reader thread join 超时，或前端 `switchWorkspace` 改为 async drain 后再 reset）— ✅ `5362206`
7. **#909** — Claude Code 自定义命令检测（配置项 + alias 匹配）— ✅ `fa203c9..6bb7507`（8 个提交）
   - Rust：`AgentDetector` 接受 `AliasMap`，`pty_open` 快照当前 alias map；新增全局 `AliasState` + Tauri 命令 `update_agent_aliases`
   - TS：`Agent` 类型扩展 `terminalCommand`/`terminalAgent` 字段，老数据自动回填；`agentAliases.ts` LazyStore 持久化；`agentsStore` hydrate/upsert/remove 时触发同步
   - UI：AgentCard 加两个新字段；新增 `TerminalAgentAliasesSection`（auto-derived + manual rows）
   - 修复：alias 修改后 `respawnSession()` 即时重开所有终端 PTY，toast 提示用户
8. **#659** — Preview tab cmd+w 行为修正 — ⏸ 见下文 §10
9. **#630** — Windows WebGL fallback 路径

### 第三批（下周，需要诊断）

10. **#1167** — Wayland key duplication（需 Wayland 机器复现）
11. **#1001** — Linux fcitx5 IME duplicate（需 Linux 复现）
12. **#1168** — macOS CJK rendering（需复现确认 WebGL vs Canvas）
13. **#1222** — macOS fast typing char loss（需复现）

### 第四批（上游跟进）

14. **#1009** ← PR #1215（等上游合并）
15. **#857** ← PR #962（等上游合并）
16. **#1148** ← PR #1228（等上游合并）

---

## 八、#1156 根因分析与方案（详细）

### 根因

`useWorkspaceSwitcher.ts:switchWorkspace` 调用链：

```
clearWorkspaceState()   // 同步：disposeSession → pty.close() → invoke pty_close
setWorkspaceEnv(...)    // 同步
await authorizeHome()   // async Tauri command
resetWorkspace(nextHome)// 同步：add tab → disposeSession(旧) → 新 tab 自动 pty_open
```

`pty_close`（`src-tauri/src/modules/pty/mod.rs:171`）移除 session 后 spawn 一个 detatched 线程执行 `drop_session`：
- `drop_session` 持 `CONPTY_LIFECYCLE_LOCK`（Mutex）
- 线程内 `session.drop()` → field drop order: `_job` → `killer` → `writer` → `master`
- `master` Drop 调用 `ClosePseudoConsole`，**可能阻塞**直到 conhost drain 完成

`pty_open`（`session.rs:115`）同样持 `CONPTY_LIFECYCLE_LOCK`。

**race**：`clearWorkspaceState()` 发起 `pty_close` 后立即返回（detatched 线程），`resetWorkspace()` 在同一帧调用 `pty_open`。若旧 reader thread 还持有 master handle（`ReadFile` 未返回），`ClosePseudoConsole` 阻塞 → 新 `CreatePseudoConsole` 失败/损坏 → powershell.exe 启动后无输出 → 进程静默退出。

`session.rs:286` 的 50ms waiter 只在 child 已 exit 后才等 reader，但如果 child 还活着（shell 正在运行），waiter 立即返回。

### 方案 A（轻量，推荐）

在 `switchWorkspace` 前端侧，`clearWorkspaceState()` 之后、`resetWorkspace()` 之前，**等待所有 pty_close 完成**：

1. `pty_close` 完成时 emit 一个 tauri event `terax:pty-dropped`（带 id）
2. `clearWorkspaceState` 收集所有被 dispose 的 id，`await` 直到所有 id 都收到 `terax:pty-dropped`（加 200ms 超时兜底）
3. 再调用 `resetWorkspace`

改动点：
- `src-tauri/src/modules/pty/mod.rs`：`pty_close` 的 drop 线程完成时 emit event
- `src/modules/terminal/lib/useTerminalSession.ts`：`disposeSession` 返回 Promise 或 emit 事件
- `src/app/hooks/useWorkspaceSwitcher.ts`：`switchWorkspace` 等待事件

工作量：约 50 行 Rust + 30 行 TS。

### 方案 B（更彻底）

延长 `session.rs:286` 的 waiter 从 50ms → 500ms，并加 backoff 轮询 reader thread 是否真的 finished（而非仅 deadline 到了）；同时在 `drop_session` 里对 `ClosePseudoConsole` 加 timeout。这是 Rust 侧根治，但 500ms 延迟在正常 close 路径会增加用户感知等待。

**推荐方案 A**：0 额外延迟（正常路径不 wait），只在 switchWorkspace 场景等。

### 验证方式

Windows 机器上：
1. 开启 WSL distro
2. 在 Terax 切换到 WSL env
3. 通过状态栏切回 Local
4. 观察是否静默退出
5. 加 `RUST_LOG=debug` 跑，确认 log 里 `pty closed` → `pty session dropped` → `pty opened` 的时间间隔

---

## 九、开放问题

1. **#1156 复现**：需要在 Windows + WSL 环境实测验证上述根因假设；当前 dev 分支无 Windows CI 复现链路
2. **#1167 Wayland 倍增**：当前仓库无 Wayland 测试环境，需要 Linux contributor 复现后定位 `wl_keyboard` 绑定代码
3. **#1001 Linux IME 重复**：与 #1167 同属 IME 管线问题，但报告指向 GTK IM context，可能需单独 patch webkit2gtk 包装层
4. **#873 macOS IME Enter**：PR #1215 修的是 terminal pane 的 keyCode 229 守卫；AI composer 的 Enter 是独立代码路径，需单独 patch

---

## 十、#659 跳过理由（代码分析，不修）

### 用户报告

在 Preview tab 按 Cmd+W → "整个 terminal 关闭、所有 tab session 丢失"。

### 计划原假设（已否定）

> `handleWorkspaceChange` 触发 `clearWorkspaceState()` 会 dispose 所有 live sessions；Preview tab 按 cmd+w 可能误触发 workspace switch 而非 tab close

**实际代码追踪**：

```
Cmd+W
  → useGlobalShortcuts (window capture-phase)
  → tab.close 匹配  (shortcuts.ts:137)
  → handleCloseTabOrPane (App.tsx:819)
  → handleClose(activeId)  (useTabCloseGuards)
  → nextActiveInSpace === null → return  ← "最后标签不关"
```

**否定**：
- cmd+w 唯一绑定是 `tab.close`（`useGlobalShortcuts` 第 27-46 行 capture-loop，第一匹配即 return）
- `switchWorkspace` 只由状态栏 `handleWorkspaceChange` 触发，与键盘无关
- `getIsLeafBusy` 已 export 且 App.tsx:103 已 import（计划里"`leafBusy` 未暴露给 App 层"也不属实）
- PreviewPane / PreviewAddressBar 无 keydown handler 拦截 Cmd+W

### 三种场景的实测行为

| 场景 | 当前行为 | 期望 |
|---|---|---|
| 只有 Preview tab + Cmd+W | `nextActiveInSpace` 返回 null → early return → 啥也不发生 | 用户期望"只关 Preview tab"，但当前约定是"最后 tab 不关"（已测试）|
| Preview + 其他 tab + Cmd+W | Preview 移除，活动切到 fallback | 正常 |
| "整个 terminal 关闭" | 如果真发生，是 macOS Tauri 默认菜单的 Cmd+W `Close Window` 绕过了 webview `preventDefault`——不在前端代码可修复范围 |

### 决策

不在代码层动手。三条可走路径：

| 选项 | 内容 | 何时启动 |
|---|---|---|
| B | `handleCloseTabOrPane` 显式处理 `t.kind === "preview"`（如关掉后切到 home tab）| 决定改"最后 tab 不关"约定后再启 |
| C | 在 `src-tauri/tauri.conf.json` 或 Tauri 菜单注册里拦截 Cmd+W 关闭窗口 | 有 macOS 复现环境、能验证 OS-level 行为后 |
| D | 接受现状，关闭文档作为已知限制 | 复现失败 / 决定不值得修 |

**当前状态**：D，直到有 macOS 复现证据再升级到 B 或 C。

---

*上次更新：2026-08-27（#909 自定义终端 agent 命令检测完成，8 个提交）*
*原始 issue 明细：docs/2026-08-27-upstream-issues.md*
