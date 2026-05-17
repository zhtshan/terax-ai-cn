# Terax Windows 版中文汉化设计文档

## 概述

为 Terax v0.6.6 的 Windows 版本添加简体中文 UI 支持。采用 react-i18next 方案，保留英文作为 fallback 语言。仅汉化前端 UI，不翻译 AI 系统提示词、NSIS 安装器、Rust 后端错误消息、Provider/Model 名称。

## 范围

### 汉化

- 前端 React 组件中的用户可见英文字符串（~40 个文件，~400-500 条）
- `index.html` 和 `settings.html` 的 `lang` 属性

### 不汉化

- `src/modules/ai/config.ts` 中的 Provider 名称、Model 名称/描述/提示
- `SYSTEM_PROMPT` / `SYSTEM_PROMPT_LITE`
- NSIS 安装器（`tauri.conf.json` 中 `nsis.languages` 保持 `["English"]`）
- Rust 后端错误消息（`src-tauri/src/` 中的 `Err(...)` 字符串）
- 代码注释、变量名、日志消息

## 技术方案

### 依赖

```
i18next                    # i18n 核心
react-i18next              # React 绑定
i18next-browser-languagedetector  # 语言检测（localStorage）
```

### 文件结构

```
src/i18n/
├── index.ts              # i18next 初始化配置
├── locales/
│   ├── en.json           # 英文原文（从代码提取）
│   └── zh.json           # 中文翻译
```

### i18n 初始化配置 (`src/i18n/index.ts`)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import zh from './locales/zh.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    lng: 'zh-CN',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'terax-language',
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### 入口注入

在 `src/main.tsx` 和 `src/settings/main.tsx` 的顶部添加：
```typescript
import '@/i18n';
```

### 翻译 key 命名规范

按模块组织，用 `.` 分隔，与文件路径对应：

```
common.cancel, common.save, common.delete
settings.title, settings.general.title, settings.general.appearance
ai.chat.placeholder, ai.tool.writeFile
explorer.contextMenu.open
tabs.terminal, tabs.editor
```

### 插值与复数

使用 i18next 内置语法：

```json
// 插值
"{count} file(s)": "{{count}} 个文件"
"Model: {label}": "模型: {{label}}"

// 复数（中文不需要区分，统一用 _other）
"{n} pending change(s)_other": "{{n}} 个待处理更改"
```

### 组件改造模式

```tsx
// 改造前
<span>Cancel</span>

// 改造后
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<span>{t('common.cancel')}</span>
```

对于 `title`、`aria-label`、`placeholder` 等属性同样适用：
```tsx
<Input placeholder={t('settings.models.searchPlaceholder')} />
<Button title={t('common.close')} />
```

## 需要翻译的文件清单

### 设置模块
| 文件 | 估计条目 |
|------|----------|
| `src/settings/SettingsApp.tsx` | 5 |
| `src/settings/sections/GeneralSection.tsx` | 25 |
| `src/settings/sections/ShortcutsSection.tsx` | 15 |
| `src/settings/sections/ModelsSection.tsx` | 35 |
| `src/settings/sections/AgentsSection.tsx` | 40 |
| `src/settings/sections/AboutSection.tsx` | 15 |
| `src/settings/components/ProviderKeyCard.tsx` | 12 |

### 核心组件
| 文件 | 估计条目 |
|------|----------|
| `src/app/App.tsx` | 12 |
| `src/components/WindowControls.tsx` | 3 |

### AI 模块
| 文件 | 估计条目 |
|------|----------|
| `src/modules/ai/components/AiChat.tsx` | 18 |
| `src/modules/ai/components/AiInputBar.tsx` | 12 |
| `src/modules/ai/components/AiMiniWindow.tsx` | 30 |
| `src/modules/ai/components/AiStatusBarControls.tsx` | 30 |
| `src/modules/ai/components/AiToolApproval.tsx` | 15 |
| `src/modules/ai/components/AiTools.tsx` | 2（仅 UI 标签，不含模型名） |
| `src/modules/ai/components/AgentSwitcher.tsx` | 6 |
| `src/modules/ai/components/AgentStatusPill.tsx` | 6 |
| `src/modules/ai/components/FilePicker.tsx` | 6 |
| `src/modules/ai/components/SnippetPicker.tsx` | 5 |
| `src/modules/ai/components/PlanDiffReview.tsx` | 10 |
| `src/modules/ai/components/TodoStrip.tsx` | 1 |
| `src/modules/ai/components/SelectionAskAi.tsx` | 1 |
| `src/modules/ai/lib/slashCommands.ts` | 4 |
| `src/modules/ai/lib/sessions.ts` | 1 |

### 其他模块
| 文件 | 估计条目 |
|------|----------|
| `src/modules/header/Header.tsx` | 6 |
| `src/modules/header/SearchInline.tsx` | 4 |
| `src/modules/statusbar/StatusBar.tsx` | 2 |
| `src/modules/statusbar/WorkspaceEnvSelector.tsx` | 7 |
| `src/modules/tabs/TabBar.tsx` | 8 |
| `src/modules/explorer/FileExplorer.tsx` | 12 |
| `src/modules/explorer/FileTreeNode.tsx` | 14 |
| `src/modules/explorer/ExplorerSearch.tsx` | 10 |
| `src/modules/editor/NewEditorDialog.tsx` | 10 |
| `src/modules/preview/PreviewAddressBar.tsx` | 12 |
| `src/modules/preview/PreviewPane.tsx` | 8 |
| `src/modules/shortcuts/ShortcutsDialog.tsx` | 5 |
| `src/modules/updater/UpdaterDialog.tsx` | 12 |

### 通用 AI 组件
| 文件 | 估计条目 |
|------|----------|
| `src/components/ai-elements/conversation.tsx` | 2 |
| `src/components/ai-elements/reasoning.tsx` | 3 |
| `src/components/ai-elements/tool.tsx` | 30 |

### HTML 文件
| 文件 | 改动 |
|------|------|
| `index.html` | `lang="en"` → `lang="zh-CN"` |
| `settings.html` | `lang="en"` → `lang="zh-CN"` |

## 构建环境

### 必需组件

| 组件 | 版本 | 安装方式 |
|------|------|----------|
| Visual Studio 2026 Build Tools | 最新 | 官网下载，勾选"使用 C++ 的桌面开发" |
| Rust (stable-msvc) | >= 1.85 | `winget install Rustlang.Rustup` → `rustup default stable-msvc` |
| Node.js | >= 18 LTS | node.org 下载 |
| pnpm | >= 9 | `npm i -g pnpm` |
| Tauri CLI | 2.x | `pnpm add -g @tauri-apps/cli` |
| WebView2 | Win10 1803+ 自带 | 无需额外安装 |

### 构建命令

```bash
# 安装依赖
pnpm install

# 开发调试
pnpm tauri dev

# 生产构建（生成 Windows 安装包）
pnpm tauri build
```

### 构建产物

```
src-tauri/target/release/bundle/nsis/
└── Terax_0.6.6_x64-setup.exe    # NSIS 安装包
```

## 实施顺序

1. 安装 i18next 依赖
2. 创建 `src/i18n/` 目录和配置文件
3. 提取所有硬编码字符串，创建 `en.json`
4. 翻译创建 `zh.json`
5. 在入口文件注入 i18n
6. 逐模块改造组件（按批次，每批 5-8 个文件）
7. 修改 HTML 文件
8. 运行 `pnpm exec tsc --noEmit` 类型检查
9. 运行 `pnpm tauri dev` 验证 UI 显示
10. 运行 `pnpm tauri build` 构建 Windows 安装包
