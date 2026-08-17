# Comet Design Handoff

- Change: terminal-file-links
- Phase: design
- Mode: compact
- Context hash: bfbd29b6f2ec847a29f6db3b8b62c2f6b0f320b583c81863ad23dbb3189061dd

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/terminal-file-links/proposal.md

- Source: openspec/changes/terminal-file-links/proposal.md
- Lines: 1-28
- SHA256: a38a0c2f6329108d53eeed88161f5b2b5ed08a332a381142adee10ac92cc8e55

```md
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
```

## openspec/changes/terminal-file-links/design.md

- Source: openspec/changes/terminal-file-links/design.md
- Lines: 1-65
- SHA256: 77f4292a1e2fb7b389c972520cbfd284c63c86a68ba88129d654cfa1f45ee1a3

```md
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
```

## openspec/changes/terminal-file-links/tasks.md

- Source: openspec/changes/terminal-file-links/tasks.md
- Lines: 1-25
- SHA256: 6fa0e2852f99b45a088a027d391b405baa1aa411091fcdb83832dda2207a5d80

```md
## 1. 路径匹配与解析（纯函数，先行落地方便单测）

- [ ] 1.1 在 `src/modules/terminal/lib/` 新增 `fileLinkMatch.ts`：实现按行文本匹配文件路径的纯函数，支持纯路径与 `file:line`、`file:line:col` 两种形态，返回 `{ path, line?, col?, start, end }[]`
- [ ] 1.2 实现相对路径解析：给定候选路径 + pane cwd，输出解析后的绝对路径（跨平台路径分隔符按项目约定处理，参考 CLAUDE.md 的 `.split(/[\\/]/)` 规范）
- [ ] 1.3 实现 workspace-root 边界校验：解析后的绝对路径需落在传入的 `explorerRoot` 前缀内才算命中，否则丢弃该候选
- [ ] 1.4 为 1.1-1.3 编写单测 `fileLinkMatch.test.ts`：覆盖纯路径、`file:line`、`file:line:col`、相对路径解析、工作区外路径被排除、误判文本（如无扩展名/无斜杠的普通词）不匹配

## 2. xterm ILinkProvider 集成

- [ ] 2.1 在 `src/modules/terminal/lib/` 新增文件路径 link provider 工厂函数，使用 1.1-1.3 的纯函数，通过闭包读取最新 cwd（外部通过 ref 更新，不在创建时固化）
- [ ] 2.2 在 `rendererPool.ts` 的 `createSlot()` 中调用 `term.registerLinkProvider(...)` 注册该 provider，与现有 `WebLinksAddon` 并存；为该 provider 设置下划线视觉样式（参考编辑器 `linkHover` 的 Cmd/Ctrl-hover 下划线交互，保持手感一致）
- [ ] 2.3 处理 cwd 更新链路：把 slot 对应 pane 的最新 cwd 传给 2.1 的 provider（复用现有 OSC7 `onCwd` 回调数据流，不改动其上游逻辑）
- [ ] 2.4 处理 `explorerRoot`（workspace root）的传入：确认 `rendererPool.ts`/`createSlot()` 能拿到当前 workspace root（若目前拿不到，评估通过参数或模块级 setter 的方式传入，遵循"零成本抽象"原则，未识别到 root 时不产出任何文件链接而不是报错）

## 3. 点击跳转到编辑器

- [ ] 3.1 实现点击 handler：Cmd/Ctrl+点击命中的 `ILink` 时，先用 `fs_stat`（`src-tauri/src/modules/fs/file.rs:172`）校验目标文件存在
- [ ] 3.2 文件存在时调用现有 `openFileTab(path, true)` + `gotoLine(line)`（复用 go-to-definition 同一条链路，`src/app/App.tsx` 的 `openContentHit`/`setLspNavigator` 附近）；无行号时只打开文件不跳行
- [ ] 3.3 文件不存在时 toast 提示"文件不存在"，不调用 `openFileTab`，不抛异常

## 4. 测试与验证

- [ ] 4.1 补充/确认现有 `WebLinksAddon` 相关行为不受影响（若已有终端渲染相关测试，跑一遍确认无回归；否则做一次手动验证记录在报告中）
- [ ] 4.2 手动验证 spec 中列出的验收场景：带行列号路径跳转、纯路径打开、工作区外路径不可点、已删除文件点击提示、多 pane 不同 cwd 互不干扰、URL 链接行为不受影响
- [ ] 4.3 运行完整检查清单：`pnpm lint && pnpm check-types && pnpm test`（本变更不涉及 Rust 代码新增，`fs_stat` 为既有命令，无需新增 Rust 测试）
```

