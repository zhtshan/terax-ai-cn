# 设计文档：#1089 Markdown 公式渲染 + 外链/本地图片

日期：2026-08-26
状态：已获用户批准（方案 A + 方案 1）

## 背景与问题

上游 issue #1089 报告两个问题：

1. **公式不渲染**：md 预览不支持 KaTeX/MathJax。全仓库无直接 katex/mathjax 依赖。
2. **外链图片不显示**：issue 报自 v0.5.9。

### 现状核实（2026-08-26）

- 渲染管线是 `streamdown` v2.5.0，两处使用：
  - md 文件预览：`src/modules/markdown/MarkdownPreviewPane.tsx:88`
  - AI 聊天消息：`src/components/ai-elements/message.tsx:329`（`MessageResponse`）
- Streamdown 原生支持 `plugins={{ math }}` 插件接口，math 为可选插件（官方包 `@streamdown/math`）。
- `katex@0.16.47` 已存在于 pnpm-lock（mermaid 的间接依赖），非直接依赖。
- **外链图片根因**：Streamdown 内置 sanitize 层对 `<img src>` 已放行 http/https
  （rehype-harden 配置 `allowedImagePrefixes:["*"]`）；真正拦截的是 CSP——
  `src-tauri/tauri.conf.json:28` 的 `img-src` 不含 `https:` 通配。
- 本地图片基础设施已有：`assetProtocol.enable=true, scope=["**"]`；
  `EditorPane.tsx:671` 已用 `convertFileSrc` 做图片预览。

## 需求决定（用户确认）

| 决策点 | 结论 |
|--------|------|
| 生效范围 | md 预览 + AI 聊天两处都启用 |
| 公式语法 | `$...$` 行内 + `$$...$$` 块级都支持 |
| 外链图片 | 允许 http/https 直接加载（与 GitHub 一致，不做点击后加载） |
| 本地图片 | 支持；相对路径基于 md 所在目录解析 |
| AI 消息中本地图 | 不支持（消息文本无基准目录，本质限制） |

## 方案选型

### 公式：官方 @streamdown/math 插件（方案 A）

- 安装 `@streamdown/math katex`（remark-math、rehype-katex 作为其依赖带入）。
- 拒绝的替代方案：
  - 手装 remark-math/rehype-katex 自组装 MathPlugin——重复官方封装，升级需自己跟；
  - 自研正则预处理——代码块/转义/表格等边界复杂度正是要避免的。
- KaTeX 优于 MathJax：语法覆盖主流需求、体积小一个量级。

### 图片：Streamdown urlTransform 回调 + 纯函数解析（方案 1）

- 新建纯函数模块做 URL 分支解析，两处调用点各自绑定上下文。
- 拒绝的替代方案：后端 Rust 解析（为字符串拼接加 IPC 往返，过度设计）。

## 详细设计

### 1. 依赖与样式

```
pnpm add @streamdown/math katex
```

`src/styles/globals.css` 追加：

```css
@source "../../node_modules/@streamdown/math/dist/*.js";
@import "katex/dist/katex.min.css";
```

（`@source` 让 Tailwind v4 扫描 math 插件的类名；katex CSS 约 25KB gzip，
字体 woff2 由浏览器按需子集加载。）

### 2. 共享插件常量

新建 `src/components/ai-elements/markdownPlugins.ts`：

```ts
import { math } from "@streamdown/math";

export const streamdownPlugins = { math };
```

模块级单例的原因：Streamdown 的 memo 比较包含 `plugins` 引用相等性，
每次 render 新建对象会使 memo 失效。

接入点（各加一行 `plugins={streamdownPlugins}`）：

- `src/modules/markdown/MarkdownPreviewPane.tsx` 的 `<Streamdown>`
- `src/components/ai-elements/message.tsx` 中 `MessageResponse` 的 `<Streamdown>`

### 3. 图片 URL 解析

新建 `src/modules/markdown/lib/markdownImages.ts`：

```ts
type ImageUrlOptions = { dirname?: string };

export function resolveMarkdownImageUrl(
  src: string,
  opts: ImageUrlOptions,
): string | undefined
```

分支规则：

