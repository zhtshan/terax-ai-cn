# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此仓库工作时提供指导。

---

## 代码搜索

本仓库已建 CodeGraph 索引（`.codegraph/` 存在）。**切换模型或新开会话时，搜索、定位代码必须优先用 CodeGraph**：

```bash
codegraph explore "<symbol names or question>"
```

仅当 CodeGraph 无结果时才降级到 grep/find。

---

## 项目概览

**Terax 中文版** —— 开源轻量级 AI 原生终端（ADE）
- **包管理**：**pnpm**（必须）

---

## 开发命令速查

### 完整检查清单（CI 同步）

在声称完成前必须通过：
```bash
pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked
```

---

## 核心架构

### 双进程模型

**Rust（src-tauri/）** 独占所有 OS 访问权，webview 通过 `invoke()` 调用 Tauri 命令与之通信。

**React（src/）** 是单窗口应用，通过 `@/…` 路径别名组织模块。

### 关键设计原则

1. **纯函数核心 + 命令式外壳**：业务逻辑在轻量纯函数中（易测试），Tauri 命令和 React 组件保持精简。
2. **零成本抽象**：已禁用的功能不占资源（无 LSP 进程、无多余 re-render）。
3. **渲染器池**：xterm 最多 12 个实例，后台标签页流式传输到 DormantRing 缓冲（1 MiB），避免重排。
4. **标签页不卸载**：`invisible pointer-events-none` 隐藏而非销毁，PTY/dev-server 持续流式。
5. **跨平台路径规范**：前端使用 forward-slash，Windows 路径在边界规范化。

---

## 质量标准（必读）

生产级代码或不交付。每个改动都需通过以下四道：

| 标准 | 说明 |
|------|------|
| **正确性** | 边界情况、失败模式、并发访问——无"先这样行" |
| **性能** | RAM/IPC/重排/依赖权衡——每改动都问"成本多少" |
| **安全** | 边界验证、密钥路径拒绝列表（读写都适用） |
| **UX/UI** | 抛光、专业、细节完善 |

---

## 代码约定

- **注释**：默认无，代码自解释。需要时只写 1-2 行 WHY，不写 WHAT。
- **导入**：前端统一 `@/…`，禁止跨模块相对路径。
- **路径**：跨平台用 `.split(/[\\/]/)` 而非 `.split("/")`。
- **Tailwind**：v4，配置在 `src/App.css` 的 `@theme` 块，用 `cn()` 工具函数。
- **Biome**：代码检查 + 格式化（配置在 `biome.json`）。
- **TypeScript**：严格模式，无 `any`。
- **无 em-dash、无 emoji**（代码/注释/commits 都不用）。

---

## 已知陷阱（Gotchas）

| 陷阱 | 原因 | 处理 |
|------|------|------|
| React 19 strict 双挂载 | dev 双调用 useEffect | 第一个 PTY 立即清理，SPAWN_LOCK 序列化 |
| Windows PowerShell 孤儿 | `killer.kill()` 仅杀即时子进程 | Job Object（进程组杀）+ pty_close 清理 |
| Tab cwd 存储格式 | OSC 7 forward-slash，Win 命令接 backslash | 边界规范化（fs 命令已处理） |
| AiComposerProvider 挂载 | 条件 mount 在 key 加载时重挂全树 | 无条件挂载（keychain 读通常同一帧） |
| DormantRing 缓冲 | 后台标签页中途卡阻 | 切换后再序列化，禁止 mid-command 标签快照 |

---

## 提交信息
所有 git commit message 使用中文。
