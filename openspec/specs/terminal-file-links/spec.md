# terminal-file-links Specification

## Purpose
让用户在终端输出（构建报错、lint 报错、测试堆栈等）中直接点击文件路径跳转到编辑器对应位置，无需手动复制路径再打开文件。
## Requirements
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

