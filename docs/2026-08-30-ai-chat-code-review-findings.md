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
| CR-03 | `src/modules/ai/lib/proxyFetch.ts:83-95` + `src-tauri/src/modules/net.rs:433-437` | 停止生成不取消上游 HTTP 请求 | 双验 | 已修复 0a0552b（Rust request_id 取消通道）+ 0ffe564（注释标点修正）+ ec382b4（TS abort 接入 ai_http_cancel），2026-08-30 |
| CR-04 | `src/modules/ai/tools/shell.ts:40,77` 等 | bash_run / run_subagent 无中止通道 | 双验 | 已修复 73e9196（Rust 中断命令与 interrupted 标记）+ e853605（测试修正）+ 1ef7a64（bash_run 接入 abortSignal）+ b41a1aa（run_subagent 透传停止信号），2026-08-30 |

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

修复记录（2026-08-30，0a0552b/0ffe564/ec382b4）：`ai_http_stream` 增加 `request_id`，Rust 侧 `AiStreamCancelState` 注册 `watch` 取消令牌（Drop guard 保证摘除），新增 `ai_http_cancel` 命令；`send()` 与 chunk 循环 `tokio::select!` 取消分支，取消即 drop reqwest future 撕断连接。TS 侧 proxyFetch 每请求生成 UUID 并在 abort / ReadableStream cancel 时 fire-and-forget 取消。新增 `proxyFetch.test.ts` 与 net.rs 注册表单测。裁决记录：入口 `signal.aborted` 预检已移除（与 abort 即取消的语义互斥，测试锁定新契约）；预中止窄窗口 cancel 先于注册落空属已知边界（生产 signal 每次 send 新建，窗口不可达），Rust tombstone 列为观察项。

### CR-04 已批准命令与子代理无中止通道

`bash_run` / `bash_background` 的 execute 不接收 abortSignal，Rust 侧 `shell_session_run` 无取消命令（`shellSessionClose` 全仓库无调用者）；`runSubagent.ts:57` 的 `generateText` 同样不接 signal。点 Stop 后 UI 回 idle，但命令继续跑满 timeout（上限 300s）、子代理继续烧完 12 步 token，且子代理 `onStep`（`tools/subagent.ts:41`）持续 patch 全局 `agentMeta`，空闲会话里显示过期步骤。
修法：与 CR-03 同属「停止链路」专项，一并设计取消通道。

