# Issue #909 自定义终端 agent 命令名检测 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让用户能在 Settings 里声明 "命令 X 实际就是 builtin agent Y"，detector 把 X 归一化为 Y，UI 显示 Y 的品牌图标。

**Architecture:** 前端 `useAgentsStore` 扩展 `terminalCommand`/`terminalAgent` 字段 + 新增 `useAgentAliasesStore`；通过 Tauri command `update_agent_aliases` 写入 Rust 全局 `Arc<RwLock<AliasMap>>`；PTY 创建 detector 时 clone 当前值，`match_agent` 先扫 builtin 后扫 alias 精确匹配。

**Tech Stack:** Rust（agent_detect.rs / session.rs / Tauri state）、TypeScript（agents.ts / agentAliases.ts / AgentsSection.tsx）、`LazyStore`（tauri-plugin-store）、zustand、`vitest`、`pytest`-style nextest。

**Spec:** `docs/superpowers/specs/2026-08-27-issue-909-custom-agent-commands-design.md`

---

## Global Constraints

- 项目根：`/Users/startiasoft/work/terax-ai-cn`，分支 `dev`，提交信息中文。
- 完整检查清单：`pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked`
- 注释默认无；需要时 1-2 行 WHY，不写 WHAT。
- 前端导入统一 `@/…`；路径跨平台用 `.split(/[\\/]/)`；无 `any`。
- 类型严格：`tsconfig.strict` 已开。
- 不改 shell 集成脚本；不改 PSReadLine 包装。
- 不扩展 OSC 777 4-field marker 白名单（untrusted 路径，仍只接受 4 builtin）。

---

## Task 1：Rust `AgentDetector` 接受 AliasMap + `match_agent` 加 alias 扫描（TDD）

**Files:**
- Modify: `src-tauri/src/modules/pty/agent_detect.rs:58-79, 244-259`
- Modify: `src-tauri/src/modules/pty/agent_detect.rs:285-309`（既有测试，改 `AgentDetector::new()` 调用为 `with_agents`）

**Interfaces:**
- Consumes: 无（基线）
- Produces:
  - `pub struct AliasMap(pub Vec<(String, String)>);` 默认 `AliasMap::default()`
  - `pub fn AgentDetector::with_agents(builtin: Vec<String>, aliases: AliasMap) -> Self`
  - `AgentDetector::new()` 删除（保留会与新签名冲突）

- [ ] **Step 1：写 6 个失败测试**

打开 `src-tauri/src/modules/pty/agent_detect.rs`，在既有 `mod tests` 块末尾追加：

```rust
    fn detector() -> AgentDetector {
        AgentDetector::with_agents(
            DEFAULT_AGENTS.iter().map(|s| s.to_string()).collect(),
            AliasMap(vec![
                ("ca".into(), "claude".into()),
                ("cca".into(), "claude".into()),
            ]),
        )
    }

    #[test]
    fn alias_command_resolves_to_builtin() {
        let mut d = detector();
        assert_eq!(run(&mut d, &osc("133;C;ca fix bug")), vec![started("claude")]);
        let mut d2 = detector();
        assert_eq!(run(&mut d2, &osc("133;C;cca -p")), vec![started("claude")]);
    }

    #[test]
    fn builtin_wins_over_alias_conflict() {
        let mut d = AgentDetector::with_agents(
            vec!["claude".into()],
            AliasMap(vec![("claude".into(), "codex".into())]),
        );
        assert_eq!(run(&mut d, &osc("133;C;claude")), vec![started("claude")]);
    }

    #[test]
    fn alias_with_path_resolves_via_base() {
        let mut d = detector();
        assert_eq!(
            run(&mut d, &osc("133;C;/opt/homebrew/bin/ca")),
            vec![started("claude")]
        );
    }

    #[test]
    fn empty_alias_falls_back_to_builtin_only() {
        let mut d = AgentDetector::with_agents(
            DEFAULT_AGENTS.iter().map(|s| s.to_string()).collect(),
            AliasMap::default(),
        );
        assert!(run(&mut d, &osc("133;C;ca")).is_empty());
        let mut d2 = AgentDetector::with_agents(
            DEFAULT_AGENTS.iter().map(|s| s.to_string()).collect(),
            AliasMap::default(),
        );
        assert_eq!(run(&mut d2, &osc("133;C;claude")), vec![started("claude")]);
    }

    #[test]
    fn alias_does_not_broaden_marker_whitelist() {
        let mut d = detector();
        assert!(run(&mut d, &osc("777;notify;Terax;ca;working")).is_empty());
        let mut d2 = detector();
        assert_eq!(
            run(&mut d2, &osc("777;notify;Terax;claude;working")),
            vec![started("claude")]
        );
    }

    #[test]
    fn alias_preexec_with_extra_args() {
        let mut d = detector();
        assert_eq!(
            run(&mut d, &osc("133;C;ca --model opus -p hello")),
            vec![started("claude")]
        );
    }
```

