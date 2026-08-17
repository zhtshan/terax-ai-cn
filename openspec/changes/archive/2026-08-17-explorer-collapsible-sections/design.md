## Context

见 proposal.md - Why。技术约束：

- 项目已安装 `react-resizable-panels@4.12.2`，并在 `src/components/ui/resizable.tsx` 封装为 `ResizablePanelGroup`/`ResizablePanel`/`ResizableHandle`。`App.tsx` 已用它做 sidebar/workspace 的水平（horizontal）三段布局，包括折叠到 0（`initialSidebarCollapsed` + `onResize` 判断 `size.inPixels <= 0` 持久化）。
- 已核实该库原生支持：
  - `Orientation = "horizontal" | "vertical"`，`Group` 可以任意嵌套（vertical group 嵌在 horizontal group 的一个 panel 内是库支持的标准用法）。
  - `Panel` 原生 `collapsible` + `collapsedSize` props，以及 `panelRef` 暴露的 `collapse()` / `expand()` / `isCollapsed()` 命令式 API。
  - `useDefaultLayout({ id, storage })` hook：内置的 layout 保存/恢复能力，`storage` 可直接传 `window.localStorage`，返回 `defaultLayout` 传给 `Group`，`onLayoutChanged` 回传给 `Group` 监听保存。
- `FileExplorer.tsx` 现有文件树滚动容器是 `flex-1 overflow-y-auto`（非固定高度），`useVirtualizer` 通过 `getScrollElement: () => scrollRef.current` 测量真实 DOM 尺寸，不是硬编码高度。

## Goals / Non-Goals

**Goals:**
- 用 `react-resizable-panels` 的原生能力（嵌套 Group、collapsible Panel、useDefaultLayout）实现三区块布局，不手写折叠/拖拽/持久化逻辑。
- 折叠、拖拽、刷新后状态恢复三件事都要在文件树区块内验证虚拟列表不出现空白/错位。

**Non-Goals:**
- 大纲、时间线的真实数据逻辑（后续 change）。
- 侧栏顶层 explorer/search 视图切换机制（`useSidebarPanel`）不变。
- 文件树自身的搜索、拖拽、右键菜单交互不变。

## Decisions

**1. 用嵌套 `Group`（vertical）承载三区块，而非手写 flex + 自定义 drag handle**
复用 `src/components/ui/resizable.tsx` 已封装的组件，在现有 sidebar 水平 `ResizablePanelGroup` 的 "sidebar" panel 内部，新增一个 `direction="vertical"` 的 `ResizablePanelGroup`，包含三个 `ResizablePanel`（文件树/大纲/时间线）。
备选方案（手写 flex-1 + 自定义 resize handle）被否决：重复造轮子，且会失去库自带的 min/max size 约束、键盘可达性（方向键/Home/End 调整大小）。

**2. 折叠用 `Panel` 原生 `collapsible` + `collapsedSize`，不手工维护 0/展开两态**
每个区块的 `ResizablePanel` 设置 `collapsible` 且 `collapsedSize` 等于 section header 的固定高度（例如 `"32px"`，具体数值以现有 header 高度为准）。点击 header 时通过 `panelRef.collapse()` / `panelRef.expand()` 驱动，而不是切换 CSS class 或条件渲染。

**3. 持久化用库自带的 `useDefaultLayout`，不复用 sidebar 现有手写 localStorage pattern**
sidebar 现有的 `persistSidebarWidth`/`persistSidebarCollapsed`（`useSidebarPanel.ts`）是给单一数值设计的；这里是多 panel 的 `Layout`（id → flexGrow 映射），用库自带 `useDefaultLayout({ id: "explorer-sections", storage: window.localStorage })` 更贴合，避免自己拼装序列化逻辑。

**4. 文件树虚拟列表不额外处理 resize 逻辑，先用现状验证**
`useVirtualizer` 已经通过测量 `scrollRef.current` 的真实尺寸工作，理论上区块高度变化会被浏览器 resize/scroll 事件自然捕获。本次不预先添加 `ResizeObserver` 或手动 `virtualizer.measure()` 调用，先实现后在验收场景 5（拖拽后滚动）里手测，如发现空白/错位再补充显式 measure 调用。

**5. 三个区块共用一个 `SectionHeader` 组件**
新建 `src/modules/explorer/SectionHeader.tsx`（标题文案 + chevron 图标 + 折叠点击交互），文件树、大纲、时间线三个区块都用它做 header，避免各自实现一套折叠 UI。

## Risks / Trade-offs

- **[Risk]** `useDefaultLayout` 持久化的 `Layout` 只是 id→flexGrow 的数值映射，折叠状态是通过 flexGrow 等于 `collapsedSize` 对应比例隐式表达的，没有独立的布尔字段。刷新后恢复的数值是否能让 `Panel` 正确识别为"已折叠"（而不是显示一个异常窄的展开态）需要实测验证。
  → **Mitigation**：先按简单方案实现（只存 `Layout`），跑验收场景 4（刷新后恢复状态）手测；如果视觉/行为不对，再加一个显式 `collapsed: boolean` 状态和对应的 localStorage 键做双重持久化。
- **[Risk]** 拖拽分隔线时，`react-resizable-panels` 触发的尺寸变化是否会让 `useVirtualizer` 的滚动容器测量及时刷新，尚未实测。
  → **Mitigation**：拖拽场景手测；如发现文件树列表在调整后出现空白，在 vertical `Panel` 的 `onResize` 回调里显式调用 `virtualizer.measure()`。
- **[Risk]** vertical `Group` 嵌套在 horizontal sidebar `Panel` 内部后，键盘可达性（Tab 焦点顺序、方向键触发 resize）可能与外层水平分隔线的键盘操作冲突。
  → **Mitigation**：实现后走一遍键盘操作路径（Tab 到分隔线、方向键调整）手测确认无冲突。

## Migration Plan

纯前端 UI 重构，无数据迁移，不涉及后端，不需要 feature flag。直接替换 `FileExplorer.tsx` 的顶层渲染结构；如遇问题可通过 git revert 直接回滚整个 change。

## Open Questions

- `useDefaultLayout` 恢复的折叠视觉效果是否需要额外的显式 `collapsed` 字段（见 Risks 第一条）——留到 build 阶段先跑通简单方案，再根据实测结果决定是否要加。这不影响 specs 或任务拆分的整体结构，只影响任务 4（持久化）内部的实现细节。
