# 打开时间线不打开 editor tab 设计

## 目标

右键菜单「打开时间线」点击后，不打开 editor tab，直接在 TimelineSection 中显示该文件的 git 提交历史。

## 问题

当前实现通过 `onOpenFile(path, true)` 打开 editor tab 来驱动 `activeFilePath` 更新，进而触发 TimelineSection 加载历史。这是绕路——用户只想看 timeline，不需要打开文件。

## 方案

`TimelineSection` 新增可选 prop `timelineFilePath?: string | null`，优先级高于 `activeFilePath`：

```ts
const effectiveFilePath = timelineFilePath ?? activeFilePath ?? null;
```

内部所有使用 `activeFilePath` 的地方改用 `effectiveFilePath`。

## 数据流

```
右键「打开时间线」
  → FileExplorer.handleOpenTimeline(path)
    → setTimelineFilePath(path)
    → 展开 timeline panel（若折叠）
    → 不调 onOpenFile
  → <TimelineSection timelineFilePath={timelineFilePath} ... />
  → effectiveFilePath = path
  → TimelineSection 重新加载该文件 git log
```

App 层的 `activeFilePath` 正常流程不受影响。

## 涉及文件

| 文件 | 变更 |
|------|------|
| `src/modules/explorer/TimelineSection.tsx` | 加 `timelineFilePath` prop；用 `effectiveFilePath` 替换内部 `activeFilePath` 引用 |
| `src/modules/explorer/FileExplorer.tsx` | 加 `timelineFilePath` state；`handleOpenTimeline` 改为设 state + 展开 panel，不调 `onOpenFile`；传 `timelineFilePath` 给 `<TimelineSection>` |

## 边界情况

| 情况 | 处理 |
|------|------|
| `timelineFilePath` 为 null | 回退到 `activeFilePath`（editor tab 驱动路径），行为不变 |
| 点击「打开」菜单项 | 走原有 `onOpenFile` 路径，`timelineFilePath` 不变，`activeFilePath` 更新，TimelineSection 自动切换 |
| 文件不在 git repo 内 | TimelineSection 内部 `gitResolveRepo` 返回 null，显示「当前文件不在 Git 仓库内」 |
