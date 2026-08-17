# editor-navigation-history Specification

## Purpose
为编辑器提供导航历史能力，让用户在通过 LSP 跳转或终端文件链接打开新文件后，能快速返回之前的编辑位置，模拟 VS Code 的 Back/Forward 导航体验。
## Requirements
### Requirement: 导航历史入栈
当用户通过 LSP navigator（Go-to-definition、terminal file link、Go-to-symbol）跳转到新文件时，系统 SHALL 将当前文件路径和行号压入导航历史栈，并清空前进栈。

#### Scenario: Go-to-definition 触发入栈
- **WHEN** 用户在 editor tab 中按 Go-to-definition，跳转到 `src/foo.ts:42`
- **THEN** 当前 tab 的导航历史栈压入 `{ path: 原文件, line: 原行号 }`，前进栈清空

#### Scenario: terminal file link 点击触发入栈
- **WHEN** 用户在终端 pane 中 Cmd/Ctrl+点击文件路径 `src/bar.ts:10`
- **THEN** 导航历史栈压入该 pane 的当前焦点位置（当前文件 + 光标行号），前进栈清空

### Requirement: 后退导航
用户按下后退快捷键时，系统 SHALL 弹出历史栈顶记录并打开对应文件跳转到指定行；若栈为空则无操作。

#### Scenario: 后退回到上一个文件
- **WHEN** 用户从 A:10 跳到 B:20 后按下后退快捷键
- **THEN** 编辑器打开文件 A 并跳转到第 10 行

#### Scenario: 后退栈空时无操作
- **WHEN** 用户按下后退快捷键且历史栈为空
- **THEN** 不执行任何操作，不报错

### Requirement: 前进导航
用户按下前进快捷键时，系统 SHALL 弹出前进栈顶记录并打开对应文件跳转到指定行；若栈为空则无操作。

#### Scenario: 后退后再前进恢复位置
- **WHEN** 用户从 A:10 → B:20 → 后退回到 A:10 → 按下前进快捷键
- **THEN** 编辑器跳转到 B:20，前进栈清空

#### Scenario: 前进栈空时无操作
- **WHEN** 用户按下前进快捷键且前进栈为空
- **THEN** 不执行任何操作

### Requirement: 快捷键绑定
系统 SHALL 响应以下快捷键组合：
- 后退：`Cmd+←`（macOS）或 `Ctrl+←`（其他平台）
- 前进：`Cmd+→`（macOS）或 `Ctrl+→`（其他平台）

#### Scenario: editor tab 下快捷键生效
- **WHEN** 当前 active tab 是 editor 类型，用户按下后退快捷键
- **THEN** 触发后退导航

#### Scenario: 非 editor tab 下快捷键无操作
- **WHEN** 当前 active tab 是 terminal 类型，用户按下后退快捷键
- **THEN** 不触发导航，快捷键不消耗（allowing other handlers to process it）

### Requirement: 导航栈隔离
每个 editor tab 的导航历史栈 SHALL 独立维护，互不干扰。

#### Scenario: 切换 tab 不影响其他 tab 的历史
- **WHEN** 用户在 TabA 有历史记录，切换到 TabB 后在 TabB 执行导航
- **THEN** TabA 的历史记录保持不变，切换回 TabA 后可正常后退

