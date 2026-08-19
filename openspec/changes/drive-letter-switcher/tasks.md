## 任务清单

- [x] Rust 后端：在 `src-tauri/src/modules/fs/mod.rs` 新增 `list_drives` Tauri 命令（Windows 平台，`#[cfg(target_os = "windows")]` 门控）
- [x] 前端：在 `src/modules/explorer/FileTreeSection.tsx` 头部新增盘符下拉选择器组件（仅 Windows 显示）
- [x] 注册 Tauri 命令到 `src-tauri/src/lib.rs` 的 invoke handler
- [ ] 验证：在 Windows 上测试盘符切换功能正常工作