- [ ] **Step 2：跑测试确认失败**

```bash
cd src-tauri && cargo nextest run --locked -p terax-ai agent_detect
```

Expected: 编译失败（`with_agents` 当前签名只有 `Vec<String>`，与新测试 `with_agents(Vec, AliasMap)` 不匹配）。

- [ ] **Step 3：实现 `AliasMap` + 改 `AgentDetector` 签名 + 改 `match_agent`**

修改 `src-tauri/src/modules/pty/agent_detect.rs`：

替换第 58-79 行 `AgentDetector` 定义：

```rust
pub struct AliasMap(pub Vec<(String, String)>);

impl Default for AliasMap {
    fn default() -> Self {
        Self(Vec::new())
    }
}

pub struct AgentDetector {
    builtin: Vec<String>,
    aliases: AliasMap,
    state: State,
    osc: Vec<u8>,
    armed: bool,
    status: Status,
}

impl AgentDetector {
    pub fn with_agents(builtin: Vec<String>, aliases: AliasMap) -> Self {
        Self {
            builtin,
            aliases,
            state: State::Ground,
            osc: Vec::new(),
            armed: false,
            status: Status::Working,
        }
    }
```

替换第 244-259 行 `match_agent`：

```rust
    fn match_agent(&self, cmd: &[u8]) -> Option<String> {
        let cmd = std::str::from_utf8(cmd).ok()?;
        for token in cmd.split_whitespace() {
            if token.starts_with('-') {
                continue;
            }
            let base = token.rsplit(['/', '\\']).next().unwrap_or(token);
            if let Some(agent) = self.builtin.iter().find(|a| {
                base.strip_prefix(a.as_str())
                    .is_some_and(|rest| rest.is_empty() || rest.starts_with('-'))
            }) {
                return Some(agent.clone());
            }
            if let Some((_, agent)) = self.aliases.0.iter().find(|(c, _)| c == base) {
                return Some(agent.clone());
            }
        }
        None
    }
```

- [ ] **Step 4：把既有 `AgentDetector::new()` 调用改为 `with_agents(...)`**

在 `src-tauri/src/modules/pty/agent_detect.rs` 既有 `mod tests` 中，所有 `AgentDetector::new()` 改为：

```rust
AgentDetector::with_agents(DEFAULT_AGENTS.iter().map(|s| s.to_string()).collect(), AliasMap::default())
```

一处一处替换：第 285、291、297、302、308、314、322、330、340 行的 `let mut d = AgentDetector::new();` / `let mut d2 = AgentDetector::new();` / `let mut g = AgentDetector::new();` 全部改成上面的调用。

- [ ] **Step 5：跑测试确认通过**

```bash
cd src-tauri && cargo nextest run --locked -p terax-ai agent_detect
```

Expected: 既有 12 个测试 + 新 6 个测试 = 18 个全部 PASS。

- [ ] **Step 6：clippy 检查**

```bash
cd src-tauri && cargo clippy --all-targets --locked -- -D warnings
```

Expected: 无 warning。

- [ ] **Step 7：commit**

```bash
git add src-tauri/src/modules/pty/agent_detect.rs
git commit -m "feat(pty): AgentDetector 接受 AliasMap，alias 命令名归一化为 builtin"
```

---

## Task 2：Rust 全局 aliasMap state + `update_agent_aliases` Tauri command + session.rs 接线

**Files:**
- Modify: `src-tauri/src/modules/pty/mod.rs`（暴露 `AliasMap`）
- Modify: `src-tauri/src/modules/pty/session.rs:185`
- Create: `src-tauri/src/modules/agent_alias_state.rs`（全局 state 注册 + Tauri command）

**Interfaces:**
- Consumes: `AliasMap`（Task 1）
- Produces:
  - `pub fn install_agent_alias_state<R: tauri::Runtime>(app: &mut tauri::App<R>)`
  - `#[tauri::command] pub fn update_agent_aliases(app: tauri::AppHandle, payload: AliasMapPayload)`
  - `pub type AliasMapPayload = Vec<{ command: String, agent: String }>;`

- [ ] **Step 1：建全局 state 模块**

新建 `src-tauri/src/modules/agent_alias_state.rs`：

