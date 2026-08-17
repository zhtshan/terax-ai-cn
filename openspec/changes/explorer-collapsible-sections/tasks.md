## 1. 共享 Header 组件

- [x] 1.1 新建 `src/modules/explorer/SectionHeader.tsx`：标题文案 + chevron 图标 + 点击折叠/展开交互，供三个区块复用
- [x] 1.2 明确 header 固定高度（用于后续 `collapsedSize`），与现有资源管理器 header 视觉风格保持一致

## 2. 三区块垂直布局重构

- [x] 2.1 在 `FileExplorer.tsx` 顶层用嵌套的 `ResizablePanelGroup`（`direction="vertical"`）包裹文件树/大纲/时间线三个 `ResizablePanel`
- [x] 2.2 把现有文件树渲染逻辑（虚拟列表、搜索、拖拽等）迁移进第一个 `ResizablePanel`，不改变其内部交互
- [x] 2.3 新建大纲、时间线两个占位区块组件，接入第二、三个 `ResizablePanel`

## 3. 折叠交互

- [x] 3.1 给三个 `ResizablePanel` 配置 `collapsible` + `collapsedSize`（等于 1.2 中确定的 header 高度）
- [x] 3.2 用 `panelRef` 的 `collapse()`/`expand()`/`isCollapsed()` 驱动 `SectionHeader` 的点击折叠/展开
- [x] 3.3 验证折叠任一区块后，其余展开区块占据释放出的空间（对应 spec 场景：折叠时间线区块）

## 4. 状态持久化

- [x] 4.1 用 `useDefaultLayout({ id: "explorer-sections", storage: window.localStorage })` 接入 vertical `Group` 的 `defaultLayout`/`onLayoutChanged`
- [x] 4.2 手测刷新后高度比例是否恢复（对应 spec 场景：刷新后恢复状态）
- [x] 4.3 手测刷新后折叠状态是否正确恢复；如恢复效果不对（design.md Open Questions 提到的风险），补充显式 `collapsed: boolean` 状态并持久化到独立 localStorage key，与 4.1 的 `Layout` 一起使用

## 5. 大纲/时间线占位内容

- [x] 5.1 大纲区块展开时显示占位文案（说明该功能尚未提供数据）
- [x] 5.2 时间线区块展开时显示占位文案（说明该功能尚未提供数据）

## 6. 文件树虚拟列表验证

- [x] 6.1 手测拖拽分隔线改变文件树区块高度后，虚拟列表滚动/渲染是否正常（对应 spec 场景：调整高度后文件树滚动正常）
- [x] 6.2 若发现空白/错位，在文件树所在 `ResizablePanel` 的 `onResize` 回调中显式调用 `virtualizer.measure()` 修复

## 7. 验收与收尾

- [x] 7.1 逐条走查 `specs/explorer-sections/spec.md` 的全部场景（默认展开、拖拽调整、折叠收缩、刷新恢复、虚拟列表适配、占位内容）
- [x] 7.2 键盘可达性手测：Tab 到分隔线、方向键调整大小，确认与外层 sidebar/workspace 水平分隔线无冲突
- [x] 7.3 跑 `pnpm lint && pnpm check-types && pnpm test`
