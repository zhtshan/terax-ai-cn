# AI 子系统

### 工具管理

- **自动执行**：`read_file`, `list_directory`, `fs_search`, `fs_grep`
- **需审批**：`write_file`, `delete`, `run_command`, `shell_*`（审批卡片 UI 确认后才执行）
- **安全层**：`lib/security.ts` 拒绝列表（`.env*`, `.ssh/`, 凭证路径）适用读写两端

### 会话存储

会话通过 `tauri-plugin-store` 持久化到 `terax-ai-sessions.json`，**密钥永不落盘**（仅 OS keychain）。
