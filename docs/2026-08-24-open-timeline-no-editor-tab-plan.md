# 打开时间线不打开 editor tab 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 右键「打开时间线」不打开 editor tab，直接在 TimelineSection 显示文件 git 历史。

**Architecture:** TimelineSection 新增 `timelineFilePath` prop，优先级高于 `activeFilePath`（`effectiveFilePath = timelineFilePath ?? activeFilePath`），内部所有使用改为 `effectiveFilePath`。FileExplorer 加 `timelineFilePath` state，`handleOpenTimeline` 改为设 state + 展开 panel，不调 `onOpenFile`。

**Tech Stack:** React 19, TypeScript, vitest

## Global Constraints

- 前端统一 `@/…` 路径别名，禁止跨模块相对路径
- 无 emoji（代码/注释/commits 都不用）
- TypeScript 严格模式，无 `any`
- 所有 git commit message 使用中文
- 每次任务提交前必须通过 `pnpm check-types`

---

### Task 1: TimelineSection 使用 effectiveFilePath

**Files:**
- Modify: `src/modules/explorer/TimelineSection.tsx`
- Modify: `src/modules/explorer/TimelineSection.test.tsx`

**Interfaces:**
- Consumes: `timelineFilePath` prop（已在 Props 中声明）
- Produces: `effectiveFilePath` 在所有内部逻辑中使用

- [ ] **Step 1: 在 test 中添加 timelineFilePath 优先于 activeFilePath 的测试用例**

在 `src/modules/explorer/TimelineSection.test.tsx` 末尾的 describe 块中追加：

```tsx
  it("uses timelineFilePath over activeFilePath when both are provided", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
      repoRoot: "/r",
      branch: "main",
      upstream: null,
      isDetached: false,
    });
    (native.gitLogFile as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeEntry({ subject: "timeline-path commit" }),
    ]);

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath="/r/other.txt"
        timelineFilePath="/r/foo.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("timeline-path commit")).toBeTruthy();
    });
    // 确认调用的是 timelineFilePath 而非 activeFilePath
    expect(native.gitLogFile).toHaveBeenCalledWith(
      "/r",
      "/r/foo.txt",
      expect.any(Object),
    );
  });

  it("uses timelineFilePath to show commits when activeFilePath is null", async () => {
    (native.gitResolveRepo as ReturnType<typeof vi.fn>).mockResolvedValue({
      repoRoot: "/r",
      branch: "main",
      upstream: null,
      isDetached: false,
    });
    (native.gitLogFile as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeEntry({ subject: "solo timeline" }),
    ]);

    render(
      <TimelineSection
        collapsed={false}
        onToggle={() => {}}
        activeFilePath={null}
        timelineFilePath="/r/bar.txt"
        repoRoot={null}
        onOpenCommitFile={() => {}}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("solo timeline")).toBeTruthy();
    });
  });
```

- [ ] **Step 2: 运行测试确认新测试失败**

Run: `pnpm test src/modules/explorer/TimelineSection.test.tsx`
Expected: 2 new tests FAIL（因为内部还在用 `activeFilePath`）

- [ ] **Step 3: 将 TimelineSection 内部所有 `activeFilePath` 引用替换为 `effectiveFilePath`**

在 `src/modules/explorer/TimelineSection.tsx` 中，将所有以下位置的 `activeFilePath` 替换为 `effectiveFilePath`：

1. 第 58 行：`if (!activeFilePath)` → `if (!effectiveFilePath)`
2. 第 78-79 行：`activeFilePath.substring(...)` → `effectiveFilePath.substring(...)`，`activeFilePath` → `effectiveFilePath`
3. 第 96 行：`native.gitLogFile(root, activeFilePath, ...)` → `native.gitLogFile(root, effectiveFilePath, ...)`
4. 第 114 行：`[activeFilePath, providedRepoRoot]` → `[effectiveFilePath, providedRepoRoot]`
5. 第 117 行：`!activeFilePath` → `!effectiveFilePath`
6. 第 127 行：`activeFilePath` → `effectiveFilePath`
7. 第 147 行：`[resolvedRepoRoot, activeFilePath, ...]` → `[resolvedRepoRoot, effectiveFilePath, ...]`
8. 第 151 行：`if (!activeFilePath)` → `if (!effectiveFilePath)`
9. 第 200 行：`path: activeFilePath` → `path: effectiveFilePath`
10. 第 236 行：`activeFilePath,`（在 useMemo deps 数组中）→ `effectiveFilePath,`

- [ ] **Step 4: 运行测试确认全部通过**

Run: `pnpm test src/modules/explorer/TimelineSection.test.tsx`
Expected: 全部 PASS（包括新增的 2 个测试）

- [ ] **Step 5: 运行类型检查**

Run: `pnpm check-types`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/explorer/TimelineSection.tsx src/modules/explorer/TimelineSection.test.tsx
git commit -m "feat(explorer): TimelineSection 支持 timelineFilePath prop 优先于 activeFilePath"
```

---

### Task 2: FileExplorer 直接驱动 timelineFilePath

**Files:**
- Modify: `src/modules/explorer/FileExplorer.tsx`

**Interfaces:**
- Consumes: `TimelineSection.timelineFilePath` prop（Task 1 已定义）
- Produces: 无对外变更

- [ ] **Step 1: 添加 timelineFilePath state 和 setter**

在 `src/modules/explorer/FileExplorer.tsx` 组件函数体内（第 112 行 `const groupRef = useGroupRef();` 之后）添加：

```tsx
    const [timelineFilePath, setTimelineFilePath] = useState<string | null>(null);
```

- [ ] **Step 2: 修改 handleOpenTimeline 不再调用 onOpenFile**

将现有的 `handleOpenTimeline`（第 152-162 行）替换为：

```tsx
    const handleOpenTimeline = useCallback(
      (path: string) => {
        setTimelineFilePath(path);
        const group = groupRef.current;
        const panel = timeline.panelRef.current;
        if (group && panel && panel.isCollapsed()) {
          toggleSection("timeline", timeline.panelRef, ["file-tree"]);
        }
      },
      [groupRef, timeline.panelRef, toggleSection],
    );
```

- [ ] **Step 3: 将 timelineFilePath 传给 TimelineSection**

在第 236-242 行的 `<TimelineSection>` 处，添加 `timelineFilePath` prop：

```tsx
          <TimelineSection
            collapsed={timeline.collapsed}
            onToggle={toggleTimeline}
            activeFilePath={props.activeFilePath}
            timelineFilePath={timelineFilePath}
            repoRoot={props.gitStatus?.repoRoot ?? null}
            onOpenCommitFile={props.onOpenCommitFile ?? (() => {})}
          />
```

- [ ] **Step 4: 运行类型检查**

Run: `pnpm check-types`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/explorer/FileExplorer.tsx
git commit -m "feat(explorer): handleOpenTimeline 直接设 timelineFilePath 不打开 editor tab"
```

---

### Task 3: 验证

**Files:** 无代码修改

- [ ] **Step 1: 运行完整检查清单**

Run: `pnpm lint && pnpm check-types`
Expected: 全部 PASS

- [ ] **Step 2: 运行 TimelineSection 测试**

Run: `pnpm test src/modules/explorer/TimelineSection.test.tsx`
Expected: 全部 PASS

- [ ] **Step 3: 手动验证（如可运行）**

启动应用，确认：
1. 右键点击文件 → 点击「打开时间线」
2. Timeline 面板展开，显示该文件的 git 历史
3. 该文件不会被打开为 editor tab
4. 原有的「打开」菜单项行为不变（仍打开 editor tab）
