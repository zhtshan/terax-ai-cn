# AI Chat 代码审查发现记录（2026-08-30）

来源：对 `src/modules/ai/` 全模块 + `src/components/ai-elements/` + Rust 侧 `net.rs`（`ai_http_stream`）的专项代码审查。
方法：主会话逐行精读一轮 + 8 角度并行 finder 后台代理一轮（48 候选去重后 22 项进入核实），代理关键发现已由主会话逐条亲读源码复核，未采信任何未核实项。
测试基线：`pnpm vitest run src/modules/ai src/components/ai-elements`，21 文件 / 234 用例全绿（2026-08-30）。
验证标记：`双验` = 双方独立发现或已亲读源码复核；`推演` = 依据已读源码行为推导，未动态复现。

编号规则：CR-XX，修复提交请在备注列回填。

---

## 一、P0：用户可直接感知的功能损坏

| ID | 位置 | 摘要 | 验证 | 备注 |
|----|------|------|------|------|
| CR-01 | `src/modules/ai/store/chatRuntime.ts:138` | 自定义端点模型下「继续」按钮静默失效 | 双验 | 已修复 c2901fe |
| CR-02 | `src/components/ai-elements/tool.tsx:508-514` | glob 工具卡片永远显示「无匹配」 | 双验 | 已修复 f7406b9 |
| CR-03 | `src/modules/ai/lib/proxyFetch.ts:83-95` + `src-tauri/src/modules/net.rs:433-437` | 停止生成不取消上游 HTTP 请求 | 双验 | |
| CR-04 | `src/modules/ai/tools/shell.ts:40,77` 等 | bash_run / run_subagent 无中止通道 | 双验 | |

### CR-01 Continue 按钮对自定义端点完全失效

`sendMessage` 用 `getModel(selectedModelId as ModelId)` 做 key 预检，但 compat- 前缀的自定义端点 id 不在 `MODELS` 表，`config.ts:755-759` 直接 throw。点 Continue 时 `AiChat.tsx:261` 已先把 `hitStepCap` 置 false（按钮消失），随后 `AiChat.tsx:262` 的 `void sendMessage(...)` 变成无人捕获的 rejection：无任何提示，步数上限后的继续功能对自定义端点用户整个不可用。
旁证：`chatStore.ts:460-462` 的 `hasKeyForModel` 专门先分支 compat，唯独此处漏了。
修法：预检前用 `isCompatModelId` 分支，或改用 `resolveModel`。

修复记录（2026-08-30，c2901fe）：预检改用 `resolveModel(selectedModelId, customEndpoints)`。compat 模型的 provider 为 `openai-compatible`（KEYLESS_PROVIDERS 之一），`providerNeedsKey` 天然放行，与 `hasKeyForModel` / `getActiveProviderKey` 的 compat 分支语义一致。新增 `chatRuntime.test.ts` 锁定 compat 模型发送路径。

### CR-02 glob 渲染器字段与工具返回完全不匹配

`tool.tsx:508-514` 读 `o.matches` / `o.paths`，而 `tools/search.ts:138-142` 实际返回 `{ root, hits: [{path, rel}], truncated }`。字段与形状都对不上，`matches.length === 0` 恒真，每次成功的 glob 都渲染成 noMatches。
修法：渲染器改读 `hits` 并取 `path`/`rel`。

修复记录（2026-08-30，f7406b9）：渲染器改读 `hits` 并渲染 `rel`（回退 `path`），`truncated: true` 时显示与 grep 卡片一致的截断徽标，仅 `hits` 为空才显示 noMatches。新增 `tool.test.tsx` 锁定渲染契约。

### CR-03 abort 不取消上游请求

JS 侧 abort 只 reject/error 本地流，但持有 Tauri `Channel` 的闭包仍存活，Rust 侧 `on_event.send()` 持续成功，net.rs 的「channel dropped 即停流」分支永不触发。后果：点 Stop 后服务端继续生成、继续计费，直到响应自然结束。
修法：加显式 cancel 命令，或让 Rust 任务可被取消（如传 token、select on 关闭信号）。

