## Why

终端输出中经常出现文件路径（构建报错、lint 报错、测试失败堆栈、`grep`/`git status` 等命令输出），但这些路径目前是纯文本，用户必须手动复制路径、切到侧边栏或用文件搜索去打开对应文件，效率很低。终端已经具备打开外部 URL 的能力（`WebLinksAddon`），但没有覆盖本地文件路径这个更高频的场景。

## What Changes

- 终端渲染层新增文件路径识别：匹配纯路径以及编译器/测试框架常见的 `file:line`、`file:line:col` 格式（ts/eslint 报错、python traceback 等）
- 相对路径按该 pane 实时 cwd（复用现有 OSC 7 追踪）解析为绝对路径；只有解析后落在当前 workspace root 内的路径才加下划线、可点击
- Cmd/Ctrl+点击已识别的文件路径，在编辑器中打开对应文件并跳转到指定行（复用现有 `openFileTab` + `gotoLine` 链路，即 go-to-definition 用的同一套）
- 点击时若目标文件不存在（已被删除、路径误判等），toast 提示，不抛出异常
- 工作区外的路径（如 `~/.zshrc`、其他项目的绝对路径）保持纯文本，不做链接
- 不改变现有 `WebLinksAddon` 对 `http(s)://` 链接的处理逻辑，两者共存

## Capabilities

### New Capabilities
- `terminal-file-links`: 终端输出中的文件路径识别为可点击链接，点击后在编辑器中打开并跳转到指定行

### Modified Capabilities
（无，不涉及已有 capability 的需求变更）

## Impact

- `src/modules/terminal/lib/rendererPool.ts`：新增/注册文件路径 link provider，与现有 `WebLinksAddon` 共存
- `src/modules/terminal`：新增路径匹配、路径解析（结合 OSC 7 cwd）相关逻辑
- 复用 `src/app/App.tsx` 中的 `openFileTab` + `gotoLine`（无需改动其签名）
- 复用 `src/modules/terminal/lib/osc-handlers.ts` 的 cwd 追踪（只读，不改动现有逻辑）
- 不涉及 Rust 后端改动（文件存在性校验可复用现有 `fs_stat` 或前端已知的 `explorerRoot`）
