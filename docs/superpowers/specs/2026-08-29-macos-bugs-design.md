# macOS 平台 Bug 修复设计（修订版）

目标：修复 `docs/2026-08-27-pending-issues-plan.md` 第四节列出的三项 macOS bug。本机 macOS 14（Darwin 23.6）无法复现任何一项报告环境；#1168/#933 靠防御性探测与上游官方缓解，#449 靠代码审查 + 逻辑验证。

修订说明：初版审查发现 #1168 的离屏探测方案修不了自己的根因（乱码时 context 是创建成功的），已重定向为上游官方选项；#449 撤回了与 TOCTOU 设计冲突的 authorize 缓存化。

---

## Bug #1168 — macOS 中文渲染乱码/重叠

### 症状
CJK 字符乱码、字形重叠、随机字符替换、同一行内正误混杂（报告于 macOS 26 / Terax 0.8.6，用户渲染了大量不同汉字）。

### 根因分层
症状实为两类问题的叠加：

1. **glyph 重叠**：单 cell 宽字形溢出到相邻 cell。xterm.js 5.5.0 引入 opt-in 选项 `rescaleOverlappingGlyphs` 官方缓解（来源：xtermjs/xterm.js discussions/5022；同类报告见 wavetermdev/waveterm#3386）。xterm 6 typings 确认存在（`node_modules/@xterm/xterm/typings/xterm.d.ts:231`），本项目从未启用。选项仅在 GPU renderer 生效（DOM renderer 下无效，文档明示）
2. **乱码/随机替换**：WebGL char atlas 槽位错位类问题（大量不同 glyph 后出现）。上游无已确认的修复版本，且渲染错误无法在代码层自动判定（像素对错不可机检）。**本批不做，留档待上游**；用户侧兜底是现有 Settings 的 WebGL 开关

初版方案的离屏 context 探测与本 bug 无关（乱码时 context 创建成功），已移入 #933。

### 方案
`termOptions()`（`src/modules/terminal/lib/rendererPool.ts:184`）加 `rescaleOverlappingGlyphs: true`，一行改动。

### 改动点
1. `src/modules/terminal/lib/rendererPool.ts`：`termOptions()` 返回对象加 `rescaleOverlappingGlyphs: true`
2. `docs/2026-08-27-pending-issues-plan.md`：#1168 行更新状态——重叠部分已修，atlas 乱码部分留档待上游

### 已知限制
- 不修 atlas 槽位错位型乱码（上游无修复可引用）
- `@xterm/addon-webgl` 升级到 0.20 beta 不在本次范围（beta 通道，无 CJK 修复的确认证据）

### 测试策略
- 本机回归：macOS + WebGL 开启，中文/日文/emoji/powerline 混排渲染目检（emoji/powerline/nerd font 是选项文档明示的不重缩放白名单，需确认无回归）
- `rendererPool.test.ts`：断言 `termOptions()` 含该选项（防误删）
- 报告环境（macOS 26）验证依赖用户反馈

---

## Bug #933 — macOS 13.0.1 安装后白屏

### 症状
全窗口空白（不是仅终端区），报告于 macOS 13 Intel / Terax 0.8.2。无法本机复现；两种假设：(a) 旧 WebKit WebGL context 创建**静默失败**（不抛异常，canvas 挂上但渲染不出 → 终端区白），(b) React 早期 crash（JS 兼容性等 → 全窗口白）。

### 方案（两层，互为补充）
1. **离屏 WebGL context 探测**（覆盖假设 a）：app 初始化早期用离屏 canvas 试建 WebGL2 context；失败则置 preferences store 标志 `webglRendererUnusable: true`，`attachWebgl` 读该标志跳过加载（走 DOM 渲染），并经 sonner toast 提示"WebGL 不可用，已改用兼容渲染"
2. **React Error Boundary**（覆盖假设 b）：新建 `src/components/ErrorBoundary.tsx`，包住 App 渲染的组件树（注意：本项目无 react-router，"包 App 内组件树"指 App.tsx 返回的 JSX 根），catch 渲染错误后显示 fallback UI（中文提示 + "重启"按钮 `window.location.reload()`），阻止整页空白
3. **前端错误转发 Rust 日志**：`@tauri-apps/plugin-log`（package.json:70，已安装）的 `error()` 在 `window.addEventListener('error')` / `unhandledrejection` 里调用，日志经 tauri-plugin-log 落到 `app_local_data_dir` 日志文件（lib.rs:197 已配置，默认 LogDir target）。用户报 issue 时可附日志

### 改动点
1. `src/modules/settings/store.ts`：新增 `webglRendererUnusable: boolean`（默认 false）+ `detectWebglRenderer()`（offscreen canvas → `getContext('webgl2')`，null 则置位）；`init()` 里调用
2. `src/modules/terminal/lib/rendererPool.ts`：`attachWebgl` 前置门（rendererPool.ts:850 处）加 `webglRendererUnusable` 检查；探测失败时 sonner toast 一次（防重复提示）
3. `src/components/ErrorBoundary.tsx`：新建，React class component（`getDerivedStateFromError` + `componentDidCatch`），fallback 含重启按钮
4. `src/app/App.tsx`：用 `<ErrorBoundary>` 包返回的组件树根
5. `src/main.tsx`：`window.addEventListener('error')` + `unhandledrejection` → `console.error` + `@tauri-apps/plugin-log` 的 `error()`

