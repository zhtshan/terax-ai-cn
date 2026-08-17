## 修复方案

在 TabBar 的 TabsTrigger 上增加 onClick 事件作为激活兜底：

1. 新增 `shouldActivateRef`（Ref<boolean>），初始值 true
2. `onPointerDown` 时重置为 true
3. `onPointerMove` 检测到拖拽（移动 > 4px）时设为 false
4. `endDrag` 时重置为 true（防止残留）
5. `onClick` 处理器：若 `shouldActivateRef.current` 为 false（拖拽场景）则跳过；否则调用 `onSelect(t.id)` 并 stopPropagation

onPointerUp 仍是主路径，onClick 仅作兜底。两者不会冲突：正常点击时 onPointerUp 先调用 onSelect，onClick 再调用一次（activeId 未变，无副作用）；拖拽场景下 shouldActivateRef 为 false，onClick 不触发。
