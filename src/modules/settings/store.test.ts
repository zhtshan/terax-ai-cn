import type { CustomEndpoint } from "@/modules/ai/config";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { detectWebglRenderer } from "./store";

// 跨窗口 prefs 同步契约（store.ts writePref/onPreferencesChange +
// preferences.ts init）：settings 窗口写 → Tauri 事件 → 主窗口 store。
// 该链路曾在排查 #1107 遗留问题时被怀疑断裂，此处固化其分发行为。
type ChangeCb = (key: string, value: unknown) => void;
type EventCb = (e: { payload: { key: string; value: unknown } }) => void;

const changeCbs = new Set<ChangeCb>();
let eventCb: EventCb | null = null;
const emitCalls: Array<{ event: string; payload: unknown }> = [];
const written = new Map<string, unknown>();

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    set = async (k: string, v: unknown) => {
      written.set(k, v);
    };
    save = async () => {};
    entries = async () => [...written.entries()];
    onChange = async (cb: ChangeCb) => {
      changeCbs.add(cb);
      return () => {
        changeCbs.delete(cb);
      };
    };
  },
}));

vi.mock("@tauri-apps/api/event", () => ({
  emit: async (event: string, payload?: unknown) => {
    emitCalls.push({ event, payload });
  },
  listen: async (_event: string, cb: EventCb) => {
    eventCb = cb;
    return () => {
      eventCb = null;
    };
  },
}));

const EP: CustomEndpoint = {
  id: "ep-1",
  name: "relay",
  baseURL: "https://relay.example.com/v1",
  modelId: "gpt-x",
  contextLimit: 128_000,
};

beforeEach(() => {
  vi.resetModules();
  written.clear();
  changeCbs.clear();
  eventCb = null;
  emitCalls.length = 0;
});

describe("detectWebglRenderer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when webgl2 context cannot be created", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(detectWebglRenderer()).toBe(false);
  });

  it("returns true when webgl2 context is available", () => {
    const fakeCtx = { getExtension: vi.fn(() => null) };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      fakeCtx as unknown as WebGL2RenderingContext,
    );
    expect(detectWebglRenderer()).toBe(true);
  });

  it("returns false when getContext throws", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () => {
        throw new Error("denied");
      },
    );
    expect(detectWebglRenderer()).toBe(false);
  });
});

describe("writePref 广播", () => {
  it("写入后以原始 key 广播 prefs-changed 事件", async () => {
    const { setCustomEndpoints } = await import("./store");
    await setCustomEndpoints([EP]);
    expect(emitCalls).toEqual([
      {
        event: "terax://prefs-changed",
        payload: { key: "customEndpoints", value: [EP] },
      },
    ]);
  });
});

describe("onPreferencesChange 分发", () => {
  it("tauri 事件与 store change 两通道均映射为 PrefKey 回调", async () => {
    const { onPreferencesChange } = await import("./store");
    const seen: Array<[string, unknown]> = [];
    await onPreferencesChange((key, value) => seen.push([key, value]));

    eventCb?.({ payload: { key: "customEndpoints", value: [EP] } });
    for (const cb of changeCbs) cb("customEndpoints", []);

    expect(seen).toEqual([
      ["customEndpoints", [EP]],
      ["customEndpoints", []],
    ]);
  });

  it("未映射的原始 key 不触发回调", async () => {
    const { onPreferencesChange } = await import("./store");
    const seen: Array<[string, unknown]> = [];
    await onPreferencesChange((key, value) => seen.push([key, value]));

    eventCb?.({ payload: { key: "not-a-pref", value: 1 } });
    for (const cb of changeCbs) cb("not-a-pref", 1);

    expect(seen).toEqual([]);
  });
});

describe("usePreferencesStore 跨窗口应用", () => {
  it("init 后收到的 customEndpoints 事件实时更新 store", async () => {
    written.set("customEndpoints", [EP]);
    const { usePreferencesStore } = await import("./preferences");
    await usePreferencesStore.getState().init();
    expect(usePreferencesStore.getState().hydrated).toBe(true);
    expect(usePreferencesStore.getState().customEndpoints).toEqual([EP]);

    // 模拟 settings 窗口删除端点后事件到达主窗口
    eventCb?.({ payload: { key: "customEndpoints", value: [] } });
    expect(usePreferencesStore.getState().customEndpoints).toEqual([]);
  });
});
