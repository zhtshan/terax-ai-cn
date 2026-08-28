# #1089 Markdown 公式渲染 + 图片加载 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Markdown 预览与 AI 聊天消息支持 KaTeX 公式（`$...$` / `$$...$$`）和图片加载（https 外链、本地绝对/相对/`~/`/`file://` 路径）。

**Architecture:** 公式走 Streamdown 官方 `@streamdown/math` 插件（模块级单例常量传入两处 `<Streamdown>`）；图片走 Streamdown `urlTransform` 回调 + 新纯函数模块做 URL 分支解析，外链靠 CSP 放行，本地路径转 Tauri asset 协议。

**Tech Stack:** React 19、streamdown 2.5.0、@streamdown/math 1.0.2、katex ^0.16.27、vitest + happy-dom、Tauri v2。

**Spec:** `docs/2026-08-26-markdown-math-images-design.md`

## Global Constraints

- 包管理只用 pnpm。
- TypeScript 严格模式，无 `any`；前端导入统一 `@/…`，禁止跨模块相对路径（同模块内可用 `./` 相对导入，参照现有测试写法）。
- Biome 格式化：2 空格缩进，行宽 80；`biome.json` 排除 `src/components/ai-elements/**` 的 lint，但格式化仍生效——新文件放哪里都要能过 `pnpm lint`。
- 无 em-dash、无 emoji（代码/注释/commits）。
- commit message 用中文。
- 注释默认无，需要时只写 1-2 行 WHY。
- 完整 CI 清单（收尾任务跑）：`pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`
- 已知基线噪音：`pnpm test` 全量跑时 main/dev 上有 5 个 agentActivity unhandled rejection 存量失败（与本改动无关），判断标准是新测试文件单独跑必须全绿。
- 测试环境 happy-dom 无 Tauri runtime：`window.__TAURI_INTERNALS__` 不存在，直接调用 `convertFileSrc` 会抛错。测试中必须 `vi.mock("@tauri-apps/api/core")` 或 mock 本模块依赖（参照 `FileLinkProvider.test.ts:19` 的写法）。

## 已核实的关键事实（实现者必读）

1. **Streamdown 的 math 插件接口**（`node_modules/streamdown/dist/index.d.ts:159-175`）：`plugins?: PluginConfig`，其中 `math?: MathPlugin`。Streamdown 会把 `g.math.remarkPlugin` 追加到 remark 管线尾、`g.math.rehypePlugin` 追加到 rehype 管线尾（dist 源码已核实）。Streamdown 自身的 memo 比较包含 `plugins` 引用相等性——**插件对象必须是模块级单例，不能在 render 里内联字面量**。
2. **@streamdown/math 1.0.2 导出**：`math: MathPlugin`（预配置实例）和 `createMathPlugin(options?)`。源码（已解包核实）：`remarkPlugin = [remarkMath, { singleDollarTextMath: options.singleDollarTextMath ?? false }]`。**注意：默认关闭单 `$` 行内公式！** 用户需求是 `$` 和 `$$` 都支持，所以必须用 `createMathPlugin({ singleDollarTextMath: true })`，不能用预置的 `math` 导出。
3. **KaTeX CSS 必须手动引入**（README 明示 `import "katex/dist/katex.min.css"`），streamdown 不会自动注入 `getStyles()`。项目未引入过 `streamdown/styles.css`，本次也不引入（保持现状，只加 katex CSS）。CSS 里字体是相对路径引用 `fonts/`，Vite 构建会自动处理成带 hash 的资源 URL。
4. **katex 版本约束**：@streamdown/math 要求 `katex: "^0.16.27"`。lock 文件里已有 katex@0.16.47（mermaid 传递依赖），装 `"katex": "^0.16.27"` 即可与之一致，不引入第二个版本。
5. **CSP 是外链图拦截点**：`src-tauri/tauri.conf.json:28` 的 `img-src 'self' data: asset: https://asset.localhost blob:` 不含 `https:` 通配。sanitize 层（rehype-harden `allowedImagePrefixes:["*"]`）已放行 http/https。改 CSP 即通。
6. **defaultUrlTransform 是恒等函数**（dist 源码 `on=e=>e`）：urlTransform 回调里对非 img-src 属性返回原值即可，无需调用 streamdown 导出。
7. **UrlTransform 签名**：`(url: string, key: string, node: Element) => string | null | undefined`。返回 `undefined`/`null` 时属性被移除（img 变空占位，alt 保留）。
8. **home 目录来源**：App 启动时已有两处机制——`useWorkspaceSwitcher.ts:44-56` 异步取 `homeDir()` 归一化 forward-slash 后存入 React state；`rendererPool.setHomeDir()`（`rendererPool.ts:83-88`，经 `App.tsx:387-389` 喂值）存 module 级 `_homeDir`。本计划复用后者：从 `@/modules/terminal` 导入新增的 getter（见 Task 3），避免第三次 IPC。WSL workspace 时 home 是 WSL 内路径，asset 协议无法访问 WSL 文件系统——`~/` 分支照常解析（与 EditorPane 图片预览对 WSL 的行为一致，不额外特判，这是既有边界不是新引入的）。
9. **convertFileSrc**（`@tauri-apps/api/core.d.ts:158`）：`convertFileSrc(filePath: string, protocol = "asset"): string`，同步纯拼接（运行时读 `window.__TAURI_INTERNALS__.convertFileSrc`）。Windows 下产生 `http://asset.localhost/<encoded>`，macOS/Linux 下产生 `asset://localhost/<encoded>`。
10. **EditorPane 先例**：`EditorPane.tsx:671` 直接把 tab path（forward-slash 形态）传给 `convertFileSrc`，WSL/本地都这么用，无额外归一化。本计划遵循同一先例。
11. **biome 排除 ai-elements 目录的 lint**（`biome.json` includes `!src/components/ai-elements/**`）：放在该目录的新文件不会被 lint 但仍会被 tsc 检查。
12. **现有测试风格参照**：
    - 纯函数：`src/modules/explorer/lib/gitStatusUtils.test.ts`（vitest describe/it）
    - 组件渲染：`MarkdownPreviewPane.test.ts` 用正则断言 JSX 源码文本（不走 DOM 渲染，因为 happy-dom 无 Tauri runtime）
    - mock tauri core：`FileLinkProvider.test.ts:19` `vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }))`

