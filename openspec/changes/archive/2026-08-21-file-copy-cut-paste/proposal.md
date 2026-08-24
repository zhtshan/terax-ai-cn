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
