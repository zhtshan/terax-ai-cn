## Why

当前 `.github/workflows/release.yml` 的 build matrix 只包含 `ubuntu-22.04` 和 `windows-latest` 两个平台，缺少 macOS 构建。用户需要在 GitHub Releases 上获得 macOS 版本的 App（.dmg/.app），与 Linux AppImage 和 Windows .exe 并列。

## What Changes

- 在 `.github/workflows/release.yml` 的 matrix 中增加 `macos-latest` 平台条目
- 无需 macOS 特有的系统依赖安装步骤（与 Ubuntu 的 wayland 补丁不同）
- tauri-action 会自动为 macOS 生成 .dmg 和 .app 产物并上传到 release

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
（无）

## Impact

- 受影响文件：`.github/workflows/release.yml`（1 个文件，+3 行）
- CI 构建时间增加约 1 个平台
- 无代码变更、无 API 变更
