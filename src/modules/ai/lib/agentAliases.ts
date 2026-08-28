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
    rows.push({
      command: cmd,
      agent: a.terminalAgent,
      source: "auto",
      agentId: a.id,
    });
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
