## 1. 修复文案

- [x] 1.1 `src/modules/updater/UpdaterDialog.tsx` 第 109 行，把 `update?.body || t('updater.newVersionReady')` 改成 `t('updater.newVersionReady')`

## 2. 验证

- [x] 2.1 `pnpm test`、`pnpm lint`、`pnpm check-types` 通过 —— 505/505 测试通过，lint/类型检查均无新增问题
- [x] 2.2 提交代码，commit message: `fix: 更新弹窗说明文字始终使用中文本地化文案`（commit c011d3f）