```rust
use std::sync::Arc;
use tauri::{App, AppHandle, Manager, Runtime, State};
use tokio::sync::RwLock;

use super::pty::agent_detect::AliasMap;

type AliasState = Arc<RwLock<AliasMap>>;

const STATE_KEY: &str = "agent_alias_map";

#[derive(serde::Deserialize)]
pub struct AliasEntry {
    pub command: String,
    pub agent: String,
}

pub fn install<R: Runtime>(app: &App<R>) {
    let state: AliasState = Arc::new(RwLock::new(AliasMap::default()));
    app.manage(state);
}

#[tauri::command]
pub async fn update_agent_aliases(
    app: AppHandle,
    state: State<'_, AliasState>,
    payload: Vec<AliasEntry>,
) -> Result<(), String> {
    let mut map = state.write().await;
    map.0 = payload
        .into_iter()
        .map(|e| (e.command, e.agent))
        .collect();
    Ok(())
}

pub async fn current(state: &State<'_, AliasState>) -> AliasMap {
    state.read().await.clone()
}

pub fn state_key() -> &'static str {
    STATE_KEY
}
```

- [ ] **Step 2：在 `pty/mod.rs` 暴露 `AliasMap`**

修改 `src-tauri/src/modules/pty/mod.rs`：在 `mod agent_detect;` 之后追加：

```rust
pub use agent_detect::AliasMap;
```

- [ ] **Step 3：在 `session.rs` 启动 detector 时读全局 alias**

修改 `src-tauri/src/modules/pty/session.rs:185`：

替换：
```rust
let mut agent_detect = AgentDetector::new();
```

为：
```rust
// alias map 由前端通过 update_agent_aliases 写入；PTY 创建时 clone 当前值。
// Rust 端无 PtyId → AppHandle 路径时（CLI 单元测试场景），回退空 alias。
let aliases = crate::modules::agent_alias_state::current(&app.state())
    .await
    .unwrap_or_default();
let mut agent_detect = AgentDetector::with_agents(
    DEFAULT_AGENTS.iter().map(|s| s.to_string()).collect(),
    aliases,
);
```

并在文件顶部加 `use crate::modules::pty::agent_detect::{AgentDetector, AliasMap, DEFAULT_AGENTS};`。

注：`app` 已是 `tauri::AppHandle`（session.rs 已有 `app_reader = app.clone();`），state 可从它取。

- [ ] **Step 4：在主入口注册 state + command**

修改 `src-tauri/src/lib.rs`（或 `main.rs`，取决于入口）：找到 `tauri::Builder::default()` 链，在 `.setup(|app| { ... })` 内追加：

```rust
crate::modules::agent_alias_state::install(app);
```

并在 `.invoke_handler(...)` 注册：

```rust
.invoke_handler(tauri::generate_handler![
    // ... 既有 commands ...
    crate::modules::agent_alias_state::update_agent_aliases,
])
```

具体路径以 `grep -n "invoke_handler" src-tauri/src/lib.rs` 确认。

- [ ] **Step 5：cargo check**

```bash
cd src-tauri && cargo check --locked
```

Expected: 编译通过，无 error。

- [ ] **Step 6：clippy**

```bash
cd src-tauri && cargo clippy --all-targets --locked -- -D warnings
```

Expected: 无 warning。

- [ ] **Step 7：跑既有测试**

```bash
cd src-tauri && cargo nextest run --locked
```

Expected: 既有测试全 PASS（PTY 集成测试不会触发 alias 路径，因为 alias map 默认空）。

- [ ] **Step 8：commit**

```bash
git add src-tauri/src/modules/agent_alias_state.rs src-tauri/src/modules/pty/mod.rs src-tauri/src/modules/pty/session.rs src-tauri/src/lib.rs
git commit -m "feat(pty): 全局 alias map state + update_agent_aliases Tauri command"
```

---

## Task 3：前端 `Agent` 类型扩展 + 兼容性测试

**Files:**
- Modify: `src/modules/ai/lib/agents.ts:11-18, 20-...`
- Modify: `src/modules/ai/lib/agents.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `export type TerminalBuiltin = "claude" | "codex" | "gemini" | "pi"`
  - `Agent` 加 `terminalCommand: string` 与 `terminalAgent: TerminalBuiltin`
  - `export const TERMINAL_BUILTINS: readonly TerminalBuiltin[]`

- [ ] **Step 1：写失败测试**

打开 `src/modules/ai/lib/agents.test.ts`，追加：

```typescript
import { BUILTIN_AGENTS, loadAgents, saveCustomAgents, type Agent, type TerminalBuiltin } from "./agents";

