## Why

GitHub Releases 上 v0.8.5.1-cn 的 release 资产只有 2 个，而 v0.8.5 有 13 个。根因是 `.github/workflows/release.yml` 中 `releaseDraft: true` 导致 tauri-action 创建的 release 始终是草稿状态，草稿 release 对仓库外不可见，且每次重新构建会覆盖草稿内容，导致资产数量不一致。

## What Changes

- 将 `.github/workflows/release.yml` 中的 `releaseDraft: true` 改为 `releaseDraft: false`，使 tauri-action 创建已发布的 release
- 确保后续 tag push 触发的 release 包含完整平台构建产物（Ubuntu AppImage + Windows .exe + 签名文件）

## Capabilities

### New Capabilities
（无新功能，纯 CI/CD 配置修复）

### Modified Capabilities
（无 spec 变更）

## Impact

- 受影响文件：`.github/workflows/release.yml`（1 个文件，1 行改动）
- 行为变更：后续 release 将直接发布而非作为草稿，用户可立即看到完整资产列表
- 无 API 变更、无代码变更
