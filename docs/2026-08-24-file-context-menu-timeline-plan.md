# File 右键菜单添加「查看文件历史」实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在文件树右键菜单中为文件新增「查看文件历史」项，点击后打开文件并展开 Timeline 分区显示 git 提交历史。

**Architecture:** 在 `FileTreeSection` 新增可选 prop `onOpenTimeline`，由 `FileExplorer` 内部实现为「打开 editor tab + 展开 timeline panel」。App 层无需改动。i18n 在 zh.json / en.json 各加一个 key。

**Tech Stack:** React 19, TypeScript, Tauri 2 invoke, react-i18next, @hugeicons/core-free-icons

## Global Constraints

- 前端统一 `@/…` 路径别名，禁止跨模块相对路径
- 无 emoji（代码/注释/commits 都不用）
- TypeScript 严格模式，无 `any`
- 跨平台路径用 `.split(/[\\/]/)` 而非 `.split("/")`
- 所有 git commit message 使用中文
- 每次任务提交前必须通过 `pnpm lint && pnpm check-types`

---

### Task 1: i18n 字符串

**Files:**
- Modify: `src/i18n/locales/zh.json`
- Modify: `src/i18n/locales/en.json`

**Interfaces:**
- Consumes: 无
- Produces: `explorer.viewHistory` 翻译 key

- [ ] **Step 1: 在 zh.json explorer 区块添加 viewHistory 键**

在 `src/i18n/locales/zh.json` 的 explorer 对象中（紧接 `"open": "打开"` 之后）添加：

```json
"viewHistory": "查看文件历史",
```

具体行号参考：找到 `"open": "打开"`（在 explorer 对象内），在其下一行插入。

- [ ] **Step 2: 在 en.json explorer 区块添加 viewHistory 键**

在 `src/i18n/locales/en.json` 的 explorer 对象中（紧接 `"open": "Open"` 之后）添加：

```json
"viewHistory": "View history",
```

- [ ] **Step 3: 运行类型检查确认 json 格式正确**

