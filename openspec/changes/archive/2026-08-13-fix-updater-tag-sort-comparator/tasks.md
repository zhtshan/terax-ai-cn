## 1. 修复排序比较器

- [x] 1.1 在 `src/modules/updater/useUpdater.ts` 中，将 `checkLinuxRelease()` 里挑选最新版本 tag 的逻辑抽成一个独立的、可单测的导出纯函数（如 `pickLatestVersion(tags: string[]): string | undefined`），并在其中按 design.md 的决策修复排序比较器（比较前统一用 `?? 0` 兜底，与 `isNewer()` 写法保持一致）
- [x] 1.2 让 `checkLinuxRelease()` 改用 `pickLatestVersion()` 取代原来的内联 `sort` + 取末位逻辑

## 2. 回归测试

- [x] 2.1 在 `src/modules/updater/useUpdater.test.ts` 中为 `pickLatestVersion` 新增测试：混入非版本号格式 tag（如字面量 `"list"`）时，仍能从一组真实风格的版本 tag 中正确选出最大版本
- [x] 2.2 新增测试：空 tag 列表返回 `undefined`；单个非版本号 tag 时按定义返回该 tag 本身（不抛异常），下游 `isNewer()` 已能正确拒绝它，不会被误判为可用更新
- [x] 2.3 新增测试：正常版本 tag 列表（含 `-N-cn`、`.N-cn` 混合格式）排序结果与修复前一致，确认未引入回归

## 3. 验证

- [x] 3.1 运行 `pnpm test` 确认全部通过（含新增用例）—— 505/505 通过
- [x] 3.2 运行 `pnpm lint` 和 `pnpm check-types` 确认无新增问题 —— 均通过（lint 剩余 130 条警告均为改动前既存、与本次改动文件无关）
- [x] 3.3 提交代码，commit message: `fix: 修复 checkLinuxRelease 排序比较器在非版本号 tag 下的非传递比较问题`（commit 4a10bdb）
