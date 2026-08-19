## 修复方案

### Rust 后端

在 `src-tauri/src/modules/fs/mod.rs` 新增 `list_drives` Tauri 命令：

```rust
#[tauri::command]
#[cfg(target_os = "windows")]
pub async fn list_drives() -> Result<Vec<String>, String> {
    // 遍历 A-Z 盘符，尝试 stat 检测是否存在
    // 返回可用盘符列表，如 ["C:", "D:", "E:"]
}
```

实现逻辑：
- 遍历 `A` 到 `Z` 26 个字母
- 对每个盘符尝试 `std::fs::metadata("C:/")` 检测是否存在
- 过滤出实际存在的盘符，返回字符串列表
- 非 Windows 平台通过 `#[cfg]` 门控，不编译

### 前端

在 `src/modules/explorer/FileTreeSection.tsx` 头部工具栏新增盘符下拉选择器：

- 仅在 `navigator.platform` 包含 `Win` 时渲染
- 调用 `invoke("list_drives")` 获取可用盘符列表
- 下拉选中后调用文件树的 `onNavigate("D:/")` 切换根目录
- 复用现有 Explorer 的导航逻辑，无需新增状态管理