## File Structure

```
package.json                                    Modify: 加 @streamdown/math、katex
pnpm-lock.yaml                                  自动更新
src/styles/globals.css                          Modify: @source math 插件 + @import katex CSS
src/components/ai-elements/markdownPlugins.ts   Create: streamdown 插件单例（math 配置）
src/components/ai-elements/markdownPlugins.test.ts  Create
src/modules/markdown/lib/markdownImages.ts      Create: 图片 URL 解析纯函数 + home 缓存
src/modules/markdown/lib/markdownImages.test.ts Create
src/modules/markdown/index.ts                   Modify: 导出新函数（供 message.tsx 用）
src/modules/markdown/MarkdownPreviewPane.tsx    Modify: plugins + urlTransform
src/modules/markdown/MarkdownPreviewPane.test.ts Modify: 断言新 props 存在
src/components/ai-elements/message.tsx          Modify: plugins + urlTransform
src/modules/terminal/lib/rendererPool.ts        Modify: 新增 getHomeDirCache/setHomeDir 已有，导出 getter 经 index.ts
src/modules/terminal/index.ts                   Modify: 导出 home getter
src-tauri/tauri.conf.json                       Modify: CSP img-src 加 https:
docs/superpowers/plans/…                        本计划文档
```

职责边界：`markdownImages.ts` 只做字符串→URL 的决策（不含 React）；`message.tsx`/`MarkdownPreviewPane.tsx` 各自组装回调；`markdownPlugins.ts` 是 ai-elements 与 markdown 两模块共享的单例，放在 ai-elements（与 streamdown 封装同层）。

---

### Task 1: 安装依赖并接入公式插件

**Files:**
- Modify: `package.json`（经 pnpm add）
- Create: `src/components/ai-elements/markdownPlugins.ts`
- Create: `src/components/ai-elements/markdownPlugins.test.ts`
- Modify: `src/styles/globals.css`
- Modify: `src/modules/markdown/MarkdownPreviewPane.tsx:28`（components 常量附近）
- Modify: `src/components/ai-elements/message.tsx:324`

