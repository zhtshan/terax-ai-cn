<div align="center">
  <img src="public/logo.png" width="144" height="144" alt="Terax" />
  <h1>Terax 中文版</h1>

  <p><strong>开源轻量级跨平台 AI 原生终端 (ADE)</strong></p>

  <p>
    <img src="https://img.shields.io/badge/版本-0.6.6--cn-blue" alt="版本" />
    <img src="https://img.shields.io/badge/协议-Apache--2.0-green" alt="协议" />
    <img src="https://img.shields.io/badge/平台-Windows-lightgrey" alt="平台" />
  </p>
</div>

---

> **声明**：本项目是 [Terax](https://github.com/crynta/terax-ai) 的中文汉化版本，原作者为 [Crynta](https://github.com/crynta)。本汉化版本遵循 Apache License 2.0 协议。

## 下载

本项目提供 **Windows 便携版**（portable），无需安装，下载即用。

## 项目简介

Terax 是一款快速、轻量的 AI 终端 (ADE)，基于 Tauri 2 + Rust 和 React 19 构建。它将原生 PTY 后端与现代 UI 相结合——多标签终端、集成代码编辑器、文件资源管理器，以及一流的 AI 侧边面板（支持使用自己的 API 密钥或通过 LM Studio 完全本地运行）。

磁盘占用不到 10 MB，无遥测，密钥存储在系统密钥链中。

## 截图

<table>
  <tr>
    <td align="center"><img src="docs/terminal.png" alt="终端" /><br/><sub>多标签终端，支持 WebGL 渲染</sub></td>
    <td align="center"><img src="docs/web-preview.png" alt="网页预览" /><br/><sub>本地开发服务器网页预览</sub></td>
  </tr>
  <tr>
    <td colspan="2" align="center"><img src="docs/ai-workflow.png" alt="AI 窗口" /><br/><sub>AI 代理工作流，支持代码编辑器中的编辑差异对比</sub></td>
  </tr>
</table>

## 功能特性

**终端**
- xterm.js + WebGL 渲染器，多标签支持后台流式传输
- 通过 `portable-pty` 实现原生 PTY 后端（支持 zsh、bash、pwsh 等）
- Shell 集成（当前目录报告、提示符标记）通过注入初始化脚本实现
- 内联搜索、链接检测、真彩色支持

**编辑器**
- CodeMirror 6，支持 TS/JS、Rust、Python、HTML/CSS、JSON、Markdown 等语言
- 内联 AI 自动补全和 AI 编辑差异对比
- Vim 模式
- 预置主题：Tokyo Night、Nord、GitHub、Atom One、Aura、Copilot、Xcode

**文件资源管理器**
- Catppuccin 图标主题（Material Icon Theme 解析器）
- 模糊搜索、键盘导航、内联重命名、上下文操作

**网页预览**
- 自动检测本地开发服务器并在预览标签中打开

**AI（自带密钥）**
- 支持的提供商：OpenAI、Anthropic、Google、Groq、xAI、Cerebras、OpenAI 兼容接口
- 通过 LM Studio 支持本地/离线模型
- 语音输入、编辑差异对比、多代理和子代理
- 代码片段/技能、可自定义系统提示词
- `TERAX.md` 用于项目记忆和配置
- 任务、计划、搜索、文件读写工具，支持审批流程

**品质**
- 轻量快速（约 7 MB 打包体积）
- API 密钥存储在系统密钥链中
- 无遥测，无需账号

## 配置 AI

1. 打开 **设置 → AI**。
2. 选择提供商并粘贴你的 API 密钥。对于本地推理，将 Terax 指向你的 LM Studio 端点。
3. 密钥通过 `keyring` 写入系统密钥链——它们永远不会接触磁盘或 `localStorage`。

## 从源码构建

**前置要求**
- Rust（stable）— https://rustup.rs
- Node 20+ 和 [pnpm](https://pnpm.io)
- 平台特定的 Tauri 前置要求 — https://tauri.app/start/prerequisites/

**运行**
```bash
pnpm install
pnpm tauri dev          # 开发模式
pnpm tauri build        # 生产打包
```

**检查**
```bash
pnpm exec tsc --noEmit          # 前端类型检查
cd src-tauri && cargo clippy    # Rust 代码检查
```

## 技术栈

Tauri 2 · Rust · `portable-pty` · React 19 · TypeScript · xterm.js · CodeMirror 6 · Vercel AI SDK v6 · Tailwind v4 · shadcn/ui · Zustand

## 贡献

欢迎 Issue 和 PR！请随时提交问题、建议功能或拉取请求。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目基于 Apache License 2.0 许可证。详见 [LICENSE](LICENSE)。

## 致谢

- 原项目：[terax-ai](https://github.com/crynta/terax-ai)
- 原作者：[Crynta](https://github.com/crynta)