修复记录（2026-08-30，73e9196/e853605/1ef7a64/b41a1aa）：`ShellSession` 增加 `active` 注册表（`SharedChild` + interrupted 标志），`run_blocking_inner` spawn 后注册、Drop guard 摘除；新增 `shell_session_interrupt` 命令杀全部活动子进程，`SessionRunOutput.interrupted` 回传。TS 侧 `bash_run` 接 `options.abortSignal` 触发 interrupt（预中止不派生 shell），`run_subagent` 透传 signal 至 `generateText`，abort 返回 `{ type, aborted: true }`。`bash_background` 按 spec 保留不杀。已知边界：interrupt 只杀直接子进程，孙进程持管道致该次 run 延至孙退出（与既有 timeout 路径同类，不扩大）。新增 shell_session_interrupt 集成测试与 shell/subagent/runSubagent 单测。

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
| CR-24 | `composer.tsx:266-284`（生产）+ `AiChat.tsx:88-91` / `sessions.ts:70-72` / `transport.ts:167-172`（三方解析） | 上下文标记（`<file>/<selection>/<snippet>`）是 string 契约却无共享定义：composer 生成，AiChat 芯片提取、deriveTitle 剥离、transport 各留一套正则；transport 的 stripContextBlock 还是无调用方死代码。改标记格式会静默炸标题派生与芯片提取。标记模板与解析正则应收进同一 lib 模块 |
| CR-25 | `sessions.ts:23-35` + `chatStore.ts:305-336` | loadAll 返回的 activeId 从未被 hydrateSessions 使用，持久化的 activeId 是死数据；若刻意启动进新会话，加注释 |
| CR-26 | `AiMiniWindow.tsx:304-335` | estimateTokens 对全历史 JSON.stringify，随每流 chunk 重算；lastInput>0 后纯属浪费 |
| CR-27 | `proxyFetch.ts:34,120` + `net.rs` | IPC 逐字节 number[] 传输约 4 倍膨胀，建议 base64 或二进制 channel |
| CR-28 | `tools/fs.ts:14` + `tools/edit.ts:12` | djb2 重复定义，且共同维护同一 readCache 契约（fs.ts:58/195 与 edit.ts:108 写同一 Map）：只改一份（不同种子/哈希）会让 read_file 的 unchanged 快捷方式静默失效且无类型或测试报错，应收拢到单一实现 |
| CR-29 | `AgentRunBridge.tsx:327-350` | applyEditsLocally 逐行复刻 tools/edit.ts:46-95 的核心编辑循环（拒绝相同串/空串、replace_all split/join、唯一性二次 indexOf、slice 替换），且已实际分叉：edit.ts 返回描述性错误串，bridge 静默跳过不开 diff tab。应从 edit.ts 抽出纯字符串转换函数供 bridge 导入 |
| CR-30 | `composer.tsx:96` | prefillThisSignal 只写不读的死 ref |
| CR-31 | `AiChat.tsx:176-191` | AiChatView 的 stop prop 声明并传入但未使用 |
| CR-32 | `security.ts:250-255` | 属于 checkShellCommand 的文档注释错放在 checkReadableCanonical 头上 |
| CR-33 | `src/modules/ai/CLAUDE.md` | 工具清单过时：写的 `delete/run_command/shell_*`，实际审批工具为 `write_file/edit/multi_edit/create_directory/bash_run/bash_background/spawn_coding_agent/send_to_agent` |
| CR-34 | `tools/fs.ts:98-106` | read_file 单行超 25KB 时该行剩余内容被跳过（代码注释已声明的取舍，记录在案） |
| CR-35 | `sessions.ts:60` / `snippets.ts:26` / `todos.ts:32` / `agents.ts:155` / `planStore.ts:33` / `chatStore.ts:280` | 六处手写 `prefix-Date.now().toString(36)-Math.random().toString(36).slice(2,N)` id 生成器，其中三处 slice(2,6) 仅约 4 字符熵，同一毫秒创建的 todo/snippet/agent 可能撞 id 互相覆盖（LazyStore 按 key 存）。仓库其余处已标准化 `crypto.randomUUID()`（settings/store.ts:443、ModelsSection.tsx:208、bgImageStore.ts:107、themeFiles.ts:69，共 4 处在用），应收拢为单一 helper 并换 randomUUID |
| CR-36 | `AiChat.tsx:485` / `PlanDiffReview.tsx:16` / `security.ts:131` | basename() 三处逐字相同（含 `\\` 分隔符处理），全为私有无共享导出；修一处（如尾分隔符/UNC）不会同步其余两处，导致同一文件在读取分组、plan 行、安全检查中派生出不同名。应收进 lib（建议靠近已做斜杠规范化的 security.ts） |
| CR-37 | `ChipsRow.tsx:98-105` vs `AiChat.tsx:89-97` | selLineCount 是 countLines 的逐字节副本（空值守卫/去尾换行/split 计数），两处分别渲染同类上下文芯片的行数，改任一处会让两种芯片显示不同的行数。属领域逻辑，应收进 src/modules/ai/lib |

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

1.（已覆盖，2026-08-30 第二轮补审，见 八）`src/components/ai-elements/` 其余渲染器（conversation/message/reasoning/markdown/chat-code 等）：未做渲染契约与工具返回字段的核对。CR-02 这类字段对不上的问题在别的渲染器可能还有同类。
2.（已覆盖，见 八）Rust 命令实现边界：仅审 `net.rs` 的 `ai_http_stream`。`fs_read_file` / `shell_session_*` / `shell_bg_*` 等 TS 侧假设的「Rust 第二道防线」未审计。
3.（已覆盖，见 八）语音链路（stt.ts / useWhisperRecording）、picker 组件（FilePicker/SnippetPicker）、agentsStore/snippetsStore、config.ts 模型与定价表全量：浅读或未读。
4.（已解决）CR-29 的分叉已确认：错误处理路径不同（edit.ts 返回错误串，bridge 静默跳过），核心转换逻辑逐行相同。

