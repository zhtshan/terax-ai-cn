# File 右键菜单添加「查看文件历史」功能设计

## 目标

在文件树（FileTreeSection）的右键菜单中，为**文件**新增「查看文件历史」菜单项。点击后：
- 以编辑模式打开该文件（触发 activeFilePath 更新）
- 展开左侧 Explorer 的 Timeline 分区（若已折叠）
- Timeline 自动加载该文件的 git 提交历史

## 范围

- 仅修改 `FileTreeSection.tsx`、`FileExplorer.tsx`、`App.tsx`
- 不涉及 Rust 后端变更
- 目录右键不显示此项（目录无单一文件历史）

## 技术方案

### 1. FileTreeSection 新增 prop

```ts
// src/modules/explorer/FileTreeSection.tsx
type Props = {
  // ...existing props...
  onOpenTimeline?: (path: string) => void;
};
```

### 2. 右键菜单新增菜单项

在现有「打开」菜单项下方新增：

```tsx
{!menuTarget.isDir && (
  <>
    <ContextMenuItem className={COMPACT_ITEM} onSelect={() => onOpenFile(menuTarget.path, true)}>
      {t("explorer.open")}
    </ContextMenuItem>
    {onOpenTimeline && (
      <ContextMenuItem className={COMPACT_ITEM} onSelect={() => onOpenTimeline(menuTarget.path)}>
        {t("explorer.viewHistory")}
      </ContextMenuItem>
    )}
  </>
)}
```

图标：使用 `Clock01Icon`（与 TimelineSection 一致）。

### 3. FileExplorer 实现 onOpenTimeline

在 `FileExplorer` 中封装逻辑：
1. 调用 `props.onOpenFile(path, true)` 打开文件 editor tab
2. 通过 `timeline.panelRef` 展开 timeline panel（若已折叠）

展开逻辑参考现有 `toggleTimeline` 回调（同组件内已有实现）：

```ts
const handleOpenTimeline = useCallback(
  (path: string) => {
    props.onOpenFile(path, true);
    // 若 timeline 已折叠则展开
    const group = groupRef.current;
    const panel = timeline.panelRef.current;
    if (group && panel && panel.isCollapsed()) {
      toggleSection("timeline", timeline.panelRef, ["file-tree"]);
    }
  },
  [props.onOpenFile, groupRef, timeline.panelRef, toggleSection],
);
```

然后将 `onOpenTimeline={handleOpenTimeline}` 传给 `FileTreeSection`。

### 4. App.tsx 透传

`App.tsx` 调用 `FileExplorer` 时不需要额外改动（prop 在 explorer 内部消费）。

### 5. i18n 字符串

新增：
- `zh.json`: `"viewHistory": "查看文件历史"`
- `en.json`: `"viewHistory": "View history"`

## 数据流

```
用户右键文件 → 点击「查看文件历史」
  → FileTreeSection.onOpenTimeline(path)
  → FileExplorer.handleOpenTimeline(path)
    → onOpenFile(path, true)   // 打开 editor tab → activeFilePath 更新
    → toggleTimeline()         // 展开 timeline panel（如需要）
  → App.explorerActiveFilePath 自动更新（因 activeTab.kind === "editor"）
  → FileExplorer.activeFilePath 更新
  → TimelineSection.activeFilePath 更新 → 重新加载 git log
```

## 边界情况

| 情况 | 处理 |
|------|------|
| 文件不在 git repo 内 | TimelineSection 内部 gitResolveRepo 返回 null，显示「当前文件不在 Git 仓库内」 |
| timeline 面板已展开 | 不重复 toggle，直接打开文件 |
| 文件已在编辑中打开 | onOpenFile 复用已有 tab，activeFilePath 不变，timeline 数据自动刷新 |
| 目录右键 | 不显示此项 |

## 不做的事（YAGNI）

- 不添加键盘快捷键
- 不添加 icon（与现有菜单项风格一致，使用文字 label）
- 不对目录做特殊处理
- 不添加「在当前 tab 查看」等变体
