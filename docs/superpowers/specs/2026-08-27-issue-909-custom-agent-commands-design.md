# Issue #909：自定义终端 agent 命令名检测

## 背景

`docs/2026-08-27-upstream-issues.md` 中上游 issue #909：Windows 用户启动 Claude Code 后 Terax 没检测到（issue 体未点名别名），用户在 `docs/2026-08-27-pending-issues-plan.md` 中给出根因：

> 默认检测 `claude` 命令；用户用别名 `cc` 启动时无效。

实际复现面比 plan 描述更广：只要用户在 shell 里给 Claude Code（以及 codex/gemini/pi）配了任何别名（mac 用户实测 `ca`、`cca`），OSC 133 C 里的命令名就不在 detector 默认白名单里，detector 不 arm。Windows 上这是唯一的检测路径（PowerShell 无 preexec，全靠 PSReadLine 包装发 133 C），所以**核心场景是 Windows**；macOS/Linux 通常会被 OSC 777 4-field marker 兜底（真 Claude CLI 内部发的 marker 字符串仍是 `notify;Terax;claude;...`，与 shell 别名无关），但若别名指向的是 wrapper 脚本而非真 CLI，OSC 777 marker 也会失效。

## 目标

让用户能在 Settings 里声明 "命令 X 实际就是 builtin agent Y"，detector 把 X 归一化为 Y，UI 显示 Y 的品牌图标 / 通知。

非目标：
- 不修改 shell 集成 / 不改 PSReadLine 包装层
- 不改 OSC 777 marker 的 untrusted 白名单（仍只接受 4 个 builtin 名，防 spoof）
- 不引入 "用户自定义新 agent" 概念（避免与现有 `useAgentsStore` 的 system-prompt agent 混淆）

## 设计

### 数据模型

**Rust**（`src-tauri/src/modules/pty/agent_detect.rs`）：
```rust
const DEFAULT_AGENTS: &[&str] = &["claude", "codex", "gemini", "pi"];

#[derive(Clone, Default)]
pub struct AliasMap(pub Vec<(String, String)>); // (command, builtin agent)

pub struct AgentDetector {
    builtin: Vec<String>,            // 永远 4 个（防 OSC 777 marker spoof）
    aliases: AliasMap,               // 用户配置
    state: State,
    osc: Vec<u8>,
    armed: bool,
    status: Status,
}

impl AgentDetector {
    pub fn with_agents(builtin: Vec<String>, aliases: AliasMap) -> Self { ... }
    pub fn process<F: FnMut(Transition)>(&mut self, input: &[u8], emit: F) { ... }
    fn match_agent(&self, cmd: &[u8]) -> Option<String> { ... }
}
```

**前端**（`src/modules/ai/lib/agents.ts`）：
```typescript
export type TerminalBuiltin = "claude" | "codex" | "gemini" | "pi";

export type Agent = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  icon: AgentIconId;
  builtIn: boolean;
  // 新增：终端检测绑定
  terminalCommand: string;        // OSC 133 C / OSC 777 marker 里的命令名；默认 = name
  terminalAgent: TerminalBuiltin; // 该命令实际是哪个 builtin agent；默认 = "claude"
};
```

新增 `src/modules/ai/lib/agentAliases.ts`：alias map 的 LazyStore 持久化 + hydration。

### 匹配算法

`match_agent(cmd)` 按顺序扫描每个 whitespace token（跳过 `-` 前缀的 flag）：

```
fn match_agent(&self, cmd: &[u8]) -> Option<String> {
    let s = std::str::from_utf8(cmd).ok()?;
    for token in s.split_whitespace() {
        if token.starts_with('-') { continue; }
        let base = token.rsplit(['/', '\\']).next().unwrap_or(token);

        // 1) builtin 优先：claude / claude-xxx / /path/to/claude
        if let Some(a) = self.builtin.iter().find(|a| {
            base.strip_prefix(a.as_str())
                .is_some_and(|r| r.is_empty() || r.starts_with('-'))
        }) {
            return Some(a.clone());
        }

        // 2) alias 精确匹配 base
        if let Some((_, agent)) = self.aliases.0.iter().find(|(c, _)| c == base) {
            return Some(agent.clone());
        }
    }
    None
}
```

关键约束：
- **builtin 永远赢**：alias `(claude → codex)` 会被 builtin 匹配吞掉；UI 加载时也跳过这种冲突行
- **alias 不扩展 OSC 777 marker 白名单**：detector.builtin 决定哪些 marker agent 名被接受（untrusted 路径）；alias 只走 OSC 133 C 命令名（trusted shell preexec）

### 配置数据流

```
启动时：
  LazyStore("agent_aliases").get()
    → 前端 useAgentAliasesStore.hydrate()
      → useAgentsStore.hydrate()（每个 AI agent 启出一条 alias）
        → invoke("update_agent_aliases", payload)
          → Rust 全局 Arc<RwLock<AliasMap>>::write

PTY 创建时：
  session.rs:185
    AgentDetector::with_agents(DEFAULT_AGENTS.to_vec(), alias_state.read().clone())
```

PTY 创建后 alias 改动不影响已 armed 的实例：detector 是 per-PTY 持有，alias 改动只对新 PTY 生效，已 armed 的 agent 名显示沿用启动时的 alias map。可接受，因为 alias 是会话级配置，跨会话切换时新建 PTY 自然会拿到最新值。

### UI

**`AgentsSection.tsx`** 现有 `AgentCard`（每个 AI agent 一张卡片）加两个字段：

