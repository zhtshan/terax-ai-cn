# Tasks: Mini-window input bar i18n 修复

- [x] 修改 `src/modules/ai/components/AiMiniWindow.tsx` EmptyState suggestions，将硬编码英文 text 改为 `t()` 调用
- [x] 运行 `pnpm lint && pnpm check-types && pnpm test` 确认通过
- [x] 提交：`fix(ai): mini-window suggestions i18n for input bar`
