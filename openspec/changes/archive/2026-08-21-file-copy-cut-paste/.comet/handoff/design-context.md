# Comet Design Handoff

- Change: file-copy-cut-paste
- Phase: design
- Mode: compact
- Context hash: e966eaf97b8cd0e970d49f06161c9a9006152350946448f40bf0496695e96945

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/file-copy-cut-paste/proposal.md

- Source: openspec/changes/file-copy-cut-paste/proposal.md
- Lines: 1-27
- SHA256: ecfc85da4ae988e07c248006f7f1485aa4df4a7c5624d9b41b40534b1fef8741

```md
## Why

文件浏览窗口缺少复制/剪切/粘贴文件的基本操作。用户无法通过右键菜单复制文件到另一个位置，必须依赖终端命令或外部文件管理器。这是文件管理器的基本功能缺口。

## What Changes

- 文件列表右键菜单新增"复制"和"剪切"操作，将文件路径存入内部剪贴板
- 文件列表右键菜单新增"粘贴"操作，将剪贴板中的文件复制到目标文件夹
- 新增内部剪贴板状态管理，存储复制/剪切的文件路径列表
- 剪切操作在视觉上标记被剪切的文件（虚化/高亮）
- 粘贴时复用现有 `fs_copy` 命令完成文件复制

## Capabilities

### New Capabilities
- `file-clipboard`: 文件资源管理器的复制/剪切/粘贴操作，包括内部剪贴板状态管理和右键菜单集成

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

- 前端：`src/modules/explorer/` 新增剪贴板状态 hook 和右键菜单项
- 前端：`src/modules/explorer/FileTreeSection.tsx` 右键菜单增加复制/剪切/粘贴
- 前端：`src/modules/explorer/TreeRow.tsx` 剪切状态视觉标记
- 后端：复用现有 `fs_copy` 命令，无需新增后端命令
```

## openspec/changes/file-copy-cut-paste/design.md

- Source: openspec/changes/file-copy-cut-paste/design.md
- Lines: 1-76
- SHA256: c17adfb07efbaa853fb1828eaebd03541f50b715f433632ca320177a14484b1b

```md
## Context

文件浏览窗口（FileTreeSection）已有右键菜单，包含打开、新建、重命名、删除等操作。后端已有 `fs_copy` 命令用于拖拽复制。需要在此基础上添加复制/剪切/粘贴文件操作。

## Goals / Non-Goals

**Goals:**
- 右键菜单支持复制文件（存储路径到内部剪贴板）
- 右键菜单支持剪切文件（存储路径 + 视觉标记）
- 右键菜单支持粘贴文件（复制到目标文件夹）
- 剪切的文件在 UI 上有视觉区分（虚化）

**Non-Goals:**
- 跨窗口/跨应用的系统剪贴板文件复制（仅内部状态）
- 多选复制/粘贴（当前右键菜单仅支持单选）
- 覆盖已存在文件时的冲突处理（复用 fs_copy 的"已存在则报错"行为）

## Decisions

### 1. 内部剪贴板使用 React 状态 + module 级单例

```
┌─────────────────────────────────────────────┐
│          useFileClipboard hook              │
├─────────────────────────────────────────────┤
│  state: { paths: string[], mode: 'copy'|'cut' } │
│  methods: copy(), cut(), paste(), clear()   │
└─────────────────────────────────────────────┘
```

**选择理由**：文件复制/剪切是 explorer 内部操作，不需要跨组件共享。使用 module 级单例（文件顶部 `let` 变量）即可，无需 Context 或 Zustand。

**替代方案**：Zustand store → 过度设计，单个 explorer 实例不需要全局状态。

### 2. 粘贴复用现有 `fs_copy` 命令

粘贴时调用 `invoke("fs_copy", { sources: clipboardPaths, dest_dir: targetDir })`。

**选择理由**：`fs_copy` 已实现递归复制和错误处理，无需重复造轮子。剪切操作的"移动"效果通过粘贴后删除原文件实现（但本次仅实现复制粘贴，剪切粘贴暂不实现移动）。

**注意**：用户确认粘贴行为为"复制到目标"，即剪切+粘贴也执行复制而非移动。剪切操作仅用于 UI 标记，粘贴后清除剪切状态。

### 3. 剪切视觉标记：行虚化

被剪切的文件行添加 `opacity-50` 样式。

**选择理由**：与 VS Code / Finder 的剪切行为一致，简单直观。

### 4. 右键菜单位置

复制/剪切放在"复制路径"组之前，粘贴放在菜单顶部（与 Finder/VS Code 一致）。

```
───────────────────
粘贴              ← 新增（仅剪贴板非空时显示）
───────────────────
打开
在终端中打开
在 Finder 中打开
───────────────────
新建文件
新建文件夹
───────────────────
复制              ← 新增
剪切              ← 新增
───────────────────
复制路径
复制相对路径
...
```

## Risks / Trade-offs

- **[风险] fs_copy 不覆盖已存在文件** → 粘贴同名文件会报错。可接受，与现有拖拽行为一致。
- **[风险] 剪切状态在组件卸载后丢失** → 使用 module 级变量，刷新页面后清空。可接受，非持久化需求。
- **[权衡] 不支持多选** → 当前右键菜单仅支持单文件操作，多选需额外的 checkbox 机制，超出本次范围。
```

## openspec/changes/file-copy-cut-paste/tasks.md

- Source: openspec/changes/file-copy-cut-paste/tasks.md
- Lines: 1-9
- SHA256: a518f6d7be740cc7872a64535b98bd68e1d5cb1abae386570a61084cab035937

```md
## 任务清单

- [ ] 创建 `src/modules/explorer/lib/useFileClipboard.ts` hook，管理复制/剪切状态（paths + mode）
- [ ] 在 `src/modules/explorer/FileTreeSection.tsx` 右键菜单添加"复制"和"剪切"菜单项
- [ ] 在 `src/modules/explorer/FileTreeSection.tsx` 右键菜单添加"粘贴"菜单项（仅剪贴板非空时显示）
- [ ] 粘贴操作调用 `invoke("fs_copy")` 将文件复制到目标文件夹
- [ ] 剪切操作在 `TreeRow` 中添加虚化视觉标记（opacity-50）
- [ ] 粘贴成功后刷新文件树（调用 tree.refresh）
- [ ] 添加翻译键（explorer.copyFile / explorer.cutFile / explorer.paste）
```

