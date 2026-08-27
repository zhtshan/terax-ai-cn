import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import {
  BUILTIN_AGENTS,
  loadAgents,
  newAgentId,
  saveActiveAgentId,
  saveCustomAgents,
  type Agent,
} from "../lib/agents";
import {
  deriveFromAgents,
  loadAliases,
  saveAliases,
} from "../lib/agentAliases";

const CHANGED_EVENT = "terax://ai-agents-changed";

type AgentsState = {
  hydrated: boolean;
  customAgents: Agent[];
  activeId: string;
  /** All agents, builtin first. */
  all: () => Agent[];
  hydrate: () => Promise<void>;
  setActiveId: (id: string) => void;
  upsert: (agent: Agent) => void;
  remove: (id: string) => void;
};

let initialized = false;

function broadcast(): void {
  void emit(CHANGED_EVENT);
}

async function syncAliasMap(): Promise<void> {
  const state = useAgentsStore.getState();
  const manual = await loadAliases();
  const auto = deriveFromAgents(state.customAgents);
  const merged = [
    ...auto,
    ...manual.filter((m) => !auto.some((a) => a.command === m.command)),
  ];
  await saveAliases(merged);
  await invoke("update_agent_aliases", {
    payload: merged.map((r) => ({ command: r.command, agent: r.agent })),
  });
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  hydrated: false,
  customAgents: [],
  activeId: BUILTIN_AGENTS[0].id,
  all: () => [...BUILTIN_AGENTS, ...get().customAgents],
  hydrate: async () => {
    if (initialized) return;
    initialized = true;
    const { custom, activeId } = await loadAgents();
    set({ customAgents: custom, activeId, hydrated: true });

    void listen(CHANGED_EVENT, async () => {
      const fresh = await loadAgents();
      set({ customAgents: fresh.custom, activeId: fresh.activeId });
    });

    void syncAliasMap();
  },
  setActiveId: (id) => {
    set({ activeId: id });
    void saveActiveAgentId(id).then(broadcast);
  },
  upsert: (agent) => {
    if (agent.builtIn) return;
    const list = get().customAgents;
    const idx = list.findIndex((a) => a.id === agent.id);
    const next =
      idx === -1 ? [...list, agent] : list.map((a) => (a.id === agent.id ? agent : a));
    set({ customAgents: next });
    void saveCustomAgents(next).then(broadcast);
    void syncAliasMap();
  },
  remove: (id) => {
    const list = get().customAgents.filter((a) => a.id !== id);
    set({ customAgents: list });
    let active = get().activeId;
    if (active === id) {
      active = BUILTIN_AGENTS[0].id;
      set({ activeId: active });
      void saveActiveAgentId(active);
    }
    void saveCustomAgents(list).then(broadcast);
    void syncAliasMap();
  },
}));

export { newAgentId };