---

## 七、修复优先级建议

1. 立即修（功能损坏，几行级）：CR-01、CR-02。已全部完成（c2901fe / f7406b9，2026-08-30，全量 793 用例绿）。
2. 停止链路专项：CR-03 + CR-04（同根因，需跨 TS/Rust 设计取消通道）。已全部完成（0a0552b / 0ffe564 / ec382b4 / 73e9196 / e853605 / 1ef7a64 / b41a1aa，2026-08-30，全量验收门绿：lint 零错误、805 vitest + 311 nextest 用例全过）。
3. 数据正确性：CR-05 + CR-06（plan 一组）、CR-07、CR-08、CR-09、CR-10。
4. P2/P3 按顺手顺带清。

---

## 八、第二轮：盲区补审发现（2026-08-30）

来源：第六节三条盲区的专项补审。方法：3 个独立域并行 finder 代理（渲染器契约 / Rust 命令边界 / 语音-picker-store-config）+ 主会话对每条候选发现逐条亲读源码复核，未采信任何未核实项；文中行号均以当前 HEAD 亲读确认。
并发说明：审查进行期间工作区新增 0a0552b / 0ffe564 / ec382b4 三个提交（CR-03 修复链）。CR-57 在发现时点成立、已被 ec382b4 闭环；其余发现均按当前 HEAD 复核有效。
测试基线：本轮为审查轮，未改源码。finder 实跑 `pnpm check-types`（通过）与 `src/modules/ai/config.test.ts`（71 用例全绿）；主会话本轮未跑全量测试。

编号接续 CR-38。

### 8.1 P0/P1

| ID | 位置 | 摘要 | 验证 | 备注 |
|----|------|------|------|------|
| CR-38 | `tool.tsx:151,180` | 工具卡片标题与状态 aria 全部渲染原始 i18n key（`ai.tools.Read` 等） | 双验 | |
| CR-39 | `tools/*.ts` 的 `{error}` 返回 vs `tool.tsx` 渲染 | execute 失败返回的 `{error}` 对象一律按成功渲染（系统性，CR-02 同类） | 双验 | |
| CR-40 | `src-tauri/src/modules/shell/mod.rs:124-138` | 命令超时只杀直接子 shell，孤儿孙进程持管道致 join 永久阻塞，超时契约失效 | 已核实（结构推演，未动态复现） | |
| CR-41 | `src-tauri/src/modules/fs/grep.rs:524` | fs_replace_all 每个被改写文件权限变 0600（丢执行位与 group/other 读） | 双验 | |
| CR-42 | `src-tauri/src/modules/shell/background.rs:64-66` | bash_kill 只杀中间层 shell，孙进程全存活；句柄永不回收，4MB buffer 常驻 | 双验 | |
| CR-57 | `net.rs:396` + `proxyFetch.ts` | `ai_http_stream` 新增必填 request_id 与 TS 接入之间的窗口期，AI 流式请求全挂 | 已核实 | 已闭环 ec382b4 |

### CR-38 工具卡片 i18n key 错位

`TOOL_META`（tool.tsx:36-54）的 label 是展示串（`Read` / `Create dir` / `Glob`…），经 `` t(`ai.tools.${meta.label}`) `` 查找；而 locale（zh/en.json）`ai.tools.*` 键全部为小写驼峰（`read` / `createDir` / `glob`）。i18next 点分路径区分大小写，命中不了即原样返回 → 每张工具卡标题显示 `ai.tools.Read` 原文，中英文环境皆然，自初始提交即如此。`STATUS_LABEL`（66-74）同病：`awaiting approval`（实键 `awaitingApproval`）与 `error`（实键 `toolError`）命中失败，状态点 aria-label 随之错；`responded/preparing/running/done/denied` 五个恰好同名命中。同文件直查调用（`:198` `ai.tools.failed`、`:332` `ai.tools.toolError` 等）用的都是正确驼峰键，反证键名契约。
修法：`TOOL_META.label` 改为 locale 键名，`STATUS_LABEL` 的 `awaiting approval`→`awaitingApproval`、`error`→`toolError`。