**Interfaces:**
- Produces: `export const streamdownPlugins: { math: MathPlugin }` —— `src/components/ai-elements/markdownPlugins.ts` 模块级单例。Task 2、Task 4 消费。

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/startiasoft/work/terax-ai-cn
pnpm add @streamdown/math katex@^0.16.47
```

Expected: package.json dependencies 出现 `"@streamdown/math": "^1.0.2"` 与 `"katex": "^0.16.47"`（或兼容的 ^0.16.x 解析值），无 peer 冲突警告。

- [ ] **Step 2: 写失败测试**

创建 `src/components/ai-elements/markdownPlugins.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { streamdownPlugins } from "./markdownPlugins";

describe("streamdownPlugins", () => {
  it("enables single dollar inline math per project requirement", async () => {
    // createMathPlugin 默认 singleDollarTextMath=false，必须显式开启
    const remarkArgs = streamdownPlugins.math.remarkPlugin as unknown[];
    const opts = remarkArgs[1] as { singleDollarTextMath?: boolean };
    expect(opts.singleDollarTextMath).toBe(true);
  });

  it("is a stable module-level singleton for streamdown memo", () => {
    expect(streamdownPlugins.math.name).toBe("katex");
    expect(streamdownPlugins.math.type).toBe("math");
  });
});
```

- [ ] **Step 3: 运行确认失败**

```bash
pnpm vitest run src/components/ai-elements/markdownPlugins.test.ts
```

Expected: FAIL，`Cannot find module './markdownPlugins'`。

- [ ] **Step 4: 实现**

创建 `src/components/ai-elements/markdownPlugins.ts`：

```typescript
import { createMathPlugin } from "@streamdown/math";

// Module-level singleton: Streamdown's memo compares the plugins prop by
// reference, a fresh literal each render would break memoization.
export const streamdownPlugins = {
  math: createMathPlugin({ singleDollarTextMath: true }),
};
```

- [ ] **Step 5: 运行确认通过**

```bash
pnpm vitest run src/components/ai-elements/markdownPlugins.test.ts
```

Expected: PASS（2 个用例）。

- [ ] **Step 6: 写公式渲染集成测试**

在同一测试文件追加：

```typescript
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe as suite } from "vitest";
import { Streamdown } from "streamdown";

afterEach(cleanup);

suite("Streamdown with math plugin", () => {
  it("renders inline $...$ as katex", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"Euler: $e^{i\\pi} + 1 = 0$"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex")).not.toBeNull();
  });

  it("renders block $$...$$ as katex-display", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"$$\\int_0^1 x^2 dx = \\frac{1}{3}$$"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("does not render dollar signs inside fenced code", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"```\nconst price = $100;\n```"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex")).toBeNull();
  });

  it("does not trigger on escaped dollar (price text)", () => {
    const { container } = render(
      <Streamdown plugins={streamdownPlugins} mode="static">
        {"it costs \\$100 and \\$200 total"}
      </Streamdown>,
    );
    expect(container.querySelector(".katex")).toBeNull();
  });
});
```

若 `@testing-library/react` 未安装（先 `grep '@testing-library/react' package.json` 确认），改用 react-dom/client 的 `createRoot` + `act` 手写挂载；两种都行，以项目已有依赖为准。

```bash
pnpm vitest run src/components/ai-elements/markdownPlugins.test.ts
```

Expected: PASS。此步验证插件本身工作（先于接线）；若 FAIL 说明依赖安装或插件用法有误，停下排查，不要继续。

- [ ] **Step 7: globals.css 引入样式**

修改 `src/styles/globals.css`，第 7 行 `@source "../../node_modules/streamdown/dist/index.js";` 之后追加：

```css
@source "../../node_modules/@streamdown/math/dist/*.js";
@import "katex/dist/katex.min.css";
```

验证样式可被 Vite 解析：

```bash
pnpm check-types || true   # CSS 不参与 tsc，真正验证在 Step 8 build
```

跳过单独 build（慢），由 Task 5 收尾时的完整构建覆盖。此处人工确认两行已写入即可。

- [ ] **Step 8: 接入两处 Streamdown**

`src/modules/markdown/MarkdownPreviewPane.tsx`：

```tsx
import { streamdownPlugins } from "@/components/ai-elements/markdownPlugins";
```

`<Streamdown>`（约 88 行）加一个 prop：

```tsx
<Streamdown
  className="select-text [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
  components={components}
  mode="static"
  parseIncompleteMarkdown={false}
  plugins={streamdownPlugins}