- "终端命令名" 文本输入框（默认 = `name`，placeholder = `name`）
- "终端 agent" 下拉（`claude | codex | gemini | pi`，默认 `"claude"`）

变更保存到 `useAgentsStore`；upsert/remove 时通知 `useAgentAliasesStore` 同步。

**`AgentsSection.tsx`** 末尾新增独立子区 `TerminalAgentAliasesSection`：

- 标题："终端 agent 别名"
- 副标题："把 shell 里给 Claude Code / Codex 等配的别名告诉 Terax，否则终端检测不到。"
- 列表行：`[command 输入框] [agent 下拉] [删除按钮]`
- 顶部 "+ 添加别名" 按钮
- 自动从 AI agents 派生：每个 AI agent 用 `terminalCommand`/`terminalAgent` 显示一行（删除该行不会影响 AI agent 本身，只从 alias map 删）

校验：
- command 必填，trim 后非空
- agent 必须在 4 个 builtin 内
- command 与 builtin 重名时显示 inline warning："该名字是内置 agent，无需添加"
- 保存失败 inline message

### 错误处理 & 边界

| 场景 | 处理 |
|------|------|
| alias 与 builtin 重名 | builtin 永远赢，UI warning，alias 行标灰 |
| alias 命令名带路径 | `rsplit(['/','\\']).next()` 取 base，按 base 比对 |
| alias 命令名带 dash 后缀（如 `claude-ex`） | 不当 alias 匹配（精确匹配）；保留 builtin 路径覆盖 `claude-ex → claude` |
| alias 命令名前导 dash | `if token.starts_with('-') continue` 跳过（已是现有行为） |
| alias 引用不存在 builtin | 下拉限定 4 选 1；老数据迁移 fallback `"claude"` |
| 用户清空所有 alias | Rust 收到空 list，行为退到只匹配 builtin |
| PTY 启动时 alias 未加载 | 用 `Arc<RwLock<AliasMap>>` 默认空；前端 hydrate 完 invoke 更新，不阻塞 PTY |
| alias 大小写 | 保持大小写敏感；用户配 `CC` 按 `CC` 比对 |

## 测试

**Rust**（`agent_detect.rs`）：
- `alias_command_resolves_to_builtin`：alias `(ca, claude)` / `(cca, claude)`，OSC 133 C `ca fix bug` / `cca -p` → `Started("claude")`
- `builtin_wins_over_alias_conflict`：alias `(claude, codex)` + builtin `claude`，OSC 133 C `claude` → `Started("claude")`
- `alias_with_path_resolves_via_base`：alias `(ca, claude)`，OSC 133 C `/opt/homebrew/bin/ca` → `Started("claude")`
- `empty_alias_falls_back_to_builtin_only`：空 alias，OSC 133 C `ca` → 无 transition；`claude` → `Started("claude")`
- `alias_does_not_broaden_marker_whitelist`：alias `(ca, claude)`，OSC 777 `notify;Terax;ca;working` → 无 transition；`notify;Terax;claude;working` → `Started("claude")`
- `alias_preexec_with_extra_args`：alias `(ca, claude)`，OSC 133 C `ca --model opus -p hello` → `Started("claude")`

**前端**（`agents.test.ts` + `agentAliases.test.ts`）：
- 老 store（无 `terminalCommand`/`terminalAgent`）hydrate 后字段填默认值
- alias map 序列化兼容（老 store 文件不破坏）
- alias 行去重：手动 + AI agent 派生不重复
- 校验：command trim 非空、agent 在 4 个 builtin 内
- alias 与 builtin 重名 → UI 标灰 + warning

**手测（macOS / Windows）**：
- macOS terminal `ca "say hi"` → tab 显示 Claude 图标
- Settings > Agents 删除 `ca` alias → 重启 PTY 输入 `ca` → tab 不激活 Claude
- Windows PowerShell `cca --version` → tab 显示 Claude 图标

## 文件改动清单

| 文件 | 改动 |
|------|------|
| `src-tauri/src/modules/pty/agent_detect.rs` | `with_agents(builtin, aliases)` 签名；`match_agent` 加 alias 扫描；6 个新测试 |
| `src-tauri/src/modules/pty/session.rs` | `AgentDetector::new()` → `with_agents(builtin, alias_state.read().clone())` |
| `src-tauri/src/tauri_state.rs` 或新建 | 注册 `Arc<RwLock<AliasMap>>` + `update_agent_aliases` Tauri command |
| `src-tauri/src/modules/pty/mod.rs` | 暴露 `AliasMap` 类型 |
| `src/modules/ai/lib/agents.ts` | `Agent` 加字段；`loadAgents`/`saveCustomAgents` 兼容；`BUILTIN_AGENTS` 填默认值 |
| `src/modules/ai/lib/agentAliases.ts`（新） | alias map LazyStore 持久化 + hydrate |
| `src/modules/ai/store/agentsStore.ts` | hydrate 后同步 alias；upsert/remove 时通知 |
| `src/settings/sections/AgentsSection.tsx` | AgentCard 加 2 字段 UI；末尾新增 `TerminalAgentAliasesSection` 组件 |

预计工作量：~80 行 Rust（含测试）+ ~120 行 TS（含测试）+ ~80 行 UI。

## 关联

- `docs/2026-08-27-pending-issues-plan.md` § 三 #909、§ 七 第二批 #7
- 上游 issue：https://github.com/crynta/terax-ai/issues/909