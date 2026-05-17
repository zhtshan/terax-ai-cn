# Terax Chinese Localization Progress

## Overview
- **Tech Stack**: react-i18next + i18next + i18next-browser-languagedetector
- **Target**: Windows 版本前端 UI 中文化
- **Fallback**: 英文 (en) 作为回退语言
- **不翻译**: Rust 后端错误消息、NSIS 安装器、Provider/Model 名称、SYSTEM_PROMPT

## Files Created (i18n Infrastructure)

| File | Status | Description |
|------|--------|-------------|
| `src/i18n/index.ts` | ✅ | i18next 初始化配置 (LanguageDetector, fallbackLng='en', lng='zh-CN') |
| `src/i18n/locales/zh.json` | ✅ | 中文翻译文件 (~472 keys) |
| `src/i18n/locales/en.json` | ✅ | 英文翻译文件 (~472 keys, 已同步) |
| `package.json` | ✅ | 添加依赖: i18next, react-i18next, i18next-browser-languagedetector |

## Files Modified (Entry Points)

| File | Status | Changes |
|------|--------|---------|
| `src/main.tsx` | ✅ | 添加 `import "./i18n"` |
| `src/settings/main.tsx` | ✅ | 添加 `import "../i18n"` |
| `index.html` | ✅ | `lang="en"` → `lang="zh-CN"` |
| `settings.html` | ✅ | `lang="en"` → `lang="zh-CN"` |

## Completed Components (33 files)

### Settings Module (7 files)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/settings/SettingsApp.tsx` | ✅ | 5 tab 标签 (General/Shortcuts/Models/Agents/About) |
| `src/settings/sections/GeneralSection.tsx` | ✅ | ~20 strings: 主题、编辑器、Vim、文件浏览器、终端、启动 |
| `src/settings/sections/ShortcutsSection.tsx` | ✅ | ~15 strings: 标题、重置、搜索、录制、清除 |
| `src/settings/sections/ModelsSection.tsx` | ✅ | ~30 strings: 云提供商、LM Studio、OpenAI 兼容、自动补全 |
| `src/settings/sections/AgentsSection.tsx` | ✅ | ~40 strings: Agent/Snippet 编辑、验证、自定义指令 |
| `src/settings/sections/AboutSection.tsx` | ✅ | ~15 strings: 版本、更新按钮、链接 |
| `src/settings/components/ProviderKeyCard.tsx` | ✅ | ~12 strings: API Key 验证、保存、删除 |

### Core Components (2 files)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/app/App.tsx` | ✅ | 12 strings: 未保存更改对话框 |
| `src/components/WindowControls.tsx` | ✅ | 3 aria-labels: 最小化/最大化/关闭 |

### Header/Status (4 files)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/modules/header/Header.tsx` | ✅ | 6 strings: 快捷键、设置、侧边栏、分屏 |
| `src/modules/header/SearchInline.tsx` | ✅ | 4 strings: 搜索占位符、清除 |
| `src/modules/statusbar/StatusBar.tsx` | ✅ | 2 strings: 隐私标签、提示 |
| `src/modules/statusbar/WorkspaceEnvSelector.tsx` | ✅ | 7 strings: Windows、WSL 环境选择 |

### Tabs (1 file)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/modules/tabs/TabBar.tsx` | ✅ | 8 strings: 终端、隐私、编辑器、预览、新标签 |

### Explorer Module (3 files)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/modules/explorer/FileExplorer.tsx` | ✅ | 12 strings: 工具栏、右键菜单 |
| `src/modules/explorer/FileTreeNode.tsx` | ✅ | 13 strings: 右键菜单项 |
| `src/modules/explorer/ExplorerSearch.tsx` | ✅ | 11 strings: 搜索、右键菜单 |

### Editor Module (1 file)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/modules/editor/NewEditorDialog.tsx` | ✅ | 8 strings: 新建文件对话框 |

### Preview Module (2 files)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/modules/preview/PreviewPane.tsx` | ✅ | 6 strings: 预览面板状态 |
| `src/modules/preview/PreviewAddressBar.tsx` | ✅ | 10 strings: 地址栏、端口选择 |

### Dialogs (2 files)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/modules/shortcuts/ShortcutsDialog.tsx` | ✅ | 4 strings: 快捷键对话框 |
| `src/modules/updater/UpdaterDialog.tsx` | ✅ | 12 strings: 更新对话框 |

### AI Module (12 files)
| File | Status | Key Strings |
|------|--------|-------------|
| `src/modules/ai/components/AiChat.tsx` | ✅ | 16 strings: 空状态、思考、继续、错误、压缩通知 |
| `src/modules/ai/components/AiInputBar.tsx` | ✅ | 9 strings: 语音、占位符、连接提示 |
| `src/modules/ai/components/AiMiniWindow.tsx` | ✅ | 30+ strings: 计划模式、会话、上下文面板 |
| `src/modules/ai/components/AiStatusBarControls.tsx` | ✅ | 30+ strings: 模型选择、收藏、能力标签 |
| `src/modules/ai/components/AiToolApproval.tsx` | ✅ | 15 strings: 工具审批、预览 |
| `src/modules/ai/components/SelectionAskAi.tsx` | ✅ | 1 string: 问 Terax |
| `src/modules/ai/components/AgentSwitcher.tsx` | ✅ | 4 strings: Agent 切换器 |
| `src/modules/ai/components/AgentStatusPill.tsx` | ✅ | 5 strings: 状态标签 |
| `src/modules/ai/components/FilePicker.tsx` | ✅ | 5 strings: 工作区文件选择 |
| `src/modules/ai/components/SnippetPicker.tsx` | ✅ | 3 strings: Snippet 选择器 |
| `src/modules/ai/components/PlanDiffReview.tsx` | ✅ | 7 strings: 计划审查面板 |
| `src/modules/ai/components/TodoStrip.tsx` | ✅ | 1 string: 待办标签 |

