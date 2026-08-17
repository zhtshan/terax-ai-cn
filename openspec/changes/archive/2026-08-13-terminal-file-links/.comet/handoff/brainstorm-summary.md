# Brainstorm Summary

- Change: terminal-file-links
- Date: 2026-08-13

## 确认的技术方案

### 架构

新增独立的 `ILinkProvider`，与现有 `WebLinksAddon` 并存于每个终端 slot。每个 slot 一个 provider 实例，通过闭包持有：

1. 当前 pane 的 `leafId`（用于解析 cwd）
2. `explorerRoot`（workspace root，从 prop 传入，slot 生命周期内不变）
3. `openContentHit` 回调（点击后的跳转入口，复用 go-to-definition 同一条链路）

provider 的 `provideLinks(line, cb)` 按行做正则匹配、路径解析、workspace 前缀过滤后把 `ILink[]` 返回给 xterm。

### 匹配与解析

- 纯函数 `fileLinkMatch.ts`：接受一行文本，返回 `{ path, line?, col?, start, end }[]`
  - 支持形态：`file.ts` / `file.ts:12` / `file.ts:12:5`
  - 要求带扩展名（`.ts/.tsx/.rs/...`），降低误判
- 相对路径解析：`path.posix.join(leafCwd(leafId), path)` 然后 `normalize`
- 工作区边界：`resolvedPath.startsWith(explorerRoot + "/")` 或等价前缀匹配

### 点击路由

- 复用 `src/modules/lsp/lib/navigator.ts` 里的 `LspNavigator` 全局变量（`getLspNavigator()`）获取当前 `openFileTab` + `gotoLine` 闭包
- 点击时先 `fs_stat`（`src-tauri/src/modules/fs/file.rs:172`）校验文件存在
- 存在 → 调 `openContentHit(path, line)`；不存在 → `toast.error` 提示"文件不存在"

### 视觉样式

- 与编辑器 `linkHover`（`src/modules/lsp/lib/client.ts:220`）保持一致：Cmd/Ctrl+hover 时下划线 + 主题色，普通状态不加样式（避免干扰普通文本可读性）
- `ILink.hover`/`ILink.leave` 回调设置鼠标指针为 `pointer`

## 关键取舍与风险

1. **误判路径**：用"必须含扩展名 + 可选行列号"收窄正则面，保留调整空间；如有高频误判可后续收紧
2. **cwd 时序**：始终读最新 cwd（不缓存快照），与主流终端行为一致；设计决策已在 design.md 记录
3. **WebglAddon 覆盖**：当 slot 启用 WebGL 渲染时，自定义 link 可能不可见（xterm 已知限制）。通过 `slot.webglAddon === null` 在 render 阶段判断，有 webgl 时不注册 file link provider，降级为"只在普通 canvas 模式生效"。已验证 `WebLinksAddon` 同样受此限制，说明这是项目既有的可接受 trade-off

## 测试策略

- 纯函数模块（`fileLinkMatch` + cwd 解析 + workspace 过滤）→ 单测，完全离线
- Provider 集成（xterm 层）→ e2e 手动验证 spec 中的 6 个验收场景
- 回归 WebLinksAddon URL 链接 → 手动验证 URL 仍可点

## Spec Patch

无。现有 specs/terminal-file-links/spec.md 已覆盖所需验收场景。
