# Verify Report: hotfix-miniwindow-i18n

**日期**: 2026-08-09
**Change**: hotfix-miniwindow-i18n
**模式**: light

## 轻量验证 6 项检查

| # | 检查项 | 结果 |
|---|--------|------|
| 1 | tasks.md 全部完成 [x] | PASS（0 个未勾） |
| 2 | 改动文件与 tasks 描述一致 | PASS（仅 AiMiniWindow.tsx，3 处 text 字段替换） |
| 3 | 编译通过 | PASS（pnpm build ✓） |
| 4 | 测试通过 | PASS（64 files, 493 tests ✓） |
| 5 | 无安全问题 | PASS（仅 i18n 文本替换，无密钥/IO 变更） |
| 6 | Code review | SKIP（review_mode: off） |

## 根因消除确认

- 硬编码英文 `"Explain the last error in the terminal."` → `t("ai.miniWindow.explainError")`
- 硬编码英文 `"Give me a command to "` → `t("ai.miniWindow.generateCommand")`
- 硬编码英文 `"Summarize what just happened in the terminal."` → `t("ai.miniWindow.summarizeBuffer")`

中文 locale 下 input bar 将显示"解释上一个错误"/"生成命令"/"总结缓冲区"，与 label/hint 一致。
