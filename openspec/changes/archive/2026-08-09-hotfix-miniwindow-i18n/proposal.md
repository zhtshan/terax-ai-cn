# Proposal: Mini-window input bar 显示英文 bug

## 问题描述

Mini-window 在中文 locale 下，EmptyState 的三个 suggestion 按钮点击后，input bar 中填充的文本仍然是英文原文（如 "Explain the last error in the terminal."），而非对应中文翻译。

## 根因分析

`src/modules/ai/components/AiMiniWindow.tsx` 的 `EmptyState` 组件中，suggestions 数组硬编码了英文文本作为 `text` 字段：

```tsx
{
  label: t("ai.miniWindow.explainError"),
  hint: t("ai.miniWindow.explainError"),
  icon: AlertCircleIcon,
  text: "Explain the last error in the terminal.",  // ← 硬编码英文
},
```

点击后调用 `onPick(s.text)`，将英文原文写入 input bar，绕过 i18n 系统。

## 修复目标

将 `text` 字段改为使用对应的 i18n key，使中文 locale 下 input bar 也显示中文。
