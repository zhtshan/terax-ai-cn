## Context

终端渲染层基于 `xterm.js`（`@xterm/xterm@6.0.0`），每个终端实例在 `src/modules/terminal/lib/rendererPool.ts` 的 `createSlot()` 中创建，已加载 `FitAddon`、`SearchAddon`、`SerializeAddon`、`WebLinksAddon`（识别 `http(s)://` 链接，Cmd/Ctrl+点击后用 `openUrl()` 交给系统浏览器打开）。

每个终端 pane 的 cwd 通过 OSC 7 实时追踪（`src/modules/terminal/lib/osc-handlers.ts`），经 `onCwd` 回调一路传到 `src/app/App.tsx` 的 `handleTerminalCwd`。

"打开文件并跳转到某行"的完整链路已经存在，是 go-to-definition 功能复用的同一套：`src/app/App.tsx` 里的 `openContentHit`/`openFileTab(path, true)` + `editorRefs.current.get(id).gotoLine(line)`，目前通过模块级的 `setLspNavigator`/`getLspNavigator()`（`src/modules/lsp/lib/navigator.ts`）从 LSP 层调用；本次改动会复用同一入口，而不是重新实现一遍打开文件的逻辑。

参见 proposal.md 了解动机，参见 specs/terminal-file-links/spec.md 了解行为契约。

## Goals / Non-Goals

**Goals:**
- 新增一个独立的 xterm `ILinkProvider`，识别文件路径（含可选 `:line` / `:line:col`），与现有 `WebLinksAddon` 并存、互不干扰
- 复用现有"打开文件+跳行"链路和路径解析素材（OSC7 cwd、`explorerRoot`），不重新发明这两块
- 点击时才做存在性校验（避免逐行实时 `fs_stat` 的性能开销）

**Non-Goals:**
- 不支持工作区外路径的点击（见 spec）
- 不做路径的语法高亮/着色，只做下划线可点击的最小视觉提示
- 不修改 `WebLinksAddon` 的实现或其对 URL 的匹配规则
- 不引入新的 Rust 后端命令；存在性校验和路径解析全部走前端已有能力

## Decisions

### 1. 用独立的 `ILinkProvider` 而不是扩展/替换 `WebLinksAddon`

`xterm.js` 的 `Terminal.registerLinkProvider(linkProvider: ILinkProvider): IDisposable` 支持注册任意数量的 provider（已在 `@xterm/xterm` 类型定义 `typings/xterm.d.ts:1102` 确认），每个 provider 按行独立提供 `ILink[]`，互不影响；`WebLinksAddon` 内部也是通过这个 API 注册自己的 provider。因此新增一个 `terminalFileLinkProvider(opts): ITerminalAddon`（或直接一个返回 `IDisposable` 的注册函数）在 `createSlot()` 里与 `WebLinksAddon` 一起 `loadAddon`/`registerLinkProvider`，两者在渲染层完全独立，不需要合并匹配逻辑或做优先级仲裁。

备选方案（否决）：fork/包一层 `WebLinksAddon` 让它同时认 URL 和文件路径——放弃，因为会让两种完全不同性质的链接（外部浏览器打开 vs 编辑器内跳转）耦合在一个正则和一个 handler 里，未来任一方修改都容易互相影响。

### 2. 路径匹配：按行正则匹配 + 白名单校验，不做逐行文件系统访问

`provideLinks(bufferLineNumber, callback)` 每次只处理一行文本（xterm 已经做好了按需调用，滚动到的行才会被请求)。我们在 provider 内部：
1. 对整行文本跑正则，抽出候选片段及其 `{ path, line?, col? }`
2. 用该 pane 当前 cwd（通过闭包捕获的 `getCwd()` 或最新 ref）把相对路径解析为绝对路径
3. 与 `explorerRoot`（workspace root）做前缀比较，只有落在 root 内的才产出 `ILink`
4. 不在这一步调用 `fs_stat`——文件是否真实存在，留到点击时再校验

正则覆盖两类形态（对应 spec 的两个 Scenario）：
- 纯路径：`[\w.\-/]+\.[a-zA-Z]+`（要求带扩展名，降低"任意斜杠文本"误判率）
- 带行列号：在纯路径基础上允许 `:\d+(:\d+)?` 后缀（覆盖 `file.ts:12:5`、`file.py:12`）

具体正则边界（比如是否支持 Windows 反斜杠路径、引号包裹的路径等）作为实现阶段的迭代空间，不影响 spec 里已定的行为契约。

备选方案（否决）：逐行对每个候选路径调用 `fs_stat` 决定是否加下划线——否决，理由见 proposal 的 Non-Goals（构建日志类场景可能几千行输出，逐行 IPC 校验会造成明显卡顿）。改为"先用规则粗筛+染色，点击时才校验"，与现有 go-to-definition "点了才请求 LSP" 的交互节奏一致。

### 3. 点击时校验存在性，复用 toast 失败反馈模式

点击 `ILink` 触发的 handler：
1. 直接调用现有 `openFileTab(path, true)` + `gotoLine(line)`（与 go-to-definition 完全同一路径）
2. `openFileTab` 内部读取文件失败时的行为（编辑器打开失败）复用现有错误提示机制；若需要在"打开前"就判断文件不存在，复用 `fs_stat`（`src-tauri/src/modules/fs/file.rs:172`）做一次性校验，失败则 `toast.error`，不调用 `openFileTab`

这样不新增 Rust 命令，只是复用两个已有的前端函数和一个已有的 Tauri 命令。

### 4. cwd 获取方式：读最新值而非快照

`ILinkProvider.provideLinks` 在用户滚动/悬停时才被调用，可能发生在 cwd 已经变化之后（比如命令执行完 cd 到别的目录，用户往回滚动看之前的输出）。为了让"相对路径解析"始终使用**当前**cwd 而不是输出那一刻的 cwd（业界终端如 iTerm2/VS Code 的行为也是按当前 cwd 解析，而不是历史 cwd），provider 通过闭包持有一个可变 ref（由外部在 `onCwd` 回调里更新），每次 `provideLinks` 调用时读取最新值，而不是在创建 provider 时固化。

## Risks / Trade-offs

- **[风险] 正则误判**：普通文本里偶然出现 `a/b.c` 这种形态可能被误标记为链接 → 缓解：要求路径至少包含一个 `/` 或以已知代码文件扩展名结尾，收窄匹配面；后续可根据实际使用反馈继续收紧
- **[风险] cwd 用"当前值"而非"输出时刻的值"可能导致理论上的路径解析错位**（用户 cd 到别的目录后，再点击之前那次命令输出里的相对路径，会按新 cwd 解析）→ 权衡后接受：这是主流终端的一致行为，且大多数场景下真正需要点击跳转的输出（报错、堆栈）出现后用户很少会先切换目录再回头点，收益大于这个边缘 case 的成本
- **[风险] 大量终端输出时每次视口重绘都会触发 `provideLinks`** → 缓解：`provideLinks` 只在可见行被请求时调用（xterm 内建行为），且函数体本身只是正则+字符串前缀比较，无 IPC，开销可忽略
- **[Trade-off] 不做逐行存在性校验** 意味着"删除的文件路径"在滚动时仍然显示为可点击（下划线），直到用户真正点击才会发现文件不存在并收到 toast → 已在 spec 中作为预期行为写明，符合"点击时才校验"的设计取舍