## Completed Components (33 files)

### Common AI Elements (3 files)
| File | Status | Keys Used |
|------|--------|-----------|
| `src/components/ai-elements/conversation.tsx` | ✅ | `ai.conversation.noMessages`, `ai.conversation.startConversation` |
| `src/components/ai-elements/reasoning.tsx` | ✅ | `ai.reasoning.thinking`, `ai.reasoning.reasoned`, `ai.reasoning.reasonedFor` |
| `src/components/ai-elements/tool.tsx` | ✅ | `ai.tools.*` (~30 strings: 16 tool names, 7 tool states, input/output/read/empty/truncated/created/wrote/running/stdout/stderr/exitCode/timedOut/insert/inserted) |

## Final Steps

| Step | Status | Description |
|------|--------|-------------|
| 编辑 conversation.tsx | ✅ | 添加 useTranslation, 替换 2 个字符串 |
| 编辑 reasoning.tsx | ✅ | 添加 useTranslation, 替换 3 个字符串 |
| 编辑 tool.tsx | ✅ | 添加 useTranslation, 替换 ~30 个字符串 (工具名+状态+标签) |
| 同步 en.json | ✅ | en.json 与 zh.json 的 key 完全一致 (已验证) |
| 运行 tsc 验证 | ❌ | `pnpm exec tsc --noEmit` (需安装项目依赖) |
| 构建验证 | ❌ | `pnpm tauri build` (需 Windows 环境) |

## Translation Key Pattern

```typescript
// 静态字符串
t("section.key")

// 带插值的字符串
t("section.key", { variable: value })
// JSON: "key": "{{variable}} 的文本"

// 需要 t 的函数
function describe(meta, t) { return t("ai.tools.status." + meta.status); }
```

## Current TODO Status (Last Updated: 2026-05-16)

| # | Task | Status | Priority |
|---|------|--------|----------|
| 1 | 安装 pnpm 和项目依赖 | cancelled | high |
| 2 | 安装 i18next 相关依赖 | cancelled | high |
| 3 | 创建 src/i18n/ 配置文件和翻译文件 | ✅ completed | high |
| 4 | 入口文件注入 i18n (main.tsx, settings/main.tsx, HTML lang) | ✅ completed | high |
| 5 | package.json 添加 i18next 依赖声明 | ✅ completed | high |
| 6 | 汉化设置模块 (SettingsApp, GeneralSection, ShortcutsSection, ModelsSection, AgentsSection, AboutSection, ProviderKeyCard) | ✅ completed | high |
| 7 | 汉化核心组件 (App.tsx, WindowControls.tsx) | ✅ completed | high |
| 8 | 汉化 Header/SearchInline/StatusBar/WorkspaceEnvSelector | ✅ completed | high |
| 9 | 汉化 TabBar | ✅ completed | high |
| 10 | 汉化 Explorer 模块 (FileExplorer, FileTreeNode, ExplorerSearch) | ✅ completed | high |
| 11 | 汉化 Editor 模块 (NewEditorDialog) | ✅ completed | high |
| 12 | 汉化 Preview 模块 (PreviewPane, PreviewAddressBar) | ✅ completed | high |
| 13 | 汉化 ShortcutsDialog | ✅ completed | high |
| 14 | 汉化 UpdaterDialog | ✅ completed | high |
| 15 | 汉化 AI 模块组件 (AiChat, AiInputBar, AiMiniWindow, AiStatusBarControls, AiToolApproval, SelectionAskAi, AgentSwitcher, AgentStatusPill, FilePicker, SnippetPicker) | ✅ completed | high |
| 16 | 汉化 PlanDiffReview + TodoStrip | ✅ completed | high |
| 17 | 写入进度文档 docs/i18n-progress.md | ✅ completed | high |
| 18 | 汉化通用 AI 组件 (conversation, reasoning, tool) | ✅ completed | high |
| 19 | 同步 en.json 翻译文件 | ✅ completed | high |
| 20 | 运行 tsc 类型检查验证 | ❌ pending | medium |

**Next Steps**: 安装项目依赖后运行 `pnpm exec tsc --noEmit` 验证类型检查。

## Notes

- Provider 名称 (OpenAI, Anthropic 等) 保持英文
- Model 名称/描述 保持英文
- SYSTEM_PROMPT 保持英文 (直接发送给 AI)
- Rust 后端错误消息保持英文 (不翻译)
- NSIS 安装器保持英文 (不翻译)
