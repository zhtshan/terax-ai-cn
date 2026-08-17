## Why

点击终端 tab 切换失效：在侧边文件列表点击任意文件打开后，再点击终端 tab 无法切换，仍继续显示文件 tab；但焦点在文件编辑区时切换正常。根因是 TabBar 的 onMouseDown 调用 preventDefault() 抑制了 Radix Tabs 的 mousedown 激活，使切换完全依赖 onPointerUp；当聚焦态在 explorer（tabIndex=0）时，某些浏览器/渲染路径下 pointerup 派发不可靠。

## What Changes

- TabBar 增加 onClick 兜底激活路径，仅在非拖拽场景下触发
- 新增 shouldActivateRef 标记拖拽/点击状态，防止拖拽结束后误激活
- 不涉及接口变更或架构调整

## Capabilities

### New Capabilities
（无，纯 bug fix）

### Modified Capabilities
（无 spec 变更）

## Impact

- 受影响文件：src/modules/tabs/TabBar.tsx（1 个文件）
- 无 API/依赖变更
