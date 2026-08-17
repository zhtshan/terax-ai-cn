## 1. 重构 runCheck

- [x] 1.1 在 `src/modules/updater/useUpdater.ts` 的 `runCheck()` 中抽出 `applyOfficial(update)` / `applyManual(info)` 两个 helper，分别封装"设置 available/uptodate 状态 + 写节流时间戳"和"设置 manual-available/uptodate 状态 + 写节流时间戳"
- [x] 1.2 把 mac 分支从"直接调用 `checkLinuxRelease()`"改成"内层 try 官方 `check()`，catch 时 fallback 到 `checkLinuxRelease()`"，Linux 分支和 Windows 分支改为复用新 helper（行为保持不变）

## 2. 验证

- [x] 2.1 运行 `pnpm test` 确认全部通过，确认既有 `parseVersion`/`isNewer`/`pickLatestVersion` 测试不受影响 —— 505/505 通过
- [x] 2.2 运行 `pnpm lint` 和 `pnpm check-types` 确认无新增问题 —— 均通过
- [x] 2.3 在当前 `pnpm tauri dev` 环境里实际验证：启动后自动弹出官方更新弹窗（"Terax v0.8.7 可用"，`status.kind === "available"`），点击"安装并重启"后完整下载安装成功，应用重启显示为 v0.8.7，重启过程正常。实测结果优于预期——这台环境下官方 `check()` 本身就能成功（不需要 fallback 到手动流程），证明 mac 优先走官方 updater 的路径完全打通，且 `install()`/`downloadAndInstall()`/`relaunch()` 全流程在实际运行中验证通过（不只是 Windows 专属可用）
- [x] 2.4 提交代码，commit message: `fix: macOS 优先尝试官方 updater，仅在失败时 fallback 到手动下载`（commit 4d5c1d3）