### CR-39 `{error}` 输出按成功渲染

shell.ts:42,44,64,79,85、fs.ts:46,51-56,125,141,150,166,198,213,231、search.ts:79,84,110,125,130,144、terminal.ts:22,26,46-49,78-99、subagent.ts:51 在安全拒绝/异常等路径一律 `return { error }`（不 throw），agent.ts:444 把工具原样传给 `streamText`，无任何 `{error}`→throw 包装。execute 正常 resolve 即 `output-available`（推演：`errorText` 仅 throw 时出现），渲染层也完全不识别 `output.error`。后果按卡片分列：

- `bash_background` 失败（checkShellCommand 拒绝 / spawn 抛错）→ 绿色脉冲「运行中」假卡片（tool.tsx:580-596，handle/cmd 皆空），危害最大
- `write_file`/`create_directory` 失败 → 绿勾「已写入/已创建 · path」（562-578），用户以为落盘了
- `grep`/`glob` 失败 → 「无匹配」（467-474 / 512-518），模型与用户都以为真没匹配
- `list_directory` 失败 → 「空」（395-398）；`bash_run` 失败 → 空 stdout、无退出码的一次「成功运行」（601-681 无 error 分支）
- heavy 工具（run_subagent/todo_write）错误体整体不可见，状态点还是 done

修法：渲染侧统一判 `typeof o.error === "string"` 走错误样式；或 agent.ts 包装 execute 把 `{error}` 转 throw（更彻底，模型历史配对不受影响）。处理时注意 CR-58 的 read_file 接线差异。

### CR-40 超时杀不掉进程树，反而永久挂起

超时分支 `child.kill(); child.wait();` 后无条件 `stdout_handle.join()` / `stderr_handle.join()`（mod.rs:124-138），drain 读到 EOF 才返回（334-356）。kill 是对 `/bin/sh -c` 单 pid 的 SIGKILL，孙进程（dev server、`&` 后台任务）继承管道写端，只要存活一个 EOF 永不到来 → `shell_run_command` / `shell_session_run` 无限挂起，远超承诺的 300s 上限。现有 `sleep 10` 超时测试因 sleep 自行退出而掩盖了该路径。`shell/` 全目录无 setpgid/Job Object（`proc/job` 仅 pty/lsp 在用：pty/session.rs:46,145、lsp/session.rs:33,119）。
修法：Unix `pre_exec(setpgid)` + 超时 `kill(-pgid)`；Windows 复用 `ProcessJob`；或 join 前加超时兜底、管道改 `/dev/null` 截断。

### CR-41 fs_replace_all 丢文件权限

`fs_replace_all` 直接 `write_atomic`（grep.rs:524）不恢复权限；对照 `fs_write_file` 捕获 `original_permissions` 并在写后 `set_permissions` 还原（file.rs:140-148）——代码自身即承认 write_atomic 会重置权限。tempfile 未指定权限时默认 0600（finder 已核 tempfile-3.27.0 源码），rename 覆盖后执行位、group/other 读全丢：提交过的脚本直接不可执行。
修法：fs_replace_all 仿 fs_write_file 捕获恢复，或把恢复逻辑下沉进 write_atomic。

### CR-42 bash_background 的 kill 只杀中间层，句柄还永不回收

`shell_bg_kill` 只 `child.kill()`（background.rs:64-66，mod.rs:265-271），与 CR-40 同根（无进程组）。`/bin/sh -c 'pnpm dev'` 被杀后 node 全树存活并继续持有管道，drain 线程持续把输出写进 ring buffer；工具描述向模型承诺的 "Terminate" 实际只杀中间层 shell。且 `BackgroundProc` 无任何出 map 路径（spawn 插入后无 remove），每句柄 4MB buffer（RING_CAP，background.rs:14）常驻到应用退出。
修法：同 CR-40 的进程组方案；exited 后延迟出 map 或压缩 buffer。

### CR-57 request_id 窗口期回归（已闭环）