describe("Agent terminal wiring", () => {
  it("BUILTIN_AGENTS all carry terminalCommand = name and terminalAgent matching id", () => {
    for (const a of BUILTIN_AGENTS) {
      expect(a.terminalCommand).toBe(a.name);
      expect(a.terminalAgent).toBe(a.id);
    }
  });

  it("loadAgents backfills missing terminal fields with defaults", async () => {
    const legacy: Agent[] = [{
      id: "legacy",
      name: "legacy-agent",
      description: "old",
      instructions: "",
      icon: "coder",
      builtIn: false,
    } as unknown as Agent];
    // @ts-expect-error store key
    await saveCustomAgents({ [KEY_CUSTOM]: legacy });
    const loaded = await loadAgents();
    const found = loaded.custom.find((a) => a.id === "legacy");
    expect(found?.terminalCommand).toBe("legacy-agent");
    expect(found?.terminalAgent).toBe("claude");
  });
});
```

注：`loadAgents` / `saveCustomAgents` 真实签名以 `agents.ts` 为准；从 `grep -n "export" src/modules/ai/lib/agents.ts` 校对。

- [ ] **Step 2：跑测试确认失败**

```bash
pnpm test src/modules/ai/lib/agents.test.ts
```

Expected: 编译失败（`Agent` 没有 `terminalCommand`/`terminalAgent` 字段）。

- [ ] **Step 3：扩展 `Agent` 类型 + 改 `BUILTIN_AGENTS` + 改 `loadAgents`**

修改 `src/modules/ai/lib/agents.ts`：

```typescript
export type TerminalBuiltin = "claude" | "codex" | "gemini" | "pi";

export const TERMINAL_BUILTINS: readonly TerminalBuiltin[] = [
  "claude", "codex", "gemini", "pi",
];

export const TERMINAL_BUILTIN_LABELS: Record<TerminalBuiltin, string> = {
  claude: "Claude Code",
  codex: "Codex CLI",
  gemini: "Gemini CLI",
  pi: "Pi CLI",
};

export type Agent = {
  id: string;
  name: string;
  description: string;
  instructions: string;
  icon: AgentIconId;
  builtIn: boolean;
  terminalCommand: string;
  terminalAgent: TerminalBuiltin;
};
```

在 `BUILTIN_AGENTS` 数组每个内置 agent 上加 `terminalCommand: <id>` 和 `terminalAgent: <id>`（其中 `id` 是 `builtin:coder` / `builtin:architect` 这种，需要映射到 4 个 TerminalBuiltin）。建议：

- `builtin:coder` → `terminalAgent: "claude"`
- `builtin:architect` → `terminalAgent: "claude"`
- `builtin:reviewer` → `terminalAgent: "claude"`
- `builtin:security` → `terminalAgent: "codex"`
- `builtin:designer` → `terminalAgent: "claude"`
- `builtin:spark` → `terminalAgent: "gemini"`

（具体映射按 BUILTIN_AGENTS 实际条目校对）

改 `loadAgents`：在读出 custom 后，对每个 agent 做缺省回填：

```typescript
function withTerminalDefaults(a: Agent): Agent {
  return {
    ...a,
    terminalCommand: a.terminalCommand?.trim() || a.name,
    terminalAgent: TERMINAL_BUILTINS.includes(a.terminalAgent) ? a.terminalAgent : "claude",
  };
}
```

所有返回 custom agent 的地方包一层 `withTerminalDefaults`。

- [ ] **Step 4：跑测试确认通过**

```bash
pnpm test src/modules/ai/lib/agents.test.ts
```

Expected: 既有 + 新 2 个 PASS。

- [ ] **Step 5：lint + typecheck**

```bash
pnpm lint && pnpm check-types
```

Expected: 无 error。

- [ ] **Step 6：commit**

```bash
git add src/modules/ai/lib/agents.ts src/modules/ai/lib/agents.test.ts
git commit -m "feat(ai): Agent 加 terminalCommand/terminalAgent 字段 + 老数据兼容"
```

---

## Task 4：前端 `agentAliases.ts`（alias map store + LazyStore 持久化）

**Files:**
- Create: `src/modules/ai/lib/agentAliases.ts`
- Create: `src/modules/ai/lib/agentAliases.test.ts`

**Interfaces:**
- Consumes: `Agent[]`（来自 `useAgentsStore`）、`TerminalBuiltin`、`TERMINAL_BUILTINS`
- Produces:
  - `export type AliasRow = { command: string; agent: TerminalBuiltin; source: "auto" | "manual"; agentId?: string }`
  - `export async function loadAliases(): Promise<AliasRow[]>`
  - `export async function saveAliases(rows: AliasRow[]): Promise<void>`
  - `export function deriveFromAgents(agents: Agent[]): AliasRow[]`

- [ ] **Step 1：写失败测试**

新建 `src/modules/ai/lib/agentAliases.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import type { Agent } from "./agents";
import { deriveFromAgents } from "./agentAliases";

