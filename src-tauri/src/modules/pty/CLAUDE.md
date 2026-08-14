# PTY 和 Shell 集成

### 启动脚本注入

Shell 初始化脚本在 `src-tauri/src/modules/pty/scripts/`：

- **Unix**（zsh/bash/fish）：注入 OSC 7（cwd 报告）+ OSC 133 A/B/C/D（提示符界限、退出码）
- **Windows**（PowerShell）：`profile.ps1` 通过 `-File` 传入，同样发送 OSC 7 + 133

### ConPTY 锁

Windows ConPTY 需 `SPAWN_LOCK` 互斥体（`session.rs`）。并发启动会导致其中一个 PTY 输出管道卡顿——删除前验证 tab 快速切换稳定。

### Job Object（Windows）

每个 ConPTY 子进程加入 per-session **Job Object**（`JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`）。`Terax` 进程被 kill 时，kernel 自动杀死所有后代（避免孤儿）。