### CR-04 已批准命令与子代理无中止通道

`bash_run` / `bash_background` 的 execute 不接收 abortSignal，Rust 侧 `shell_session_run` 无取消命令（`shellSessionClose` 全仓库无调用者）；`runSubagent.ts:57` 的 `generateText` 同样不接 signal。点 Stop 后 UI 回 idle，但命令继续跑满 timeout（上限 300s）、子代理继续烧完 12 步 token，且子代理 `onStep`（`tools/subagent.ts:41`）持续 patch 全局 `agentMeta`，空闲会话里显示过期步骤。
修法：与 CR-03 同属「停止链路」专项，一并设计取消通道。

---

## 二、P1：数据正确性 / 一致性

| ID | 位置 | 摘要 | 验证 |
|----|------|------|------|
| CR-05 | `src/components/ai-elements/tool.tsx:533-570` | Plan 模式的修改在聊天里显示为「已应用」 | 双验 |
| CR-06 | `src/modules/ai/store/planStore.ts:48-65` | applyAll 陈旧覆盖、部分失败照清队列、TOCTOU | 双验 |
| CR-07 | `src/modules/ai/lib/compact.ts:125-128` | 压缩误删「写后读」的最新读取结果 | 双验 |
| CR-08 | `src/modules/ai/tools/shell.ts:12-24` | shell 会话 rejected promise 永久缓存 + 会话删除不清理 | 双验 |
| CR-09 | `src/modules/ai/store/chatStore.ts:353-371` | switchSession 过期回调劫持 activeSessionId | 双验 |
| CR-10 | `src/modules/ai/components/AgentRunBridge.tsx:80-93` | 后台会话流式输出无人持久化，退出丢整条响应 | 推演 |

### CR-05 Plan 模式卡片误导为已落盘

edit/multi_edit 渲染器判定 `o.ok === true` 即画绿勾，不识别 `edit.ts:98-104` / `fs.ts:186-190` 返回的 `queued_for_plan_review`；write_file 渲染器更是无条件显示 Wrote。叠加 `planStore.ts:43` `disable()` 直接清空队列不写盘：模型和用户都以为改完了，实际什么都没落盘。
修法：渲染器识别 `queued_for_plan_review` 显示「已排队」徽标。

### CR-06 applyAll 三合一问题

1. 用入队时捕获的 `proposedContent` 直接写盘，不重检文件：入队后用户手动改过的文件被陈旧内容静默覆盖（丢失更新）。
2. 部分写入失败也照清队列（`planStore.ts:63`），`PlanDiffReview.tsx:52` 对失败只 console.error，用户以为全部成功。
3. 入队时校验过 `checkWritableCanonical`，applyAll 不复查，存在入队到应用之间的 symlink TOCTOU 窗口。
修法：失败项保留队列 + toast；apply 前重跑安全检查；可选重读文件 diff 一致性。

### CR-07 压缩的 stale 判定少一半顺序逻辑

`isStale = mutated.has(path) || (lastReadIdx... > i)`：第二条件有顺序判断，第一条件没有。模型 edit 后用 read_file 验证的最新结果，触发压缩时也被替换为 ELISION_TEXT，模型失去刚确认的文件状态，可能基于旧认知改错文件。
修法：`mutated` 判定限定为「最后一次变更晚于该读」。

### CR-08 shell 会话缓存的 Promise 失败后永不恢复

`sessionShells` 缓存 Promise：`shellSessionOpen` 失败一次（如 cwd 未就绪），该 session 后续所有 bash_run 永远复用同一个 rejection，无重试路径；`shellSessionRun` 对失效 id 的报错也不会使其失效重建。另外 `native.shellSessionClose`（native.ts:234）无调用者，`deleteSession` 不清理，每会话每 workspace 泄漏一个常驻 shell。
修法：失败时从 map 删除；run 报错含失效 id 时重建；deleteSession 时 close。

### CR-09 会话切换竞态