0a0552b 给 `ai_http_stream` 增加必填 `request_id: String`（net.rs:396），当时 TS 侧未传（tauri IPC 缺必填键直接 reject 调用），窗口期内所有 AI 流式请求失败；Rust 单测绕过 IPC 宏、TS 测试 mock invoke，两侧 CI 都拦不住。ec382b4 落地 proxyFetch.ts:79（`crypto.randomUUID()`）、:142-149（invoke 传 `requestId`）、:80-82（abort 时 `ai_http_cancel`），同时闭环 CR-03 的 TS 侧。当前 HEAD 双侧对齐，仅存档备查。
教训：跨 TS/Rust 的命令签名变更必须同一提交内双侧落地。

### 8.2 P2

| ID | 位置 | 摘要 | 验证 |
|----|------|------|------|
| CR-43 | `tool.tsx:462` vs `search.ts:98-108` | grep 卡片读 `o.pattern`，工具不返回该字段，命中高亮永不生效（highlightMatch 成死代码） | 双验 |
| CR-44 | `tool.tsx:93-105` | deriveSummary 四处读不存在的 input 字段：bash_logs/bash_kill 读 `id`（实为 `handle:number`）、suggest_command 读 `intent/description`（实为 `command`）、run_subagent 读 `agent/task`（实为 `type/prompt/description`，而 description 本就是给卡片展示设计的，subagent.ts:29）→ 摘要恒空 | 双验 |
| CR-45 | `tool.tsx:36-54` + `AiToolApproval.tsx:26-34` | TOOL_META 缺 `spawn_coding_agent/send_to_agent/read_agent_output/get_terminal_output`，审批 META 缺前两个：裸名 + 通用图标，spawn/send 审批预览走 JSON.stringify 整段平铺，locale 也无 `ai.toolApproval` 对应键 | 双验 |
| CR-46 | `markdownImages.ts:40,52-58` + `tauri.conf.json:28-32` | 模型 markdown 图片放行 `data:` 任意 MIME 与 `file://`→asset，而 assetProtocol scope 为 `["**"]`、CSP img-src 含 `asset:`，任意本地路径可被加载为图片（canvas 跨域污染挡住像素读取，存在性探测侧信道仍在） | 双验 |
| CR-47 | `grep.rs:1215-1228` + `workspace.rs:126-132` | 「Rust 第二道防线」确证不存在且是契约测试锁定的有意架构：fs 全命令无 secret 拒绝列表/写保护前缀/二次 canonicalize，secret 防线只在 security.ts；bootstrap_registry 把 $HOME 整体 authorize。webview 被攻破即单条 invoke 读写删全盘。记录为架构事实 + 加固选项（下沉拒绝列表需同步改契约测试；asset scope 收窄到工作区根） | 双验 |
| CR-48 | `background.rs:56` + `ringbuffer.rs:51-67` | 后台日志按字节偏移分页，`from_utf8_lossy` 在多字节字符中间插 U+FFFD，轮询时机不巧即同一字符前后半各被替换一次，中文输出高发永久乱码 | 已核实（推演，未动态复现） |
| CR-49 | `grep.rs:251` vs `search.rs:30` | fs_grep/fs_search_content/fs_glob 无扫描条目上限且取消闭包恒 `&\|\| false`；TS 传 root="/", checkReadableCanonical 放行，全盘扫描不可停。命中内容不外泄（search.ts:95-97 返回前二次过滤） | 双验 |
| CR-50 | `mutate.rs:78-89,91-116` | copy_recursive 跟随目录 symlink，自引用 symlink 无限递归 → 栈溢出崩溃（推演）；sources 接受任意绝对路径（拖放设计声明在注释），可把 ~/.ssh 拷进工作区再读（属 CR-47 边界内的既有风险面） | 已核实（递归逻辑）；溢出为推演 |
| CR-51 | `shell/mod.rs:197-225` + `session.rs:87,105` | 同会话并发 bash_run 不串行化（每 run 新起线程 + 新 shell），cwd 哨兵回写 last-writer-wins；session.rs:105 解析新 cwd 用 session.workspace 而非 87 行已算出的 effective_workspace（WSL/Local hint 不一致时用错，仅 Windows 有实际影响） | 已核实（推演，未并发复现） |
| CR-52 | `stt.ts:21-31` | transcribeOpenAI 无超时无取消（groq 30s / whispercpp 180s 都有），请求挂起时 hook state 恒 transcribing（useWhisperRecording 仅在 promise settle 后回 idle），语音按钮保持禁用（AiStatusBarControls.tsx:145）且无取消通道，只能重载窗口 | 双验（SDK 无内部整体超时为推测） |
| CR-53 | `AiMiniWindow.tsx:337-340` vs `config.ts:858-867` | mini 窗口 compat 模型上下文上限用 legacy 偏好 `openaiCompatibleContextLimit` 而非该 endpoint 自身的 `contextLimit`（agent.ts:414-417 才是正确来源），默认显示 128_000，纯显示层 | 双验 |
| CR-54 | `AiStatusBarControls.tsx:277-307` | ModelDropdown 过滤 useMemo 缺 `apiKeys/lmstudioModelId/mlxModelId/ollamaModelId` 依赖（isModelActive 闭包读它们，:241-252），设置里配好 key 后下拉仍按「未配置」过滤，直到 search/tab/activeProvider 变化才刷新 | 双验 |
| CR-55 | `AiComposerInput.tsx:178-180,229-237` | snippet/command picker 的 activeIndex 不随 query 收窄重置/钳制（重置 effect 依赖不含 trigger.query），越界后 Enter/Tab 静默失效（`if (it)` 吞掉）、高亮消失（SnippetPicker.tsx:63 恒 false），需再按方向键恢复；`@` 文件场景因 fileQuery 在依赖里不受影响 | 双验 |
| CR-56 | `todo.ts:36-41` + `todos.ts:42-51` | todo_write 采纳模型提供的 id 不查重（`t.id ?? newTodoId()`），validateTodos 只查标题非空 + in_progress 唯一，模型给重复 id 时 TodoStrip `key={t.id}`（TodoStrip.tsx:50）重复告警、渲染错乱 | 双验 |

