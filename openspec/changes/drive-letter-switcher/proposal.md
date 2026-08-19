## Why

Windows 用户在文件浏览窗口中无法快速切换到其他盘符（D:、E: 等）。当前必须在终端中手动 `cd D:\`，无法通过 UI 直接切换。这是一个 Windows 平台特有的可用性缺口。

## What Changes

- 在 Rust 后端新增 `list_drives` Tauri 命令，枚举 Windows 系统可用盘符
- 在文件浏览窗口的侧边栏文件树头部新增盘符下拉选择器
- 选中盘符后自动切换文件树到该盘符根目录
- 仅在 Windows 平台显示，macOS/Linux 不受影响

## Capabilities

### New Capabilities
- `drive-letter-switcher`: Windows 平台文件浏览窗口的盘符快速切换功能

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- Rust 后端：`src-tauri/src/modules/fs/` 新增命令
- 前端：`src/modules/explorer/` 新增盘符选择器组件
- 仅 Windows 平台生效，通过 `#[cfg(target_os = "windows")]` 门控