`loadMessages(id).then(() => flip())` 中 `flip()` 无条件 `set({ activeSessionId: id })`。快速切换未缓存会话 A（慢加载）再点已缓存会话 B，A 的 promise 随后 resolve 会把 activeSessionId 劫持回 A。
修法：flip 前比对当前 activeSessionId 是否仍是切换前的那个。

### CR-10 后台会话流式尾部不持久化

persistMessages 只挂在绑定 activeSessionId 的 Bridge 上。切走后后台 Chat 继续流式输出但无持久化订阅者；cleanup 只 flush 切走瞬间的 300ms debounce 快照。此时退出应用，重开后该会话回滚到切换前快照，整条响应（含审批卡片部件）丢失。
修法：Chat 实例级订阅持久化（与 UI 订阅解耦），或切走时同步 stop + flush。

---

## 三、P2：低危 / UX / 安全加固

| ID | 位置 | 摘要 |
|----|------|------|
| CR-11 | `composer.tsx:326-341` vs `chatRuntime.ts:133-145` | composer 提交直接 `chat.sendMessage`，绕过带 `providerNeedsKey` 预检的 `sendMessage`（目前仅 ContinueRow 在用）；失败时输入框已清空，需重新组织输入 |
| CR-12 | `errors.ts:57-70` vs `redact.ts` | 供应商错误体脱敏只有 Bearer/sk-/xai-/gsk_/AIza，缺 AWS/GitHub/Slack/Stripe/JWT/env-assign；回显密钥可进聊天并持久化到 `terax-ai-sessions.json`。建议两处共享同一模式表 |
| CR-13 | `sessions.ts:64-80` | deriveTitle 不剥 `<snippet>` 与 `<terax-command>` 标记，纯 snippet 或 /init 消息的会话标题是 XML 片段 |
| CR-14 | `AiChat.tsx:354-382` | RenderedMessage 在早退 return 之后才调 useMemo（条件 Hook）。role 实际不变故现在无碍，属脆弱写法 |
| CR-15 | `composer.tsx:206` | 附件名 `path.split("/")` 取 basename，Windows 反斜杠路径整串当名字；应 `split(/[\\/]/)`（仓库规范） |
| CR-16 | `composer.tsx:393` | 文本附件超 200KB 静默 return null，用户不知道附件为何没出现，应 toast |
| CR-17 | `slashCommands.ts:84-100` | `/plan on` 在已激活时变成关闭（除 off/exit 外一律 toggle）；以 `#plan` 开头的普通消息会被劫持为命令 |
| CR-18 | `tool.tsx:574` | bash_background 卡片要求 handle 为 string，实际是 number，句柄号永远不显示 |
| CR-19 | `useAiLiveBridge.ts:86` vs `terminal.ts:36-42` | get_terminal_output schema 承诺最多 2000 行，缓冲固定 getBuffer(300)，超出静默不可得 |
| CR-20 | `AgentRunBridge.tsx:352-373` | diff 预览用非规范化 checkReadable + 直接 readFile，symlink 指向受保护目录时预览可泄露内容（实际执行会被拒，仅预览泄露） |
| CR-21 | `shell.ts:121-133` | bash_kill 无 needsApproval，与模块 CLAUDE.md「shell_* 需审批」契约矛盾。工具描述明示 auto-execute 且幂等，危害有限，按契约级问题处理：要么加审批，要么改文档措辞 |

---

## 四、P3：观察 / 清理项