Run: `pnpm check-types`
Expected: PASS（JSON 文件格式正确，无 TS 错误）

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/zh.json src/i18n/locales/en.json
git commit -m "feat(i18n): 添加查看文件历史菜单项翻译"
```

---

### Task 2: FileTreeSection 新增 onOpenTimeline prop 和菜单项

**Files:**
- Modify: `src/modules/explorer/FileTreeSection.tsx`

**Interfaces:**
- Consumes: `t("explorer.viewHistory")`（Task 1 已添加）
- Produces: `onOpenTimeline?: (path: string) => void` prop

- [ ] **Step 1: 在 Props 类型中添加 onOpenTimeline**

在 `src/modules/explorer/FileTreeSection.tsx` 的 Props 类型（第 69-82 行）中添加：

```tsx
type Props = {
  rootPath: string | null;
  activeFilePath?: string | null;
  onOpenFile: (path: string, pin?: boolean) => void;
  onPathRenamed?: (from: string, to: string) => void;
  onPathDeleted?: (path: string) => void;
  onRevealInTerminal?: (path: string) => void;
  onAttachToAgent?: (path: string) => void;
  onNavigate?: (path: string) => void;
  pathDropTarget?: TerminalPathDropTarget;
  gitStatus?: GitStatusSnapshot | null;
  collapsed: boolean;
  onToggle: () => void;
  onOpenTimeline?: (path: string) => void;  // 新增
};
```

- [ ] **Step 2: 在组件解构中解构 onOpenTimeline**

在组件函数签名（第 209 行附近）的解构参数中添加 `onOpenTimeline`：

```tsx
export const FileTreeSection = memo(
  forwardRef<FileTreeSectionHandle, Props>(function FileTreeSection(
    {
      rootPath,
      activeFilePath,
      onOpenFile,
      // ...existing props...
      onOpenTimeline,  // 新增
    },
    ref,
  ) {
```

- [ ] **Step 3: 在右键菜单中「打开」菜单项下方插入「查看文件历史」**

在 `FileTreeSection.tsx` 第 829-836 行的现有「打开」菜单项（`!menuTarget.isDir` 块内）之后、`{menuTarget.isDir && onRevealInTerminal && (...)}` 之前，插入：

```tsx
                  {!menuTarget.isDir && (
                    <ContextMenuItem
                      className={COMPACT_ITEM}
                      onSelect={() => onOpenTimeline?.(menuTarget.path)}
                    >
                      {t("explorer.viewHistory")}
                    </ContextMenuItem>
                  )}
```

注意：保持与周围代码一致的缩进（18 个空格）。将原来的单个 `{!menuTarget.isDir && (...)}` 块改为包含两个菜单项的块：

```tsx
                  {!menuTarget.isDir && (
                    <>
                      <ContextMenuItem
                        className={COMPACT_ITEM}
                        onSelect={() => onOpenFile(menuTarget.path, true)}
                      >
                        {t("explorer.open")}
                      </ContextMenuItem>
                      <ContextMenuItem
                        className={COMPACT_ITEM}
                        onSelect={() => onOpenTimeline?.(menuTarget.path)}
                      >
                        {t("explorer.viewHistory")}
                      </ContextMenuItem>
                    </>
                  )}
```

- [ ] **Step 4: 运行类型检查确认无错误**

Run: `pnpm check-types`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/explorer/FileTreeSection.tsx
git commit -m "feat(explorer): 文件右键菜单添加查看文件历史菜单项"
```

---

### Task 3: FileExplorer 实现 handleOpenTimeline

**Files:**
- Modify: `src/modules/explorer/FileExplorer.tsx`

**Interfaces:**
- Consumes: `props.onOpenFile`, `timeline.panelRef`, `groupRef`, `toggleSection`
- Produces: `onOpenTimeline` prop 传给 `FileTreeSection`

- [ ] **Step 1: 在 FileExplorer 组件内添加 handleOpenTimeline**

在 `src/modules/explorer/FileExplorer.tsx` 的 `toggleTimeline` useCallback（第 148-151 行）之后添加：

```tsx
    const handleOpenTimeline = useCallback(
      (path: string) => {
        props.onOpenFile(path, true);
        const group = groupRef.current;
        const panel = timeline.panelRef.current;
        if (group && panel && panel.isCollapsed()) {
          toggleSection("timeline", timeline.panelRef, ["file-tree"]);
        }
      },
      [props.onOpenFile, groupRef, timeline.panelRef, toggleSection],
    );
```

- [ ] **Step 2: 将 onOpenTimeline 传给 FileTreeSection**

在 `FileExplorer.tsx` 第 183-188 行的 `<FileTreeSection>` 处，在现有 props 后追加：

```tsx
          <FileTreeSection
            ref={treeRef}
            collapsed={fileTree.collapsed}
            onToggle={toggleFileTree}
            onOpenTimeline={handleOpenTimeline}
            {...props}
          />
```

注意：`onOpenTimeline` 必须在 `{...props}` 之前，防止 props 中有同名属性覆盖。

- [ ] **Step 3: 运行类型检查确认无错误**

Run: `pnpm check-types`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/modules/explorer/FileExplorer.tsx
git commit -m "feat(explorer): FileExplorer 实现 handleOpenTimeline 打开文件并展开时间线"
```

---

### Task 4: 验证与清理

**Files:**
- 无代码修改

- [ ] **Step 1: 运行完整检查清单**

Run: `pnpm lint && pnpm check-types`
Expected: 全部 PASS

- [ ] **Step 2: 手动验证（如可运行）**

启动应用，确认：
1. 右键点击文件，菜单中出现「查看文件历史」
2. 点击后文件以编辑模式打开，左侧 Timeline 分区展开
3. 若文件不在 git repo 内，Timeline 显示「当前文件不在 Git 仓库内」
4. 右键点击目录，不显示此菜单项

- [ ] **Step 3: 如有问题修复后提交**

```bash
git add -p  # 选择性暂存修复
git commit -m "fix(explorer): 修正[具体描述]"
```
