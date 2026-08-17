## Why

以编辑器模式打开 `.tsx` 文件时，用 Cmd/Ctrl+点击 已选中的 import 的函数名，无法跳转到该函数的定义；`Shift-F12`（Find References，用于查看函数被使用的次数）看起来同样毫无反应。

### 根因（已用协议级探测脚本直接验证，推翻旧方案的诊断）

旧方案曾假设是 pnpm 虚拟 store 导致 `typescript-language-server` 找不到项目本地 TypeScript SDK。用 Node 脚本直接模拟 LSP 协议对 `typescript-language-server --stdio` 发送 `initialize`/`textDocument/definition`/`textDocument/hover` 请求后证实这个假设不成立：

- 不加任何 `tsserver.path` 配置，服务器启动后即发送 `$/typescriptVersion {"version":"6.0.3","source":"workspace"}`，日志确认 `Using Typescript version (workspace) 6.0.3 from ".../node_modules/typescript/lib/tsserver.js"` —— SDK 自动探测本来就是对的，加 `tsserver.path` 后行为（`source` 变为 `"user-setting"`）不影响结果。
- 真正原因是 **tsserver 项目语义加载的时序**：`didOpen` 后等 4 秒发起 `definition`/`hover`，返回的是 import 语句自身（未解析）、hover 只显示 `"import cn"`（无类型签名）；同样的请求等 15 秒后再发，`definition` 正确跳到 `src/lib/utils.ts:3`，hover 显示完整签名。语义索引尚未完成前，跨文件解析必然返回空/自引用结果，这是 tsserver 的正常行为，不是 bug。
- 真正的 bug 在客户端：`src/modules/lsp/lib/client.ts` 的 `gotoDefinition`（约 312-326 行）在请求抛出异常时 `catch { return; }` 静默吞掉；`showResults`（约 276-305 行）在结果为空数组时直接 `return`，同样没有任何提示。`findReferences`（约 328-343 行）复用同一个 `showResults`，所以过早触发 `Shift-F12` 时表现出"引用次数无从得知"的假象。
- 两个症状（跳转失败、看不到引用次数）本质是同一个根因：LSP 查询在 tsserver 尚未完成项目加载时发出，失败或空结果被完全静默吞掉，用户得不到任何反馈，只能自行判断"功能不工作"。

## What Changes

- `gotoDefinition` 请求异常时通过 toast 提示失败原因，而不是静默返回
- `showResults`（被 `gotoDefinition`/`findReferences` 共用）在结果为空时通过 toast 提示"未找到定义/引用"，而不是静默 no-op
- `findReferences` 同样在异常时通过 toast 提示

## Capabilities

### New Capabilities

<!-- None -->

### Modified Capabilities

- `lsp-goto-definition`：跳转定义/查找引用失败或无结果时向用户呈现明确反馈

## Impact

- `src/modules/lsp/lib/client.ts` —— `gotoDefinition`、`findReferences`、`showResults` 增加失败/空结果的 toast 反馈
- 影响范围：仅 LSP 交互的错误反馈路径，不改变已有成功路径的行为