| ID | 位置 | 内容 |
|----|------|------|
| CR-22 | `tools/edit.ts:45-56,64` | `occurrences` 除法算完即 void 丢弃，随后循环重数，死计算可删 |
| CR-23 | `chatStore.ts:458-462` | hasKeyForModel 对 compat id 恒返回 true 且不查 key，当前仅 barrel 导出，勿当守卫用 |
| CR-24 | `transport.ts:167-172` | stripContextBlock / CONTEXT_BLOCK_RE 无调用方；deriveTitle 另写了一份内联正则，复用或删除 |
| CR-25 | `sessions.ts:23-35` + `chatStore.ts:305-336` | loadAll 返回的 activeId 从未被 hydrateSessions 使用，持久化的 activeId 是死数据；若刻意启动进新会话，加注释 |
| CR-26 | `AiMiniWindow.tsx:304-335` | estimateTokens 对全历史 JSON.stringify，随每流 chunk 重算；lastInput>0 后纯属浪费 |
| CR-27 | `proxyFetch.ts:34,120` + `net.rs` | IPC 逐字节 number[] 传输约 4 倍膨胀，建议 base64 或二进制 channel |
| CR-28 | `tools/fs.ts:14` + `tools/edit.ts:12` | djb2 重复定义，且共同维护同一 readCache 契约，应收拢 |
| CR-29 | `AgentRunBridge.tsx:327-350` | applyEditsLocally 逐行复刻 tools/edit.ts 编辑算法，存在分叉风险（是否已分叉未逐行 diff） |
| CR-30 | `composer.tsx:96` | prefillThisSignal 只写不读的死 ref |
| CR-31 | `AiChat.tsx:176-191` | AiChatView 的 stop prop 声明并传入但未使用 |
| CR-32 | `security.ts:250-255` | 属于 checkShellCommand 的文档注释错放在 checkReadableCanonical 头上 |
| CR-33 | `src/modules/ai/CLAUDE.md` | 工具清单过时：写的 `delete/run_command/shell_*`，实际审批工具为 `write_file/edit/multi_edit/create_directory/bash_run/bash_background/spawn_coding_agent/send_to_agent` |
| CR-34 | `tools/fs.ts:98-106` | read_file 单行超 25KB 时该行剩余内容被跳过（代码注释已声明的取舍，记录在案） |

---

## 五、已验证为可靠的部分（回归参照）

- 审批链路三处一致：composer 提交阻塞（#514）、ContinueRow 守卫、Bridge diff-tab 去重/关闭状态机，与 `lastAssistantMessageIsCompleteWithApprovalResponses` 配合正确。
- `history.ts` 截断 input 规范化 + `agent.ts:400-407` `ignoreIncompleteToolCalls`，覆盖工具调用截断两类故障（3aaff99）。
- `security.ts`：symlink 二次校验（canonicalize + recheck）、NTFS ADS/尾点处理、bidi 字符拦截、写保护前缀；`search.ts` 结果二次过 checkReadable。
- `fs.ts` 读缓存 unchanged 判定、字节切点回退行边界、read-before-edit 不变量、multi_edit 失败整批不落盘。
- `compact.ts` 整体方向（保留 call/result 配对、超阈值才剪枝）正确，仅 CR-07 一处顺序逻辑缺陷。
- `redact.ts` 终端缓冲打码、`net.rs` SSRF 防护（metadata IP 阻断）。

---

## 六、本次审查盲区（下一轮专项建议）

1. `src/components/ai-elements/` 其余渲染器（conversation/message/reasoning/markdown/chat-code 等）：未做渲染契约与工具返回字段的核对。CR-02 这类字段对不上的问题在别的渲染器可能还有同类。
2. Rust 命令实现边界：仅审 `net.rs` 的 `ai_http_stream`。`fs_read_file` / `shell_session_*` / `shell_bg_*` 等 TS 侧假设的「Rust 第二道防线」未审计。
3. 语音链路（stt.ts / useWhisperRecording）、picker 组件（FilePicker/SnippetPicker）、agentsStore/snippetsStore、config.ts 模型与定价表全量：浅读或未读。
4. CR-29 的 applyEditsLocally 与 edit.ts 是否已实际分叉，未逐行 diff。

---

## 七、修复优先级建议

1. 立即修（功能损坏，几行级）：CR-01、CR-02。已全部完成（c2901fe / f7406b9，2026-08-30，全量 793 用例绿）。
2. 停止链路专项：CR-03 + CR-04（同根因，需跨 TS/Rust 设计取消通道）。
3. 数据正确性：CR-05 + CR-06（plan 一组）、CR-07、CR-08、CR-09、CR-10。
4. P2/P3 按顺手顺带清。
