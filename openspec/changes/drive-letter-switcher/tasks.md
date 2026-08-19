## 任务清单

- [x] Rust 后端：在 `src-tauri/src/modules/fs/mod.rs` 新增 `list_drives` Tauri 命令（Windows 平台，`#[cfg(target_os = "windows")]` 门控）
- [x] 前端：在 `src/modules/explorer/FileTreeSection.tsx` 头部新增盘符下拉选择器组件（仅 Windows 显示）
- [x] 注册 Tauri 命令到 `src-tauri/src/lib.rs` 的 invoke handler
- [x] 验证：代码编译通过、类型检查通过、lint 通过、Rust 测试通过（Windows 实机测试待发布后验证）
