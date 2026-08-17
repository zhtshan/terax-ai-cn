# Tasks

- [x] 在 `client.ts` 的 `gotoDefinition` 异常分支增加 `toast.error` 反馈
- [x] 在 `client.ts` 的 `gotoDefinition`/`findReferences` 空结果场景增加 `toast.info` 反馈（从 `showResults` 上移到调用方）
- [x] 在 `client.ts` 的 `findReferences` 异常分支增加 `toast.error` 反馈
- [x] 运行 `pnpm check-types` 和 `pnpm lint` 确认通过
- [x] 用 LSP 协议探测脚本确认根因（tsserver 项目加载时序），确认正常路径的协议行为未受影响
