# LSP（语言服务器）

- **零成本启用**：未激活时无进程、无 PATH 检查、没有 eager bundle 负担（14.5 kB shell 而已）
- **会话管理**：按 (server, workspace-root) 键值、引用计数、idle 3 分钟自动杀、连续崩溃回退
- **资源上限**：4 sessions per server；root marker 缺失则不启动；>4MB 文件关闭语法高亮和 LSP