| 输入 | 行为 |
|------|------|
| `data:` URI | 原样返回（sanitize 层 allowDataImages 已放行） |
| `https://` | 原样返回（CSP 放行后可加载） |
| `http://` | 返回 undefined（webview 为安全上下文，mixed content 必拦，加了也显示不出） |
| `file://` | 转本地路径 → asset 协议 URL |
| `/绝对路径` | 直接转 asset 协议 URL |
| `~/...` | 展开 home 目录 → asset 协议 URL |
| 相对路径 `./a.png`、`a/b.jpg` | 基于 `opts.dirname` resolve → asset 协议 URL；dirname 缺失返回 undefined |

实现要点：

- asset 协议转换复用 `convertFileSrc`（`@tauri-apps/api/core`，同步本地拼接，无 IPC）。
- home 目录展开用 `homeDir()`（`@tauri-apps/api/path`，异步 Promise，
  `useWorkspaceSwitcher.ts:3` 已有使用先例）。因是异步而 `urlTransform`
  是同步回调，`~/` 分支在 transform 入口先同步检查：以 `~/` 开头且无
  缓存 home 值时返回 undefined（该图不渲染），缓存命中则正常转换。
  模块级缓存一次获取终身复用（与 `rendererPool.ts:83` 的 `_homeDir`
  缓存模式一致）。
- 路径分隔符统一 forward-slash（项目跨平台规范 `.split(/[\\/]/)`）。
- `..` 越界不做沙箱收紧：`assetProtocol.scope` 已是 `**`，与 EditorPane
  图片预览同等权限。

CSP 改动（`src-tauri/tauri.conf.json:28`）：`img-src` 追加 `https:`。
不加 `http:`（理由同上表）。

### 4. 两处接入 urlTransform

`MarkdownPreviewPane` 与 `MessageResponse` 各传：

```tsx
urlTransform={(url, key, node) =>
  node.tagName === "img" && key === "src"
    ? resolveMarkdownImageUrl(url, { dirname }) ?? undefined
    : defaultUrlTransform(url, key, node)
}
```

- 预览面板：`dirname` = md 文件所在目录（从 path 推导）。
- AI 消息面板：不带 dirname → 本地路径分支全部拒绝，仅 https/data 可见。
- 其余属性（链接 href 等）走 Streamdown 默认 `defaultUrlTransform`，行为不变。
- transform 函数需 useMemo/useCallback 固定引用，避免 memo 失效。

### 5. 错误处理

- 解析返回 undefined：Streamdown 移除 src，img 渲染为空占位，alt 文本保留，不抛错。
- 本地文件不存在：asset 协议加载失败显示 broken image + alt。不做存在性探测
  （避免每图一次 IPC）。
- 公式渲染异常：KaTeX 内建容错输出源文本 + 错误提示，无需额外处理。

### 6. 性能

- katex CSS 约 25KB gzip 进全局样式；字体按需子集加载。
- `streamdownPlugins` 单例 + transform 引用固定，memo 不失效。
- math 插件随 markdown/AI 面板现有 lazy chunk 加载，无新入口 chunk。

## 测试计划

沿用 vitest + testing-library 模式：

1. `markdownImages.test.ts`：URL 解析分支全覆盖——
   https 放行 / http 拒绝 / data 原样 / file:// 转换 / 绝对路径 / 相对路径 +
   dirname / dirname 缺失拒绝 / Windows backslash 规范化 / `..` 越界。
2. 公式渲染组件测试：`$E=mc^2$` 与 `$$...$$` 经 Streamdown+plugins 渲染出
   `.katex` 元素；代码块内 `$` 不渲染；转义 `\$100` 不触发。
   （参照 `markdown-code.test.tsx` 现有模式。）
3. CSP 变更构建配置无法单测，人工验证记录在 PR 描述。
4. 完整 CI 清单：`pnpm lint && pnpm check-types && pnpm test &&
   cd src-tauri && cargo clippy --all-targets --locked -- -D warnings &&
   cargo nextest run --locked`。

## Non-goals

- MathJax 支持。
- 图片代理 / 点击后加载的隐私模式。
- AI 消息中的相对路径本地图片（无基准目录）。
- 对 sanitize 层白名单的收紧或放宽（维持 streamdown 默认）。

## 影响面

- 新依赖：`@streamdown/math`、`katex`（直接依赖；remark-math/rehype-katex 传递引入）
- 前端新增：`src/components/ai-elements/markdownPlugins.ts`、
  `src/modules/markdown/lib/markdownImages.ts`（含测试）
- 前端修改：`MarkdownPreviewPane.tsx`、`message.tsx`、`globals.css`
- 构建配置：`src-tauri/tauri.conf.json` CSP img-src
- 后端 Rust：无改动
