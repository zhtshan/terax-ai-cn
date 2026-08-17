## 1. 快捷键定义

- [x] 1.1 在 `src/modules/shortcuts/shortcuts.ts` 的 `ShortcutId` union 中新增 `"editor.goBack"` 和 `"editor.goForward"`，添加对应的 `Shortcut` 条目，默认绑定 macOS `Cmd+←/→`、其他平台 `Ctrl+←/→`

## 2. 导航历史状态

- [x] 2.1 在 `src/app/App.tsx` 中新增 `navigationHistoryRef: useRef<Map<number, { back: NavEntry[]; forward: NavEntry[] }>>`，以 editor tab id 为 key；`NavEntry = { path: string; line: number }`
- [x] 2.2 新增 `pushNavigationHistory(tabId: number, path: string, line: number): void`——压入 back stack 并清空 forward stack
- [x] 2.3 新增 `goBack(tabId: number): void`——弹出 back stack 顶，压入 forward stack，打开文件并 gotoLine
- [x] 2.4 新增 `goForward(tabId: number): void`——弹出 forward stack 顶，压入 back stack，打开文件并 gotoLine
- [x] 2.5 在 tab 关闭回调中清理对应 tabId 的历史栈（复用现有 `onCloseTab` 或等效 hook）

## 3. 集成 openContentHit

- [x] 3.1 修改 `openContentHit`：在调用 `openFileTab` 前，记录当前 active editor tab 的 path + 光标行到 back stack
- [x] 3.2 光标行通过 `editorRefs.current.get(activeId)?.getCursorLine()` 获取（若方法不存在，用备选方案：记录 tab 当前打开的文件路径，行号用 `gotoLine` 参数回推，或直接记录 `line` 参数作为来源行）

## 4. 快捷键 Handler

- [x] 4.1 在 `shortcutHandlers` map 中注册 `"editor.goBack"` 和 `"editor.goForward"` handler，两者均检查 `activeTab?.kind === "editor"`，不满足时 return
- [x] 4.2 handler 调用 `pushNavigationHistory` 的反向操作（goBack/goForward），传递 `activeId`

## 5. 验证

- [x] 5.1 手动验证：在 editor 中 Go-to-definition → 后退 → 前进，回到正确位置
- [x] 5.2 手动验证：terminal file link 点击后后退可回到终端焦点
- [x] 5.3 手动验证：非 editor tab 下 Cmd/Ctrl+箭头无导航行为
- [x] 5.4 运行完整检查清单：`pnpm lint && pnpm check-types && pnpm test`
