# M-3~M-7 五项 Minor 修复设计

日期：2026-08-30
来源：2026-08-30 终端 tab 存量审查（I-1~I-4 与 M-2 已修，M-1 已拍板，本设计覆盖剩余 M-3~M-7）
分支：dev（延续此前 5 个修复提交 ef21bac..ce72d67 的同一路径）

## 背景

存量审查遗留五项 Minor。修复前逐项重新核实了代码现状（本设计中的行号均为核实当日状态）。

## M-3 subtitleFor 双写

**现状**：`src/modules/tabs/TabSwitcherHud.tsx:8-16` 与 `src/modules/spaces/SpaceSwitcher.tsx:62-73` 各有一份相同逻辑的 `subtitleFor`（terminal 取 cwd 末两段，editor/markdown 取 path 父目录，其余返回 null）。双写导致改动需同步两处，且均无测试覆盖。

**方案**：提取到 `src/modules/tabs/lib/tabLabel.ts`（`labelFor` 所在文件，两个调用方均已从 `@/modules/tabs` 导入该模块），导出 `subtitleFor`；两个组件删除本地实现改为导入。行为逐字节不变。

**测试**：`tabLabel.test.ts` 补 `subtitleFor` 用例：terminal 有/无 cwd、backslash 路径、editor/markdown 路径、preview 等其他 kind 返回 null。

## M-4 blocks tab split 命令面板显示可用但静默拒绝

**现状**：执行端 `useTabs.ts:1094` 对 `t.blocks` 的 tab 直接跳过（静默 no-op）；面板 `commands.ts:78-82` 的 `splitDisabled` 只查「非 terminal tab」与「pane 数超限」，blocks tab（`kind === "terminal"` 且 `blocks: true`）因此显示可用。

**方案**：`splitDisabled` 增加优先级最高的 blocks 分支，新增 i18n key `commandPalette.disabled.blocksTab`，文案定稿：en `"Blocks tab"`、zh `"Blocks 标签页"`（对齐现有 `noTerminalTab: "No terminal tab"` 的短语文风）。`pane.splitRight` 与 `pane.splitDown` 共用该 disabledReason。

**测试**：新增 `src/modules/command-palette/commands.test.ts`：blocks tab 激活时两个 split 项带 `disabledReason`；普通 terminal tab 无；pane 超限时为 paneLimit。

**范围外**：快捷键路径（App.tsx:951-952）对 blocks tab 的静默 no-op 维持现状，不加 toast。

## M-5 planSpaceRemoval as 强转

**现状**：`useTabs.ts:234-236` 先 `filter((t) => t.kind === "terminal")` 再 `(t as TerminalTab).paneTree`，用 `as` 抹掉已收窄的类型。

**方案**：改类型谓词 `removed.filter((t): t is TerminalTab => t.kind === "terminal")` 后直接 `flatMap((t) => leafIds(t.paneTree))`。纯类型层重构，零行为变化。

**测试**：`planSpaceRemoval.test.ts` 已覆盖行为；若其中无「混合 tab 类型只 dispose terminal 叶」用例则补一条，防止谓词写错。

## M-6 private tab agent 通知与图标抑制不一致

**现状**：图标侧 `TabBar.tsx:697`（useTabAgentStatus）对 private tab 返回空状态、`TabBar.tsx:750` 显示 incognito 图标，即设计上不在 private tab 上呈现 agent 活动；但通知侧 `src/modules/agents/components/AgentNotificationsBridge.tsx` 的 `route()` 不看 `private`，attention/finished 照发 OS 通知且 body 携带 tab 标题，在锁屏/录屏场景泄漏 private tab 活动。

**方案（拍板）**：通知侧对齐图标侧，private tab 完全抑制通知。`tabInfo()` 返回值带出 `private` 标记，`route()` 对 private session 直接 return（attention 与 finished 都不发）。agentStore 的 `setStatus` 照旧记录（内部状态不受影响，显示侧本就抑制）。

**备选方向（未采纳）**：保留通知但去掉 body 标题——仍泄漏「有 agent 需要输入」这一活动存在；让图标也显示 agent 状态——与 incognito 设计意图相反。用户如偏好备选方向，改动点集中在 `route()` 一处，可低成本调头。

**范围外**：`maybeTriggerManagedReview` 对 private leaf 的处理（managed agent 监督流程，另一层）。

**测试**：将「该 session 是否应路由通知」的判定提取为可测纯函数，private 返回 false；配单测。

## M-7 boot 前 newTab 不带 cold 标记

**现状**：初始 tab（useTabs.ts:259）与 `newTabInSpace`（:345）创建 `cold: true` 的 tab，而 `newTab`（:432）、`newBlockTab`（:451）、`newAgentTab`（:478）、`newPrivateTab`（:497）不带。`cold` 语义为「渲染占位、不挂载」（TabBase 注释），变热的唯一 choke point 在 `useTabs.ts:311-318` 且被 `booted` 门控（:268 注释明确「no shell spawns before it」）。boot 前经命令面板/快捷键创建的 tab 因无 cold 标记会立即挂载并 spawn PTY，绕过 boot gate。

**方案**：四个创建函数统一补 `cold: true`，与 `newTabInSpace` 一致；变热交给既有 choke point（booted 后激活即热）。不新增任何状态或分支。

**测试**：新增 `useTabs` 测试：`markBooted()` 前 `newTab` 创建的 tab `cold === true`；`markBooted()` 后经激活 effect 变为 `false`。沿用 `useTabs.closeDispose.test.tsx` 的既有测试基建。

## 探索中发现但不属于本设计

- `closeAiDiffTab`/`splitActivePane`/`resetWorkspace` 仍有 updater 内副作用（memory 已注明不在 I-1 清单）。
- boot restore 路径 `replaceTabs(restored, ...)` 会覆盖 boot 前用户已创建的 tab。
- 快捷键触发 blocks split 的无反馈问题。

以上均另行立项，不在本次改动内。

## 验证

- 每项 TDD：先写失败测试再实现。
- 单项验证：`pnpm test src/modules/tabs/lib/` 及对应模块测试。
- 交付前全量（CI 同步）：`pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`。

## 提交策略

五项各自独立提交（中文 commit message，无 em-dash、无 emoji），便于逐项回溯与 review。
