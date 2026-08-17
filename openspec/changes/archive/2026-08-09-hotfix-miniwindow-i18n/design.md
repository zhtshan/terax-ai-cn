# Design: Mini-window input bar i18n 修复

## 修复方案

在 `EmptyState` 组件中，将三个 suggestion 的 `text` 字段从硬编码英文改为调用 `t()` 使用相同翻译 key：

```tsx
// 修改前
text: "Explain the last error in the terminal.",
// 修改后
text: t("ai.miniWindow.explainError"),
```

同理处理另外两个 suggestion：
- `generateCommand` → `t("ai.miniWindow.generateCommand")`
- `summarizeBuffer` → `t("ai.miniWindow.summarizeBuffer")`

## 涉及文件

- `src/modules/ai/components/AiMiniWindow.tsx`（1 处改动）

## 无需 delta spec

此修复不改变任何已有 spec 的验收场景，仅修正翻译遗漏。