const mk = (over: Partial<Agent>): Agent => ({
  id: "x", name: "x", description: "", instructions: "", icon: "coder", builtIn: false,
  terminalCommand: "x", terminalAgent: "claude", ...over,
});

describe("deriveFromAgents", () => {
  it("emits one row per agent using terminalCommand + terminalAgent", () => {
    const out = deriveFromAgents([
      mk({ id: "a", name: "alpha", terminalCommand: "ca", terminalAgent: "claude" }),
      mk({ id: "b", name: "beta", terminalCommand: "cca", terminalAgent: "claude" }),
    ]);
    expect(out).toEqual([
      { command: "ca", agent: "claude", source: "auto", agentId: "a" },
      { command: "cca", agent: "claude", source: "auto", agentId: "b" },
    ]);
  });

  it("skips rows whose command is empty or matches a builtin name", () => {
    const out = deriveFromAgents([
      mk({ id: "a", name: "alpha", terminalCommand: "", terminalAgent: "claude" }),
      mk({ id: "b", name: "beta", terminalCommand: "claude", terminalAgent: "claude" }),
    ]);
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 2：跑测试确认失败**

```bash
pnpm test src/modules/ai/lib/agentAliases.test.ts
```

Expected: 编译失败（`./agentAliases` 模块不存在）。

- [ ] **Step 3：实现 `agentAliases.ts`**

新建 `src/modules/ai/lib/agentAliases.ts`：

```typescript
import { LazyStore } from "@tauri-apps/plugin-store";
import type { Agent, TerminalBuiltin } from "./agents";
import { TERMINAL_BUILTINS } from "./agents";

const STORE_PATH = "agent_aliases.json";
const KEY_ALIASES = "rows";

export type AliasRow = {
  command: string;
  agent: TerminalBuiltin;
  source: "auto" | "manual";
  agentId?: string;
};

let store: LazyStore | null = null;
function getStore(): LazyStore {
  if (!store) store = new LazyStore(STORE_PATH);
  return store;
}

export function deriveFromAgents(agents: Agent[]): AliasRow[] {
  const rows: AliasRow[] = [];
  for (const a of agents) {
    const cmd = a.terminalCommand?.trim();
    if (!cmd) continue;
    if (TERMINAL_BUILTINS.includes(cmd as TerminalBuiltin)) continue;
    rows.push({ command: cmd, agent: a.terminalAgent, source: "auto", agentId: a.id });
  }
  return rows;
}

function isValid(row: unknown): row is AliasRow {
  if (!row || typeof row !== "object") return false;
  const r = row as Partial<AliasRow>;
  return (
    typeof r.command === "string" &&
    r.command.trim().length > 0 &&
    typeof r.agent === "string" &&
    (TERMINAL_BUILTINS as readonly string[]).includes(r.agent) &&
    (r.source === "auto" || r.source === "manual")
  );
}

export async function loadAliases(): Promise<AliasRow[]> {
  const raw = await getStore().get<AliasRow[]>(KEY_ALIASES);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValid);
}

export async function saveAliases(rows: AliasRow[]): Promise<void> {
  await getStore().set(KEY_ALIASES, rows.filter(isValid));
  await getStore().save();
}

export async function clearAliases(): Promise<void> {
  await getStore().delete(KEY_ALIASES);
  await getStore().save();
}
```

- [ ] **Step 4：跑测试确认通过**

```bash
pnpm test src/modules/ai/lib/agentAliases.test.ts
```

Expected: 2 个新测试 PASS。

- [ ] **Step 5：lint + typecheck**

```bash
pnpm lint && pnpm check-types
```

Expected: 无 error。

- [ ] **Step 6：commit**

```bash
git add src/modules/ai/lib/agentAliases.ts src/modules/ai/lib/agentAliases.test.ts
git commit -m "feat(ai): alias map LazyStore 持久化 + deriveFromAgents"
```

---

## Task 5：前端 `agentsStore` hydrate 时 invoke `update_agent_aliases`

**Files:**
- Modify: `src/modules/ai/store/agentsStore.ts`
- Modify: `src/modules/ai/lib/agents.ts:hydrate` 后调 `loadAliases` + `deriveFromAgents`

**Interfaces:**
- Consumes: `Agent[]`、`loadAliases`、`saveAliases`、`deriveFromAgents`、`invoke("update_agent_aliases")`
- Produces: hydrate 完成后触发 alias 同步到全局 state

- [ ] **Step 1：写失败测试（async store side-effect）**

打开 `src/modules/ai/store/agentsStore.test.ts`（如无则新建）追加：

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));
vi.mock("@/modules/ai/lib/agentAliases", () => ({
  loadAliases: vi.fn().mockResolvedValue([]),
  saveAliases: vi.fn().mockResolvedValue(undefined),
  deriveFromAgents: vi.fn().mockReturnValue([]),
}));

import { invoke } from "@tauri-apps/api/core";
import { hydrate, useAgentsStore } from "./agentsStore";

describe("agentsStore hydrate syncs alias map", () => {
  beforeEach(() => vi.clearAllMocks());

  it("invokes update_agent_aliases with derived rows", async () => {
    await hydrate();
    expect(invoke).toHaveBeenCalledWith("update_agent_aliases", expect.objectContaining({ payload: expect.anything() }));
  });
});
```

注：hydrate 真实签名以 `agentsStore.ts` 为准（`grep -n "hydrate\|export " src/modules/ai/store/agentsStore.ts`）。若 `hydrate` 是 store action 而不是独立函数，调整测试调用方式。

- [ ] **Step 2：跑测试确认失败**

```bash
pnpm test src/modules/ai/store/agentsStore.test.ts
```

Expected: `update_agent_aliases` invoke 未触发。

- [ ] **Step 3：在 `agentsStore` 加 hydrate 副作用**

修改 `src/modules/ai/store/agentsStore.ts`：找到 `hydrate` action，在末尾追加：

```typescript
import { loadAliases, saveAliases, deriveFromAgents } from "@/modules/ai/lib/agentAliases";
import { invoke } from "@tauri-apps/api/core";

async function syncAliasMap() {
  const manual = await loadAliases();
  const auto = deriveFromAgents(get().customAgents);
  const merged = [...auto, ...manual.filter((m) => !auto.some((a) => a.command === m.command))];
  await saveAliases(merged);
  await invoke("update_agent_aliases", {
    payload: merged.map((r) => ({ command: r.command, agent: r.agent })),
  });
}
```

并在 `hydrate` 末尾 `await syncAliasMap()`；同时 `upsert` / `remove` action 后调 `void syncAliasMap()`（fire-and-forget，不阻塞 UI）。

- [ ] **Step 4：跑测试确认通过**

```bash
pnpm test src/modules/ai/store/agentsStore.test.ts
```

Expected: 新测试 PASS。

- [ ] **Step 5：lint + typecheck**

```bash
pnpm lint && pnpm check-types
```

Expected: 无 error。

- [ ] **Step 6：commit**

```bash
git add src/modules/ai/store/agentsStore.ts src/modules/ai/store/agentsStore.test.ts
git commit -m "feat(ai): agentsStore hydrate/upsert/remove 同步 alias map 到 Rust"
```

---

## Task 6：UI `AgentCard` 加 `terminalCommand` + `terminalAgent` 字段

**Files:**
- Modify: `src/settings/sections/AgentsSection.tsx`（AgentCard 组件）
- Modify: `src/settings/sections/AgentsSection.tsx`（`upsertAgent` 调用点把新字段写入）

**Interfaces:**
- Consumes: `Agent`、`TerminalBuiltin`、`TERMINAL_BUILTINS`、`TERMINAL_BUILTIN_LABELS`（Task 3）
- Produces: AgentCard UI 加两个字段

- [ ] **Step 1：写组件测试**

如项目用 `@testing-library/react`，在 `src/settings/sections/AgentsSection.test.tsx` 加：

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AgentsSection } from "./AgentsSection";

describe("AgentsSection terminal wiring", () => {
  it("renders terminal command and agent fields on AgentCard", () => {
    render(<AgentsSection />);
    expect(screen.getByLabelText(/终端命令名|terminal command/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/终端 agent|terminal agent/i)).toBeInTheDocument();
  });
});
```

若项目无 `@testing-library/react`，跳过该测试，改用手测 checklist（见 Step 5）。

- [ ] **Step 2：跑测试确认失败**

```bash
pnpm test src/settings/sections/AgentsSection.test.tsx
```

Expected: 测试失败（label 不存在）或 skip（无测试库）。

- [ ] **Step 3：改 AgentCard 渲染**

打开 `src/settings/sections/AgentsSection.tsx`，定位 AgentCard（约 233 行）。在 description / instructions 字段附近加：

```tsx
<div className="grid grid-cols-2 gap-3">
  <div>
    <Label htmlFor={`${agent.id}-cmd`}>终端命令名</Label>
    <Input
      id={`${agent.id}-cmd`}
      value={agent.terminalCommand}
      placeholder={agent.name}
      onChange={(e) => onChange({ ...agent, terminalCommand: e.target.value })}
    />
  </div>
  <div>
    <Label htmlFor={`${agent.id}-tgt`}>终端 agent</Label>
    <select
      id={`${agent.id}-tgt`}
      value={agent.terminalAgent}
      onChange={(e) => onChange({ ...agent, terminalAgent: e.target.value as TerminalBuiltin })}
      className="..."
    >
      {TERMINAL_BUILTINS.map((b) => (
        <option key={b} value={b}>{TERMINAL_BUILTIN_LABELS[b]}</option>
      ))}
    </select>
  </div>
</div>
```

确保导入 `TerminalBuiltin`、`TERMINAL_BUILTINS`、`TERMINAL_BUILTIN_LABELS`。

- [ ] **Step 4：跑测试确认通过**

```bash
pnpm test src/settings/sections/AgentsSection.test.tsx
```

Expected: 新测试 PASS（或 skip）。

- [ ] **Step 5：手测**

```bash
pnpm tauri dev
```

在 Settings > Agents 打开任一 AI agent 卡片，确认：
1. 看到"终端命令名"输入框 + "终端 agent"下拉
2. 修改后保存 → 关闭重开 → 字段持久化
3. 下拉只能选 4 个内置

- [ ] **Step 6：lint + typecheck**

```bash
pnpm lint && pnpm check-types
```

Expected: 无 error。

- [ ] **Step 7：commit**

```bash
git add src/settings/sections/AgentsSection.tsx src/settings/sections/AgentsSection.test.tsx
git commit -m "feat(settings): AgentCard 加终端命令名与终端 agent 字段"
```

---

## Task 7：UI 新增 `TerminalAgentAliasesSection`

**Files:**
- Modify: `src/settings/sections/AgentsSection.tsx`（末尾追加新组件）
- Modify: `src/settings/sections/AgentsSection.tsx`（主组件末尾挂载新组件）

**Interfaces:**
- Consumes: `loadAliases`、`saveAliases`、`useAgentsStore`、`deriveFromAgents`
- Produces: 独立 alias 列表 UI

- [ ] **Step 1：写组件测试**

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/modules/ai/lib/agentAliases", () => ({
  loadAliases: vi.fn().mockResolvedValue([]),
  saveAliases: vi.fn().mockResolvedValue(undefined),
  deriveFromAgents: vi.fn().mockReturnValue([
    { command: "ca", agent: "claude", source: "auto", agentId: "a" },
  ]),
}));