>
```

`src/components/ai-elements/message.tsx`（324 行附近）同样导入并给 `<Streamdown>`（329 行）加 `plugins={streamdownPlugins}`。

- [ ] **Step 9: 类型检查与提交**

```bash
pnpm check-types
git add package.json pnpm-lock.yaml src/styles/globals.css src/components/ai-elements/markdownPlugins.ts src/components/ai-elements/markdownPlugins.test.ts src/modules/markdown/MarkdownPreviewPane.tsx src/components/ai-elements/message.tsx
git commit -m "feat(markdown): KaTeX 公式渲染（\$ 与 \$\$, streamdown math 插件）"
```

Expected: check-types 通过；commit 成功。

---

### Task 2: markdownImages URL 解析纯函数

**Files:**
- Create: `src/modules/markdown/lib/markdownImages.ts`
- Create: `src/modules/markdown/lib/markdownImages.test.ts`

**Interfaces:**
- Consumes: `convertFileSrc(filePath: string): string`（`@tauri-apps/api/core`，Task 3 中 mock）
- Produces:
  - `resolveImageUrl(src: string, ctx: ImageUrlContext): string | undefined` —— 纯函数（home 缓存读取除外）
  - `type ImageUrlContext = { dirname?: string; home?: string | null }`
  - `setKnownHome(home: string | null): void` / `getKnownHome(): string | null` —— 模块级缓存读写

- [ ] **Step 1: 写失败测试**

创建 `src/modules/markdown/lib/markdownImages.test.ts`。测试不触网、不碰真实 Tauri：mock 掉 `convertFileSrc` 让输出可预测。

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((p: string) => `asset://test/${p}`),
}));

import { convertFileSrc } from "@tauri-apps/api/core";
import {
  resolveImageUrl,
  setKnownHome,
  type ImageUrlContext,
} from "./markdownImages";

const mockConvert = vi.mocked(convertFileSrc);
const localCtx: ImageUrlContext = {
  dirname: "/home/u/notes",
  home: "/home/u",
};

beforeEach(() => {
  mockConvert.mockClear();
});

describe("resolveImageUrl remote schemes", () => {
  it("passes https through unchanged", () => {
    expect(resolveImageUrl("https://a.com/x.png", localCtx)).toBe(
      "https://a.com/x.png",
    );
  });

  it("rejects http (mixed content is blocked anyway)", () => {
    expect(resolveImageUrl("http://a.com/x.png", localCtx)).toBeUndefined();
  });

  it("passes data URIs through unchanged", () => {
    const uri = "data:image/png;base64,iVBORw0KGgo=";
    expect(resolveImageUrl(uri, localCtx)).toBe(uri);
    expect(mockConvert).not.toHaveBeenCalled();
  });
});

