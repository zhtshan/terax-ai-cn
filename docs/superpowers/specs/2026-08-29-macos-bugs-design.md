# macOS 平台 Bug 修复设计

目标：修复 `docs/2026-08-27-pending-issues-plan.md` 第四节列出的三项 macOS bug。本机 macOS 14（Darwin 23.6）无法复现任何一项；#1168/#933 靠防御性探测，#449 靠代码审查 + 逻辑验证。

---

## Bug #1168 — macOS 中文渲染乱码/重叠

### 症状
CJK 字符乱码、字形重叠、同一行内正误混杂（报告于 macOS 26 / Terax 0.8.6）。WebGL renderer 对复杂脚本有已知缺陷（上游 #750 同类）。

### 根因假设
`attachWebgl`（`rendererPool.ts:849`）的 catch 路径只覆盖**构造 WebglAddon 时抛异常**的情况（已随 #630 修复清理残留 canvas）。乱码属于"context 创建成功、addon 加载成功，但渲染 shader 对 CJK glyph 处理错误"，不会触发 catch；`webglInitFailed` 闩锁不会被置位，后续 slot 每次绑定时都会重试失败 addon，形成稳态错误渲染。

### 方案
启动前（`src/modules/settings/store.ts` 的 `init()`）用离屏 canvas 做一次 WebGL2 context 可用性探测。失败则在 preferences store 写入 `webglRendererUnusable: true`。`applyWebglPreference` 读取该标志：为 true 时对所有 slot 调 `attachWebgl(slot)` 直接 return，并强制 DOM 渲染重绘。开关设置（`GeneralSection.tsx` 的 WebGL 开关）会清零该标志并重新探测。

### 改动点
1. `src/modules/settings/store.ts`：新增 `webglRendererUnusable: boolean` 字段，默认 false。在 `init()` 里调用 `detectWebglRenderer()`
2. `src/modules/terminal/lib/rendererPool.ts`：`applyWebglPreference(enabled)` 开头读取 `webglRendererUnusable` 标志；新增导出 `reloadWebglIfUnusable()` 供开关切换时调用
3. `src/modules/settings/store.ts`：新增 `detectWebglRenderer()` 纯函数，offscreen canvas → try `getContext('webgl2')` → false 则写标志
4. `src/settings/sections/GeneralSection.tsx`：WebGL 开关 onChange 时调 `reloadWebglIfUnusable()`

### 测试策略
- `rendererPool.test.ts`：mock offscreen canvas 返回 null context → 断言 `webglRendererUnusable` 被置位、slot `attachWebgl` 无调用
- 手动验收：关闭 WebGL 开关再打开，确认所有 terminal slot 走 DOM 渲染路径

---

## Bug #933 — macOS 13.0.1 安装后白屏

### 症状
全窗口空白（不是仅终端区），报告于 macOS 13 Intel / Terax 0.8.2。无法在本机复现；假设有两种可能：(a) 旧 WebKit WebGL context 创建静默失败（与 #1168 相关），(b) React 组件早期 crash（JS 兼容性或 native 模块缺失）。

### 方案
两层兜底：
1. **#1168 的启动探测**作为第一层——如果真因是 WebGL 不可用，已被覆盖
2. **React Error Boundary + 全局 JS 错误日志**作为第二层——捕获所有渲染错误和 unhandled promise rejection，写到 `~/Library/Application Support/terax/errors.log`（JSON 行格式），下次 app 启动时 toast 提示用户"上次启动遇到错误，已记录日志"。不阻塞正常启动

### 改动点
1. `src/App.tsx`：用 `<ErrorBoundary>` 包整个 `App` 内部组件树，catch 渲染错误后显示"Terax 遇到了问题，已记录到日志"占位符，app 仍可响应
2. `src/main.tsx`：`window.addEventListener('error')` + `unhandledrejection` 写 JSON 行日志到 `errors.log`；启动时读最后一条时间戳，若距上次运行不到 5 分钟则 toast 提示
3. `src-tauri/src/lib.rs` 或 `src/main.tsx`：加一个 Tauri command `get_app_error_log_path` 返回日志路径（用于 toast 里的"打开日志"按钮）

### 测试策略
- 集成：故意抛出一个 React error → 断言 Error Boundary 渲染 fallback 而不是整页空白
- 集成：模拟 unhandled rejection → 断言日志文件被写入且内容符合 JSON schema
- 手动：关闭 WebGL 开关（触发 #1168 路径）→ 确认终端正常渲染