## openspec/changes/terminal-file-links/specs/terminal-file-links/spec.md

- Source: openspec/changes/terminal-file-links/specs/terminal-file-links/spec.md
- Lines: 1-63
- SHA256: 3de4a7f1357a64c17c33e7e191dd03e140311c1bab6c1c6976a42961fdf7b807

```md
## Purpose

让用户在终端输出（构建报错、lint 报错、测试堆栈等）中直接点击文件路径跳转到编辑器对应位置，无需手动复制路径再打开文件。

## ADDED Requirements

### Requirement: 识别终端输出中的文件路径
终端渲染层 SHALL 识别输出文本中形如纯路径、`file:line`、`file:line:col` 的文件路径引用（覆盖常见编译器/lint/测试框架的报错格式），并对其应用可点击标记。

#### Scenario: 识别带行列号的路径
- **WHEN** 终端输出包含 `src/app/App.tsx:1245:7`
- **THEN** 该文本片段被识别为文件路径引用，附带行号 1245、列号 7

#### Scenario: 识别纯路径（无行列号）
- **WHEN** 终端输出包含 `src/app/App.tsx`（无行列号后缀）
- **THEN** 该文本片段被识别为文件路径引用，不附带行列信息

### Requirement: 相对路径按 pane 当前工作目录解析
系统 SHALL 使用触发该输出的终端 pane 的实时工作目录（OSC 7 追踪值）将相对路径解析为绝对路径，且不同 pane 的解析互不影响。

#### Scenario: 相对路径解析
- **WHEN** pane 的当前 cwd 为 `/repo/src`，其输出包含相对路径 `app/App.tsx:10`
- **THEN** 该路径被解析为绝对路径 `/repo/src/app/App.tsx`，行号为 10

#### Scenario: 多 pane 互不干扰
- **WHEN** 同一 tab 内的两个 pane 分别处于不同的 cwd，且都输出了相同的相对路径文本
- **THEN** 两个 pane 各自按自身的 cwd 解析出不同的绝对路径

### Requirement: 仅工作区内路径可点击
系统 SHALL 仅对解析后落在当前 workspace root 内的路径添加可点击标记；工作区外的路径（包括用户主目录下的配置文件、其他项目的绝对路径等）SHALL 保持为普通文本，不可点击。

#### Scenario: 工作区外路径不可点击
- **WHEN** 终端输出包含工作区外的绝对路径，例如 `~/.zshrc`
- **THEN** 该文本不被标记为可点击链接

#### Scenario: 工作区内路径可点击
- **WHEN** 终端输出包含解析后落在当前 workspace root 内的路径
- **THEN** 该文本被标记为可点击链接（带下划线等视觉提示）

### Requirement: Cmd/Ctrl+点击跳转到编辑器
用户 SHALL 能够通过 Cmd/Ctrl+点击已识别的文件路径，在编辑器中打开该文件；若路径带行号，SHALL 自动跳转到对应行。

#### Scenario: 点击带行号的路径跳转到指定行
- **WHEN** 用户 Cmd/Ctrl+点击终端中已识别的 `src/app/App.tsx:1245:7`
- **THEN** 编辑器打开 `src/app/App.tsx`（若已打开则复用现有 tab）并将光标/视图定位到第 1245 行

#### Scenario: 点击不带行号的路径
- **WHEN** 用户 Cmd/Ctrl+点击终端中已识别的纯路径（无行号）
- **THEN** 编辑器打开该文件，不做行跳转

### Requirement: 目标文件不存在时的容错
系统 SHALL 在点击时才校验目标文件是否存在；若文件不存在（已被删除、路径误判等），SHALL 提示用户文件不存在，且不导致应用报错或崩溃。

#### Scenario: 点击已不存在的文件路径
- **WHEN** 用户点击一个此前存在但已被删除的文件路径
- **THEN** 系统展示"文件不存在"提示，编辑器不打开新 tab，应用保持正常运行

### Requirement: 与现有 URL 链接功能共存
系统 SHALL 在不影响终端现有 `http(s)://` URL 链接识别与点击打开行为的前提下新增文件路径链接能力。

#### Scenario: URL 链接行为不受影响
- **WHEN** 终端输出同时包含一个 `http(s)://` 链接和一个工作区内文件路径
- **THEN** 点击 URL 仍按原有行为用系统浏览器打开，点击文件路径按新行为在编辑器中打开
```