import { TerminalAgentAliasesSection } from "./AgentsSection";

describe("TerminalAgentAliasesSection", () => {
  it("renders auto-derived rows and allows adding manual rows", async () => {
    render(<TerminalAgentAliasesSection />);
    expect(screen.getByDisplayValue("ca")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /添加别名|add alias/i }));
    // 断言多了一行空输入框
  });
});
```

若无 testing-library，跳过改手测。

- [ ] **Step 2：跑测试确认失败**

```bash
pnpm test src/settings/sections/AgentsSection.test.tsx
```

Expected: 测试失败（`TerminalAgentAliasesSection` 未导出）。

- [ ] **Step 3：实现新组件**

在 `src/settings/sections/AgentsSection.tsx` 文件末尾添加：

```tsx
export function TerminalAgentAliasesSection() {
  const { t } = useTranslation();
  const customAgents = useAgentsStore((s) => s.customAgents);
  const [rows, setRows] = useState<AliasRow[]>([]);

  useEffect(() => {
    void (async () => {
      const manual = await loadAliases();
      const auto = deriveFromAgents(customAgents);
      setRows([...auto, ...manual.filter((m) => !auto.some((a) => a.command === m.command))]);
    })();
  }, [customAgents]);

  const persist = (next: AliasRow[]) => {
    setRows(next);
    void saveAliases(next.filter((r) => r.source === "manual"));
  };

  const addRow = () => persist([...rows, { command: "", agent: "claude", source: "manual" }]);

  const updateRow = (idx: number, patch: Partial<AliasRow>) => {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    persist(next);
  };

  const removeRow = (idx: number) => persist(rows.filter((_, i) => i !== idx));

  return (
    <div className="mt-8">
      <SectionHeader
        title={t("agents.terminalAliases.title", "终端 agent 别名")}
        description={t("agents.terminalAliases.description", "把 shell 里给 Claude Code / Codex 等配的别名告诉 Terax，否则终端检测不到。")}
      />
      <div className="mt-3 space-y-2">
        {rows.map((row, idx) => (
          <div key={`${row.command}-${idx}`} className="flex items-center gap-2">
            <Input
              value={row.command}
              placeholder="例如 ca"
              onChange={(e) => updateRow(idx, { command: e.target.value })}
              disabled={row.source === "auto"}
            />
            <select
              value={row.agent}
              onChange={(e) => updateRow(idx, { agent: e.target.value as TerminalBuiltin })}
              className="..."
              disabled={row.source === "auto"}
            >
              {TERMINAL_BUILTINS.map((b) => (
                <option key={b} value={b}>{TERMINAL_BUILTIN_LABELS[b]}</option>
              ))}
            </select>
            {row.source === "manual" && (
              <Button variant="ghost" onClick={() => removeRow(idx)}>
                <HugeiconsIcon icon={Delete02Icon} />
              </Button>
            )}
            {row.source === "auto" && (
              <span className="text-xs text-muted-foreground">来自 AI 代理</span>
            )}
          </div>
        ))}
        <Button onClick={addRow} variant="outline">
          <HugeiconsIcon icon={Add01Icon} /> 添加别名
        </Button>
      </div>
    </div>
  );
}
```

并在 `AgentsSection()` 函数末尾 `<CustomInstructionsBlock ... />` 后挂载：

```tsx
<TerminalAgentAliasesSection />
```

顶部加 imports：`useEffect, useState`、`AliasRow`、`loadAliases, saveAliases, deriveFromAgents`。

- [ ] **Step 4：跑测试确认通过**

```bash
pnpm test src/settings/sections/AgentsSection.test.tsx
```

Expected: 新测试 PASS（或 skip）。

- [ ] **Step 5：手测**

```bash
pnpm tauri dev
```

Settings > Agents 滚到末尾，确认：
1. 看到 "终端 agent 别名" 区块
2. 自动从 AI agents 派生行（标 "来自 AI 代理"，不可编辑）
3. "+ 添加别名" 添加手动行
4. 删除手动行不报错
5. 命令名空 → 输入框无报错；保存时 trim

- [ ] **Step 6：lint + typecheck**

```bash
pnpm lint && pnpm check-types
```

Expected: 无 error。

- [ ] **Step 7：commit**

```bash
git add src/settings/sections/AgentsSection.tsx src/settings/sections/AgentsSection.test.tsx
git commit -m "feat(settings): 新增 TerminalAgentAliasesSection UI"
```

---

## Task 8：完整 CI 检查 + E2E 手测

**Files:**
- 无

- [ ] **Step 1：完整检查清单**

```bash
pnpm lint && pnpm check-types && pnpm test && cd src-tauri && cargo clippy --all-targets --locked -- -D warnings && cargo nextest run --locked
```

Expected: 全部通过。

- [ ] **Step 2：E2E 手测（macOS）**

```bash
pnpm tauri dev
```

1. 在终端 tab 输入 `ca "say hi"`（需 shell 已配 `alias ca=claude`） → tab 图标变 Claude brand
2. 输入 `cca -p` → 同样识别
3. 输入 `vim` → 不被识别
4. Settings > Agents 把 `ca`/`cca` 手动行删 → 新 PTY 输入 `ca` 不再被识别
5. 加 `cc → claude` 手动行 → 新 PTY 输入 `cc` 被识别

- [ ] **Step 3：commit 验证（若有 lint-fix 改动）**

如 Step 1 全过则无 commit。

---

## Self-Review

**1. Spec coverage:**
- 数据模型（Rust + TS）→ Task 1、Task 3
- `match_agent` 算法 → Task 1
- 配置数据流（LazyStore + Tauri command）→ Task 2、Task 4、Task 5
- UI（AgentCard + TerminalAgentAliasesSection）→ Task 6、Task 7
- 错误处理与边界 → Task 1 测试 + Task 6/7 UI 校验
- 测试 → Task 1 Rust 测试、Task 3/4/5/6/7 TS 测试、Task 8 E2E

**2. Placeholder scan:** 无 "TBD"、"TODO"、"fill in"。

**3. Type consistency:** `AliasMap`、`AliasRow`、`AliasEntry`、`TerminalBuiltin`、`TERMINAL_BUILTINS`、`TERMINAL_BUILTIN_LABELS` 在各 Task 间一致；`with_agents` 签名在 Task 1/2 一致；`update_agent_aliases` payload 形状在 Task 2 Rust 与 Task 5 前端一致。

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-27-issue-909-custom-agent-commands.md`. Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?