### 8.3 P3

| ID | 位置 | 摘要 |
|----|------|------|
| CR-58 | `tool.tsx:369-388` + `AiChat.tsx:398-407` | read_file 定制分支在现有接线下不可达（tool-read_file 非审批一律走 ReadRow/ReadGroup，Tool 仅 AiChat.tsx:17 一处引用）；且 ReadRow 只认 `output-error` 画红点（:582），read 失败的 `{error}` 输出显示为中性行。修 CR-39 时需一并处理 |
| CR-59 | `AiChat.tsx:624-632` vs `reasoning.tsx:65,84-118` | Reasoning 未接 isStreaming/duration：推理块全程折叠、永不自动展开、无「思考中」Shimmer、耗时统计死特性，locale 键齐备用不上，触发器从头显示「已推理」 |
| CR-60 | `chat-code.tsx:126-177` | HighlightedPre 换码时 effect 不重置 nodes，新代码高亮 resolve 前短暂渲染上一次代码的 token（cancel 守卫只防串写状态，不防旧内容闪现） |
| CR-61 | `ai-elements/snippet.tsx` 等 | snippet.tsx 整模块全仓无引用；message.tsx `MessageBranch*`、conversation.tsx `ConversationDownload/messagesToMarkdown`、context.tsx 四个 Usage 组件、tool.tsx:775-779 兼容 no-op（ToolHeader/ToolContent）均无使用方，可删或注明保留原因 |
| CR-62 | `todos.ts:21-30` vs `snippets.ts:21-24` / `agents.ts:145-153` | todos 读写无显式 `store.save()`（另两处都有，三处同为 autoSave:200），200ms 窗口内退出可能丢刚写入的 todo；退出时 autoSave 是否 flush 未核实 |
| CR-63 | `snippetsStore.ts:33-45` + `agentsStore.ts:74-95` | upsert/remove 基于本地快照全量覆盖写 + 广播回读，无版本/合并，多窗口几乎同时编辑存在丢更新窗口（低频，共享存储 + 广播为既有设计） |
| CR-64 | `stt.ts:52-56,116-121` + `useWhisperRecording.ts:101-103` | STT 错误响应体未过 `redactSensitive`（redact.ts:18 已有）直接进 toast，CR-12 同根的未覆盖路径 |
| CR-65 | `settings/store.ts:436-445` + `config.ts:735` | customEndpoints 恢复无形状校验（favorites/recents/defaultModelId 均有守卫，:456-461/:380-385）；`splitEndpointModels(ep.modelId)` 无 `?? ""` 兜底（716 行有），畸形数据可炸状态栏顶层 useMemo（AiStatusBarControls.tsx:254-257） |
| CR-66 | `composer.tsx:201-205,222-224` | explorer「Attach to Agent」对非 text/失败只 console.warn/error，无用户反馈（CR-16 同型新位置；:206 的 `split("/")` 即 CR-15 本体） |
| CR-67 | `composer.tsx:243-245,336-339` | 选了命令芯片后输入以 `/`/`#` 开头的文本，芯片注入分支被跳过且提交后 `setPickedCommands([])` 无条件清空，选中命令静默丢弃 |
| CR-68 | `stt.ts:168` + `config.ts:1012` | whispercpp 默认 URL 字面量与 `WHISPERCPP_DEFAULT_BASE_URL` 双定义，stt.ts 未引用常量（CR-36/CR-28 同型） |
| CR-69 | `useWhisperRecording.ts:87-107,119-124` | 卸载只 stop + teardown，onstop 仍继续上传并回调；唯一消费点 composer.tsx:157-162 写的是无条件挂载的 provider（no-op），危害有限，记录在案 |
| CR-70 | `useAiBootstrap.ts:92-95` + `chatStore.ts:241-244` | 启动时 default model 经 setSelectedModelId 无条件进 recents（上限 5）；chatStore.ts:479-487 注释表明存在「刻意绕过 recents」的先例，此处是否有意待确认 |
| CR-71 | 杂项（渲染器） | chat-code.tsx 硬编码英文（:81 `Generating code…`、:232-240 `Run/Sent`、:269 `Copy code`，与 b59899c 的 i18n 方向相悖）；message.tsx:355-358 memo 比较器 isAnimating 恒 undefined 死条件；chat-code-lezer.ts:242 已剥 `-2` 后缀致 246-247/278-279 的 `variable-2`/`string-2` case 不可达；tool.tsx:400-404 `kind === "directory"` 永不命中（native.ts:11 实际 union 为 `dir`，symlink 落「文件」组显示，纯外观）；markdown-code.tsx:34 `language-(\w+)` 匹配不到 `c++`/`c#`/`objective-c`，对应 lezer alias（chat-code-lezer.ts:128-138）经 markdown 路径不可达，c++ 块降级为 C 高亮 |
| CR-72 | 杂项（Rust） | grep.rs:393-397 的安全声明（"upstream ... fs_write_file's resolve/secret-path chain"）与同文件 1215-1228 契约注释矛盾，误导应删改；mutate.rs:5-13 fs_create_file `exists()`→`write` 有 TOCTOU 截断窗口且穿透 broken symlink；lib.rs:334-341 退出只杀 lsp 不杀 bg shell（是否有意让 dev server 存活未确认）；**CR-08 表述纠正**：ShellSession 无常驻 shell 进程（每次 run 新起，session.rs:66-119），TS 不 close 泄漏的只是含 cwd 字符串的小结构，原条目「每会话每 workspace 泄漏一个常驻 shell」与实现不符；另 WSL cwd 未注册时 authorize_spawn_cwd 是否误报待 Windows 实测（推测） |

### 第二轮优先级建议

1. 立即修（每次用工具就撞见，几行级）：CR-38、CR-39（连同 CR-58 接线差异一并处理）。
2. 进程树/停止链路专项（与 CR-04 合并设计，同一 setpgid/Job Object 方案）：CR-40、CR-42；CR-41 顺手。
3. 渲染契约清扫：CR-43、CR-44、CR-45、CR-59。
4. 其余 P2 按顺手清：CR-46/47/48/49/50/51/52/53/54/55/56。
5. P3 随手清。
