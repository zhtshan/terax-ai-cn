# 待开发 Issue 清单（2026-08-25 核对）

来源：上游 crynta/terax-ai 开放 issue，2026-08-25 在本仓库逐一核对后的结论。
已完成：#1137（custom endpoint 生成 commit message 报错）已于 dev@4224a5d 修复。

---

## 1. #1159 — 切换 space 后侧栏不更新（小改动）

**现象**：切换 space 时，左侧 Files / Source Control 列表不刷新，必须先在该 space 的终端里执行一次命令（触发 OSC 7 cwd 上报）才更新。

**根因**（已核实）：`src/app/App.tsx:283` 的 space 切换 effect 只做两件事——`adoptWorkspaceEnv(meta.env)` 和激活该 space 的最后一个 tab，**不更新 `explorerRoot`**。`explorerRoot` 目前只跟随终端 cwd 变化。

**修复思路**：space 切换 effect 里，从新 space 的 meta（env / 记录的 cwd）推导 explorerRoot 并同步；若 space 无记录 cwd 则回退到默认目录。

**相关代码**：
- `src/app/App.tsx:283-304`（space 切换 effect）
- `src/modules/spaces/lib/activeSpace.ts`、`useSpacesBoot.ts`（space 元数据）
- `src/modules/spaces/lib/activeSpace.test.ts`（现有测试可扩展）

**工作量**：小（1 个 effect + 状态推导，注意与 `setExplorerRoot` 的现有数据流合并）。

---

## 2. #1170 — 侧栏多文件选择 + 批量拖拽（大功能）

**现象**：文件浏览器只支持单选，无法 Cmd/Ctrl+click 多选、Shift+click 范围选，无法一次拖动/删除多个文件。

**上游方案**（issue 内已细化）：
- Cmd/Ctrl+click 切换选中；Shift+click 从上次点击行起连续选中
- 拖动多选中任一行到文件夹 = 整组移动（单文件拖拽已实现，扩展之）
- 目标名冲突时逐文件给 Replace/Skip 选择（现状：单文件冲突静默失败）
- 右键多选时给批量安全操作（Delete N items）；右键选中集外的文件先收拢为单选；Rename 仅单选时显示

**本仓库现状**（已核实）：`src/modules/explorer/` 无任何 metaKey/ctrlKey 多选逻辑；拖拽在 `useExplorerDnd.ts`（pointer-based）；后端 `fs_rename`/`fs_delete` 已存在，批量 = 前端循环调用。

**工作量**：大（选择状态模型 + 视觉态 + DnD 扩展 + 冲突对话框 + 右键菜单分支）。

**入手点**：先建 selection state（Set<key> + anchor row），再接点击事件，最后扩 DnD/菜单。

---

## 3. #1148 — Preview iframe 拦 cookie（需安全权衡）

**现象**：web preview 面板是沙箱 iframe，cookie-authenticated 的本地 dev server 无法登录（Set-Cookie 被丢，永远弹回登录页）。

**双重机制**（上游 issue 分析）：
1. sandbox 无 `allow-same-origin` → opaque origin，cookie/存储天然不可用
2. 即便有 `allow-same-origin`，framed 页面对 Terax host 是跨站的，`SameSite=Lax/Strict` cookie 作为第三方被丢；macOS/Linux 的 WebKit 系 WebView 默认拦第三方 cookie，与沙箱无关

**本仓库现状**（已核实）：`src/modules/preview/PreviewPane.tsx:113` sandbox 已含 `allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads`——Windows（Chromium）侧基本可用；**macOS/Linux WebKit 第三方 cookie 拦截仍在**。

**修复方向（需权衡）**：
- 方案 A：preview 加载时让 host origin 与目标同源（如自定义 protocol/host 映射），使 cookie 成为第一方——工程量大
- 方案 B：设置 WebView 允许第三方 cookie（`WKWebsiteDataStore` 策略 / webview 参数）——查 tauri/wry 是否暴露此配置
- 方案 C：文档化限制 + 提示用户用系统浏览器

**注意**：`allow-same-origin + allow-scripts` 组合时若 iframe 内容可导航宿主 origin 则沙箱可被绕过——当前 src 是用户自己的 dev server，风险可控，但改动前需复查。

**工作量**：中（调查 tauri/wry 能力为主，代码改动可能很小）。

---

## 4. #1089 — Markdown 公式渲染 + 外链图片（中等工作量）

**现象**：md 预览不支持 KaTeX/MathJax 公式；外链图片不显示（issue 报自 v0.5.9，外链图片现状需实测确认，公式确认缺失——全仓库无 katex/mathjax 依赖）。

**本仓库现状**（已核实）：`package.json` 无 katex/mathjax；编辑器预览组件在 `src/modules/editor/EditorPane.tsx` 一带。

**修复思路**：
- 引 `katex` + markdown 管线加 `$...$` / `$$...$$` 规则（注意与代码块冲突的边界处理）
- 外链图片：先实测（可能已被 CSP 或资源加载策略修复），若仍拦截则放宽 img 加载策略（仅 http/https scheme，防 file:// 泄露）

**注意**：新增依赖是本项目少有的"引库"决策；若渲染管线是自研，公式规则要贴着现有管线做，避免引入整个 markdown-it。

**工作量**：中（katex 集成 + 边界测试）。

---

## 优先级建议

1. #1159（小、纯前端、可测）
2. #1148（先调查 wry 配置，可能一行解决）
3. #1089（中，依赖决策）
4. #1170（大，建议单独开 change 走完整流程）
