## 1. 路径匹配与解析（纯函数，先行落地方便单测）

- [x] 1.1 在 `src/modules/terminal/lib/` 新增 `fileLinkMatch.ts`：实现按行文本匹配文件路径的纯函数，支持纯路径与 `file:line`、`file:line:col` 两种形态，返回 `{ path, line?, col?, start, end }[]`
- [x] 1.2 实现相对路径解析：给定候选路径 + pane cwd，输出解析后的绝对路径（跨平台路径分隔符按项目约定处理，参考 CLAUDE.md 的 `.split(/[\\/]/)` 规范）
- [x] 1.3 实现 workspace-root 边界校验：解析后的绝对路径需落在传入的 `explorerRoot` 前缀内才算命中，否则丢弃该候选
- [x] 1.4 为 1.1-1.3 编写单测 `fileLinkMatch.test.ts`：覆盖纯路径、`file:line`、`file:line:col`、相对路径解析、工作区外路径被排除、误判文本（如无扩展名/无斜杠的普通词）不匹配

## 2. xterm ILinkProvider 集成

- [x] 2.1 在 `src/modules/terminal/lib/` 新增文件路径 link provider 工厂函数，使用 1.1-1.3 的纯函数，通过闭包读取最新 cwd（外部通过 ref 更新，不在创建时固化）
- [x] 2.2 在 `rendererPool.ts` 的 `createSlot()` 中调用 `term.registerLinkProvider(...)` 注册该 provider，与现有 `WebLinksAddon` 并存；为该 provider 设置下划线视觉样式（参考编辑器 `linkHover` 的 Cmd/Ctrl-hover 下划线交互，保持手感一致）
- [x] 2.3 处理 cwd 更新链路：把 slot 对应 pane 的最新 cwd 传给 2.1 的 provider（复用现有 OSC7 `onCwd` 回调数据流，不改动其上游逻辑）
- [x] 2.4 处理 `explorerRoot`（workspace root）的传入：确认 `rendererPool.ts`/`createSlot()` 能拿到当前 workspace root（若目前拿不到，评估通过参数或模块级 setter 的方式传入，遵循"零成本抽象"原则，未识别到 root 时不产出任何文件链接而不是报错）

## 3. 点击跳转到编辑器

- [x] 3.1 实现点击 handler：Cmd/Ctrl+点击命中的 `ILink` 时，先用 `fs_stat`（`src-tauri/src/modules/fs/file.rs:172`）校验目标文件存在
- [x] 3.2 文件存在时调用现有 `openFileTab(path, true)` + `gotoLine(line)`（复用 go-to-definition 同一条链路，`src/app/App.tsx` 的 `openContentHit`/`setLspNavigator` 附近）；无行号时只打开文件不跳行
- [x] 3.3 文件不存在时 toast 提示"文件不存在"，不调用 `openFileTab`，不抛异常

## 4. 测试与验证

- [x] 4.1 补充/确认现有 `WebLinksAddon` 相关行为不受影响（若已有终端渲染相关测试，跑一遍确认无回归；否则做一次手动验证记录在报告中）
- [x] 4.2 手动验证 spec 中列出的验收场景：带行列号路径跳转、纯路径打开、工作区外路径不可点、已删除文件点击提示、多 pane 不同 cwd 互不干扰、URL 链接行为不受影响
- [x] 4.3 运行完整检查清单：`pnpm lint && pnpm check-types && pnpm test`（本变更不涉及 Rust 代码新增，`fs_stat` 为既有命令，无需新增 Rust 测试）