### 明确不做
- 不写独立日志文件（无 fs command 新增，避免权限面扩大）
- 不自动重启（fallback 提供手动按钮）
- 不改 tauri-plugin-log 配置（默认 LogDir target 已够）

### 测试策略
- 单元：mock `document.createElement('canvas')` 返回 getContext 为 null → 断言 `webglRendererUnusable` 置位、`attachWebgl` 早退
- 组件：子组件渲染期 throw → ErrorBoundary 显示 fallback、不整页空白（`ErrorBoundary.test.tsx` 新建）
- main.tsx 的全局 handler：模拟 unhandled rejection → 断言 `console.error` 调用
- 手动：本机开关 WebGL 开关确认探测路径无副作用

---

## Bug #449 — 外接硬盘目录新 tab 挂起

### 症状
项目在外接卷上时 Cmd+T 新建 tab 永不加载（报告于 macOS 26 Apple Silicon / Terax 0.7.1）。

### 根因
`pty_open`（`src-tauri/src/modules/pty/mod.rs:51`）是 async command，但在命令体内**同步**调用 `user_spawn_cwd_or_home` → `authorize_user_spawn_cwd` → `std::fs::canonicalize`（workspace.rs:110）。外接卷休眠时 canonicalize 阻塞数秒到数十秒：既卡住该命令的返回（tab 永不出），又占死一个 async runtime worker 线程。

### 方案
1. cwd 解析挪进 `tauri::async_runtime::spawn_blocking`，外层 `tokio::time::timeout(Duration::from_secs(3))`
2. 超时处理：记录 `log::warn!`，按现有 Err → None 语义回退 home（`user_spawn_cwd_or_home` 的既有行为，tab 能开）
3. `is_executable_dir`（workspace.rs:231）的 exe_dir canonicalize 结果用 `OnceLock<PathBuf>` 缓存——`current_exe()` 启动后不变，无需每次 canonicalize。**保持纯函数签名**（workspace.rs:199 注释明示 pure 是为可测试性，workspace.rs:926-954 测试依赖）

### 明确不做（初版撤回项）
- **不用 `canonicalize_cached` 替换 authorize 路径的 `std::fs::canonicalize`**：workspace.rs:9-11 注释明示短 TTL 是为 "keeps the auth-check TOCTOU window tight"，授权检查故意无缓存；缓存化会引入 1s symlink 替换窗口。spawn_blocking + timeout 已解决挂起，无需此微优化
- 不给 `is_executable_dir` 传 `&WorkspaceRegistry` 参数（破坏纯函数测试性）

### 边界与不变量
- 内盘正常路径：spawn_blocking 开销微秒级，3s 超时永不触发，行为不变
- 超时后 spawn_blocking 内的 canonicalize 仍在后台跑（detached，占一个 blocking 线程直到卷响应）——可接受，tokio blocking pool 动态扩容
- 超时回退 home 的授权语义不变：home 由 `bootstrap_registry`（lib.rs:232 调用）显式授权
- 并发开 tab：各自独立 spawn_blocking + 超时，互不阻塞

### 改动点
1. `src-tauri/src/modules/pty/mod.rs`：`pty_open` 的 `user_spawn_cwd_or_home` 调用包 `spawn_blocking` + `tokio::time::timeout`；超时分支 `log::warn!` + 返回 None 等价行为
2. `src-tauri/src/modules/workspace.rs`：`is_executable_dir` 内 exe canonicalize 提为 `OnceLock` 缓存（模块级 `fn canonical_exe_dir() -> Option<&'static Path>` 之类）

### 测试策略
- 既有 `choose_launch_dir` 三测试（workspace.rs:926-954）不改，跑通即证明纯函数签名未破坏
- 新增：`is_executable_dir` 对 exe 目录返回 true 的既有语义测试（若无可加，用 tempdir + 测试内改 current_exe 不可行则留手动）
- 超时分支：超时时长提为参数或 `#[cfg(test)]` 缩短，用真实 sleep 验证 Elapsed → home 回退分支；若注入代价高则该分支靠 code review（如实标注）
- 手动：有外接卷时开 tab 验证；无卷则 `cargo nextest run` 全绿 + review 确认模式正确

---

## 跨 bug 协调

- 离屏探测属 #933（context 静默失败），`rescaleOverlappingGlyphs` 属 #1168（渲染正确性），两者不再混用
- #933 的 plugin-log 转发复用 lib.rs:197 既有 log 配置，无新增 Rust 依赖
- #449 与 #816 共用"不可用 → home"语义（#816 启动路径已修，#449 是 spawn 运行时路径）

## 不做什么

- 不做 atlas 槽位错位型乱码修复（上游无修复可引用，渲染错误不可机检）
- 不升级 `@xterm/addon-webgl` 0.20 beta（无 CJK 修复确认证据）
- 不缓存 authorize 路径 canonicalize（TOCTOU，见 #449 撤回项）
- 不做 Wayland（#1167）/ 其他平台 bug
- toast 不暴露错误栈细节

## 验收标准

1. 本机 `pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked` 全绿
2. `docs/2026-08-27-pending-issues-plan.md` **第四节** macOS 行更新状态与提交哈希（#1168 注明 atlas 部分留档）
3. 代码审查：#449 async 命令体无同步文件系统调用；#933 探测不阻塞启动、错误转发不泄漏敏感信息；#1168 选项启用后本机中英混排无回归
