## Why

macOS 用户点击"检查更新"时，无论是本地未签名的 dev 构建还是 CI 正式签名发布的生产版本，都会被 `useUpdater.ts` 里的 `IS_LINUX || IS_MAC` 判断一刀切地路由到"打开浏览器手动下载"这条 fallback 路径，用户只能拿到一个 GitHub release 页面链接，自己下载 `.app.tar.gz`/`.dmg` 手动安装。而实际上 CI 发布的 `latest.json` 里已经有正确签名的 `darwin-aarch64`/`darwin-aarch64-app` 更新资产（与 Windows 用同一套 minisign 签名机制），Windows 现在就是走官方 `check()`/`install()`/`downloadAndInstall()`/`relaunch()` 实现全自动静默下载安装并重启的。这个 fallback 最初是为了绕开本地未签名 dev 构建（如 `pnpm tauri dev`）下官方 `check()` 直接抛错的问题（见已归档 change `fix-about-check-update`），但被无差别应用到了所有 macOS 构建，导致生产版本用户体验落后于 Windows。

## What Changes

- `useUpdater.ts` 的 `runCheck()` 中，macOS 分支改为：优先调用官方 `check()`；只有该调用抛出异常（如未签名 dev 构建缺少更新后端）时，才 `catch` 后 fallback 到现有的 `checkLinuxRelease()` 手动流程
- Linux 分支保持不变，仍然固定走 `checkLinuxRelease()`（`.deb`/`.rpm` 包本身无法用 Tauri 官方 updater 自我替换，属于真实平台限制，`UpdaterDialog` 里已有对应的 distro 手动安装命令）
- 抽取 `applyOfficial()` / `applyManual()` 两个小 helper，消除 Windows 路径、mac 官方成功路径、mac fallback 路径、Linux 路径之间重复的"设置状态 + 写 localStorage 节流时间戳"逻辑
- 不改变 `UpdaterStatus` 联合类型定义，不改变 `AboutSection.tsx`/`UpdaterDialog.tsx`（两者已经能正确处理 `available` 和 `manual-available` 两种状态，官方路径走通后会自动呈现 Windows 同款的静默下载安装 UI）

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无 —— 本次不改变外部可观察的能力契约文档，仓库当前也没有已归档的更新检查能力规格；`.openspec.yaml` 设置 `skip_specs: true`）

## Impact

- 影响文件：`src/modules/updater/useUpdater.ts`（单文件，`runCheck()` 内的平台分支逻辑）
- 影响范围：仅 macOS 的检查更新路径；Windows、Linux 行为不变
- 无接口变更、无新依赖、无数据库/配置变更
- 行为变化提示：macOS 生产版本用户点击"检查更新"后，如果有新版本，将不再是"打开浏览器手动下载"，而是变成和 Windows 一致的应用内静默下载 + 安装 + **自动重启应用**（`install()` 内部调用 `relaunch()`）。需要在验证阶段确认这一行为对用户是可接受的（现有 UI 已经有"稍后"/"立即安装重启"按钮供用户选择，未强制静默重启）