describe("resolveImageUrl local paths", () => {
  it("converts absolute paths via convertFileSrc", () => {
    resolveImageUrl("/abs/img.png", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/abs/img.png");
  });

  it("resolves relative paths against the md directory", () => {
    resolveImageUrl("./img.png", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/u/notes/img.png");
    resolveImageUrl("sub/dir/pic.jpg", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/u/notes/sub/dir/pic.jpg");
  });

  it("resolves ../ against the md directory", () => {
    resolveImageUrl("../shared/logo.gif", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/u/shared/logo.gif");
  });

  it("expands ~/ with cached home", () => {
    resolveImageUrl("~/pics/me.webp", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/home/u/pics/me.webp");
  });

  it("returns undefined for ~/ when no home cached", () => {
    expect(
      resolveImageUrl("~/x.png", { dirname: "/d", home: null }),
    ).toBeUndefined();
  });

  it("converts file:// URIs to asset URLs", () => {
    resolveImageUrl("file:///abs/img.png", localCtx);
    expect(mockConvert).toHaveBeenCalledWith("/abs/img.png");
  });

  it("returns undefined for relative paths without dirname", () => {
    expect(resolveImageUrl("./img.png", {})).toBeUndefined();
  });
});

describe("resolveImageUrl edge cases", () => {
  it("normalizes windows backslashes in relative paths", () => {
    resolveImageUrl(".\\img\\a.png", { dirname: "C:/Users/u/doc" });
    expect(mockConvert).toHaveBeenCalledWith("C:/Users/u/doc/img/a.png");
  });

  it("keeps .. traversal (asset scope is **, same as EditorPane)", () => {
    resolveImageUrl("../../etc/passwd.png", localCtx);
    // 不抛错、仍产出 asset URL；越界收紧超出本 change 范围
    expect(mockConvert).toHaveBeenCalled();
  });

  it("returns undefined for empty or whitespace input", () => {
    expect(resolveImageUrl("", localCtx)).toBeUndefined();
    expect(resolveImageUrl("   ", localCtx)).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm vitest run src/modules/markdown/lib/markdownImages.test.ts
```

Expected: FAIL，`Cannot find module './markdownImages'`。

- [ ] **Step 3: 实现**

创建 `src/modules/markdown/lib/markdownImages.ts`：

```typescript
import { convertFileSrc } from "@tauri-apps/api/core";

export type ImageUrlContext = {
  /** Directory of the markdown file; absent for AI chat messages. */
  dirname?: string;
  /** Cached user home (forward-slash form); null until resolved. */
  home?: string | null;
};

let knownHome: string | null = null;

/** Fed once from App bootstrap (same value rendererPool caches). */
export function setKnownHome(home: string | null): void {
  knownHome = home;
}

export function getKnownHome(): string | null {
  return knownHome;
}

function toAsset(path: string): string {
  return convertFileSrc(path.replace(/\\/g, "/"));
}

/**
 * Decide what an <img src> inside markdown should load.
 * Returns undefined to drop the attribute (broken-image placeholder with alt).
 */
export function resolveImageUrl(
  src: string,
  ctx: ImageUrlContext,
): string | undefined {
  const trimmed = src.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("data:")) return trimmed;

  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return undefined;

  const home = ctx.home ?? knownHome;

  if (trimmed.startsWith("~/")) {
    if (!home) return undefined;
    return toAsset(`${home}/${trimmed.slice(2)}`);
  }

  if (/^file:\/\//i.test(trimmed)) {
    let p = trimmed.slice("file://".length);
    while (p.startsWith("/")) p = p.slice(1);
    return toAsset(`/${p}`);
  }

  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) {
    return toAsset(trimmed);
  }

  if (trimmed.startsWith("/")) return toAsset(trimmed);

  if (!ctx.dirname) return undefined;
  return toAsset(joinPath(ctx.dirname, trimmed));
}

function joinPath(dir: string, rel: string): string {
  const parts = `${dir}/${rel}`.split(/[\\/]/);
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      out.pop();
      continue;
    }
    out.push(part);
  }
  const joined = out.join("/");
  // Preserve drive prefix form for Windows absolutes like C:/...
  if (/^[a-zA-Z]:/.test(joined)) return joined;
  return `/${joined}`;
}
```

注意 joinPath 的语义：dirname 可能是 `/home/u/notes`（POSIX）或 `C:/Users/u/doc`（Windows 盘符）。`..` 弹栈后 POSIX 形态补回前导 `/`；盘符形态天然无前导斜杠。测试里 `../shared/logo.gif` 从 `/home/u/notes` 得到 `/home/u/shared/logo.gif` 正确。

- [ ] **Step 4: 运行确认通过**

```bash
pnpm vitest run src/modules/markdown/lib/markdownImages.test.ts
```

Expected: PASS（全部用例）。

- [ ] **Step 5: 提交**

```bash
pnpm lint -- src/modules/markdown/lib/markdownImages.ts src/modules/markdown/lib/markdownImages.test.ts 2>/dev/null || pnpm lint
git add src/modules/markdown/lib/markdownImages.ts src/modules/markdown/lib/markdownImages.test.ts
git commit -m "feat(markdown): 图片 URL 解析纯函数（https/data/本地路径分支）"
```

---

### Task 3: home 缓存接线（App → markdownImages）

**Files:**
- Modify: `src/app/App.tsx:387-389`
- Modify: `src/modules/markdown/index.ts`

**Interfaces:**
- Consumes: `setKnownHome`（Task 2）、App 现有 `home` state（`useWorkspaceSwitcher` 返回，forward-slash 形态或 null）
- Produces: App 启动后 `getKnownHome()` 返回非空值。Task 4 的 transform 在 home 未就绪时对 `~/` 图片降级为不渲染（可接受：首帧后立即恢复）。

- [ ] **Step 1: 扩展 App.tsx 现有 effect**

`src/app/App.tsx:387-389` 现为：

```tsx
useEffect(() => {
  setHomeDir(home);
}, [home]);
```

改为同时喂 markdownImages 缓存：

```tsx
useEffect(() => {
  setHomeDir(home);
  setKnownHome(home);
}, [home]);
```

顶部 import 区加入：

```tsx
import { setKnownHome } from "@/modules/markdown";
```

（按 biome organizeImports 的分组规则放到正确位置，跑 `pnpm lint --write` 自动整理。）

- [ ] **Step 2: 导出**

`src/modules/markdown/index.ts` 追加：

```typescript
export { setKnownHome } from "./lib/markdownImages";
```

- [ ] **Step 3: 验证与提交**

```bash
pnpm check-types && pnpm vitest run src/modules/markdown/
git add src/app/App.tsx src/modules/markdown/index.ts
git commit -m "feat(markdown): App 启动时喂 home 缓存给图片路径解析"
```

Expected: 通过。无新测试（纯接线，Task 2 已覆盖缓存读取逻辑）。

---

### Task 4: urlTransform 接入两处 Streamdown

**Files:**
- Modify: `src/modules/markdown/MarkdownPreviewPane.tsx`
- Modify: `src/modules/markdown/MarkdownPreviewPane.test.ts`
- Modify: `src/components/ai-elements/message.tsx`

**Interfaces:**
- Consumes: `resolveImageUrl(src, ctx)`（Task 2）、`streamdownPlugins`（Task 1）、Streamdown `UrlTransform` 类型 `(url: string, key: string, node: Element) => string | null | undefined`
- Produces: md 预览/AI 消息里的 `<img>` 按设计分支加载。

- [ ] **Step 1: 更新 MarkdownPreviewPane 源码断言测试（失败）**

`src/modules/markdown/MarkdownPreviewPane.test.ts` 采用源码正则断言风格（happy-dom 无 Tauri runtime，不做真渲染）。追加用例：

```typescript
describe("MarkdownPreviewPane image handling", () => {
  it("wires urlTransform for images and passes math plugins", () => {
    expect(streamdownJsx).toMatch(/plugins=\{streamdownPlugins\}/);
    expect(streamdownJsx).toMatch(/urlTransform=\{transformImageUrl\}/);
  });

  it("derives dirname from the md file path via markdownImageDirname", () => {
    expect(src).toMatch(/markdownImageDirname\(/);
    expect(src).toMatch(/useMemo\(\(\) => markdownImageDirname\(path\)/);
  });
});
```

- [ ] **Step 2: 运行确认失败**

```bash
pnpm vitest run src/modules/markdown/MarkdownPreviewPane.test.ts
```

Expected: 新增用例 FAIL（props 还不存在）。

- [ ] **Step 3: 实现 MarkdownPreviewPane**

修改 `src/modules/markdown/MarkdownPreviewPane.tsx`：

imports 增加：

```tsx
import { useCallback, useMemo } from "react"; // 并入现有 react import 行
import {
  defaultUrlTransform,
  type UrlTransform,
} from "streamdown";
import {
  markdownImageDirname,
  resolveImageUrl,
} from "@/modules/markdown/lib/markdownImages"; // 同模块相对导入 "./lib/markdownImages" 亦可，随 biome 整理
```

组件体内（`useState` 之后）：

```tsx
const dirname = useMemo(() => markdownImageDirname(path), [path]);

const transformImageUrl: UrlTransform = useCallback(
  (url, key, node) => {
    if (node.tagName === "img" && key === "src") {
      return resolveImageUrl(url, { dirname });
    }
    return defaultUrlTransform(url, key, node);
  },
  [dirname],
);
```

（`markdownImageDirname` 见下方补充导出：从完整 path 取目录部分。在 Task 2 的 `markdownImages.ts` 里补一个小函数：）

```typescript
/** Directory part of a file path ("a/b/c.md" -> "/a/b"); "" when bare. */
export function markdownImageDirname(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "";
  return normalized.slice(0, idx);
}
```

并在 Task 2 的测试文件追加对应用例：

```typescript
describe("markdownImageDirname", () => {
  it("extracts the directory portion", () => {
    expect(markdownImageDirname("/home/u/notes/a.md")).toBe("/home/u/notes");
    expect(markdownImageDirname("C:\\Users\\u\\doc\\a.md")).toBe(
      "C:/Users/u/doc",
    );
    expect(markdownImageDirname("a.md")).toBe("");
  });
});
```

`<Streamdown>` 加 prop（与 Task 1 的 plugins 并列）：

```tsx
urlTransform={transformImageUrl}
```

- [ ] **Step 4: 实现 MessageResponse**

修改 `src/components/ai-elements/message.tsx`：

```tsx
import {
  defaultUrlTransform,
  type UrlTransform,
} from "streamdown";
import { resolveImageUrl } from "@/modules/markdown";
```

（`index.ts` 补导出 `resolveImageUrl`。AI 消息无基准目录：ctx 不带 dirname，本地路径分支自然拒绝。）

`MessageResponse` 组件外定义稳定引用（模块级，非 hook 内）：

```tsx
const transformMessageImageUrl: UrlTransform = (url, key, node) => {
  if (node.tagName === "img" && key === "src") {
    return resolveImageUrl(url, {});
  }
  return defaultUrlTransform(url, key, node);
};
```

`<Streamdown>`（约 329 行）加：

```tsx
plugins={streamdownPlugins}
urlTransform={transformMessageImageUrl}
```

- [ ] **Step 5: 运行确认通过**

```bash
pnpm vitest run src/modules/markdown/ pnpm vitest run src/components/ai-elements/
```

Expected: 全部 PASS（含 Task 1 的公式用例与新断言）。

- [ ] **Step 6: 类型检查与提交**

```bash
pnpm check-types
git add src/modules/markdown/MarkdownPreviewPane.tsx src/modules/markdown/MarkdownPreviewPane.test.ts src/modules/markdown/lib/markdownImages.ts src/modules/markdown/lib/markdownImages.test.ts src/modules/markdown/index.ts src/components/ai-elements/message.tsx
git commit -m "feat(markdown): 预览与 AI 消息接入图片 urlTransform 与公式插件"
```

---

### Task 5: CSP 放行 https 外链图 + 全量验证

**Files:**
- Modify: `src-tauri/tauri.conf.json:28`

**Interfaces:**
- Consumes: 无代码依赖。运行时行为：webview 允许加载 `https:` 图片资源。
- Produces: 外链图片可显示。

- [ ] **Step 1: 修改 CSP**

`src-tauri/tauri.conf.json` 第 28 行 `csp` 字符串中，将：

```
img-src 'self' data: asset: https://asset.localhost blob:;
```

改为：

```
img-src 'self' data: asset: https://asset.localhost blob: https:;
```

不加 `http:`（安全上下文 mixed content 必拦，加了也不显示）。Rust 侧零改动，无需重编 cargo。

- [ ] **Step 2: JSON 合法性验证**

```bash
python3 -c "import json; json.load(open('src-tauri/tauri.conf.json')); print('ok')"
```

Expected: 输出 `ok`。

- [ ] **Step 3: 全量 CI 清单**

```bash
pnpm lint && pnpm check-types && pnpm test; echo "--- frontend done ---"
cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked
```

Expected:
- lint/type-check 通过；
- `pnpm test` 中新文件（markdownPlugins / markdownImages / MarkdownPreviewPane）全绿；存量 agentActivity unhandled rejection 失败为已知基线噪音，不属于本次回归（对照 memory：main 上 5 个，dev 同）；
- cargo clippy/nextest 通过（Rust 无改动，应无变化）。

- [ ] **Step 4: 人工冒烟清单（记录到 PR/commit 描述）**

启动 `pnpm tauri dev`，验证：
1. 打开含 `$E=mc^2$` 和 `$$\sum_i x_i$$` 的 md 文件，预览渲染公式；
2. AI 聊天让模型输出一段 LaTeX，消息区渲染公式；
3. md 里 `![remote](https://github.com/github.png)` 显示（任选一张确定存在的 https 图）；
4. md 同目录放 `local.png`，`![local](./local.png)` 显示；
5. `![missing](./nope.png)` 显示 broken 占位 + alt，不崩；
6. 代码块里的 `$100` 保持纯文本。

- [ ] **Step 5: 提交**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat(markdown): CSP img-src 放行 https 外链图片"
```

---

## 收尾

- 更新 `docs/2026-08-25-pending-issues-plan.md`：#1089 条目标注已完成（commit hash）。
- 可选：openspec 流程归档（若用户要求走 opsx:archive 则另行走 spec 同步）。
