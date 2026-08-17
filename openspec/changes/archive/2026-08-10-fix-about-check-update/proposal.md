# Proposal: 修复通用->关于 检查更新失败

## Why

点击"检查更新"按钮后提示"检查失败 重试"，根本原因：`useUpdater` 对 macOS 仍调用 Tauri `check()`（内置 updater），该服务仅在 CI 流水线触发的官方 release 下可用；本地构建/签名构建无此后端，调用直接抛错 → 显示 error 状态。

## What Changes

- 扩展 `useUpdater.ts` 的平台判断：macOS 与 Linux 同样 fallback 到 GitHub API 直接查询 latest release
- 保持 Windows 继续使用 Tauri `check()`（CI 流水线 + releaseDraft 修复后已可用）
- 修复后错误提示文案与 fallback 路径一致

## Capabilities

### New Capabilities
- `updater-fallback`: macOS/Linux 构建时，更新检查 fallback 到 GitHub API（与现有 `checkLinuxRelease` 逻辑同源，扩展平台覆盖）

### Modified Capabilities
（无）

## Impact

- 改动文件：`src/modules/updater/useUpdater.ts`（单一文件）
- 无新增依赖
- 无 spec 级行为变更（用户可见行为：从"检查失败"变为"当前版本最新"/"有新版本可用"）