---

## Bug #449 — 外接硬盘目录新 tab 挂起

### 症状
项目在外接卷上时 Cmd+T 新建 tab 永远不加载（报告于 macOS 26 Apple Silicon / Terax 0.7.1）。根因：`pty_open`（`pty/mod.rs:51`）在 Tauri async 命令体内同步调用 `user_spawn_cwd_or_home` → `std::fs::canonicalize`，未进 `spawn_blocking`，也未复用 `canonicalize_cached`。外接卷休眠时 canonicalize 可阻塞数秒到数十秒，卡住 async runtime worker，tab 永远不出。

### 方案
1. `pty_open` 内把 `user_spawn_cwd_or_home` 调用挪进 `spawn_blocking`
2. 外层包 `tokio::time::timeout(Duration::from_secs(3), ...)`，超时抛错，回退 home（`user_spawn_cwd_or_home` 已有 Err → None 的 fallback 语义）
3. `is_executable_dir`（`workspace.rs:238`）里的两次同步 canonicalize 改为调 `Registry::canonicalize_cached`，复用 1s TTL 缓存
4. 新增日志：超时场景 `log::warn!("external drive canonicalize timed out for {{path}}")`

### 改动点
1. `src-tauri/src/modules/pty/mod.rs:pty_open`：cwd 解析部分包 `spawn_blocking` + timeout
2. `src-tauri/src/modules/workspace.rs`：
   - `authorize_spawn_cwd` / `authorize_user_spawn_cwd` 内的 `std::fs::canonicalize` 改为 `registry.canonicalize_cached`
   - `is_executable_dir` 改为接受 `&WorkspaceRegistry` 参数，改用 `canonicalize_cached`
   - `bootstrap_registry` 和 `choose_launch_dir` 调用点传 registry
3. 日志级别：超时 warn、拒绝 spawn info

### 边界与不变量
- 正常内盘路径不受影响（`canonicalize_cached` 1s TTL 足够，第一次 canonicalize 后命中缓存）
- 超时时 cwd 返回 `None` → spawn home，tab 能开；用户稍后再试时卷已唤醒，自然恢复
- authorized root 集合不变：home 已是 bootstrap 阶段的 authorized root（`bootstrap_registry` 显式授权）
- 并发外接卷请求：多个 tab 同时创建各自等自己的 3s 超时，不互相阻塞（因为都进了 `spawn_blocking`）

### 测试策略
- 单元测试：mock `canonicalize_cached` 返回 Err(io::ErrorKind::TimedOut) → 断言 `authorize_user_spawn_cwd` 返回 Err（前端收到 cwd 不可用提示）
- 单元测试：`is_executable_dir` 传 mock registry 返回 Ok(false) → 断言不调用第二次 canonicalize
- 手动：在有外接卷的环境开 tab 到外接卷目录，观察 tab 是否在 3s 内出现（或回退 home 并 toast）
- 若无外接卷：用 `cargo test` 跑 workspace.rs 单元测试确认逻辑正确；code review 确认 `spawn_blocking` + timeout 模式正确

---

## 跨 bug 协调

- **#1168 与 #933 共享同一份启动探测**：#1168 的 `detectWebglRenderer()` 放在 `store.init()` 里，#933 的 Error Boundary 也在同一阶段挂载，两者互为补充
- **#933 日志路径**与 **#816 cwd 回退 home** 共用 `dirs::home_dir()`，不引入新依赖
- **#449 与 #816**：#816 是启动时 cwd 不存在检查（已通过），#449 是运行时 spawn 时的 external drive 超时；两者语义一致（不可用回退 home），共用同一 fallback 通道

---

## 不做什么

- 不做 WebGL shader 层的 CJK glyph atlas 修复（上游 #750 相关，本仓库无权改上游 xterm.js）
- 不做 Wayland key duplication（#1167，Linux 领域）
- 不修 `is_executable_dir` 在 `choose_launch_dir` 里的同步调用（那部分不在 pty_open 路径上，且是内盘场景，不动）
- 不在 toast 里暴露具体错误栈（隐私）

---

## 验收标准

1. 本机 `pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked` 全绿
2. `docs/2026-08-27-pending-issues-plan.md` 第三节 macOS 行标记为已修复，附提交哈希
3. 代码审查：#449 无 sync I/O 在 async 命令体，#933 错误日志不泄漏敏感信息，#1168 启动探测不阻塞主线程
