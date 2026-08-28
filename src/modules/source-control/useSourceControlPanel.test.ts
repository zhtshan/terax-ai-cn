import type { CustomEndpoint } from "@/modules/ai/config";
import type { LocalProviderConfig } from "@/modules/ai/lib/agent";
import type { CustomEndpointKeys } from "@/modules/ai/lib/keyring";
import { describe, expect, it } from "vitest";
import { commitMessageModelConfig } from "./useSourceControlPanel";

const endpoints: CustomEndpoint[] = [
  {
    id: "f46e2124",
    name: "My proxy",
    baseURL: "http://localhost:8080/v1",
    modelId: "gpt-x",
    contextLimit: 128_000,
  },
];

function makePrefs() {
  return {
    lmstudioBaseURL: "http://lm:1234",
    lmstudioModelId: "qwen3",
    mlxBaseURL: "",
    mlxModelId: "",
    ollamaBaseURL: "http://ol:11434",
    ollamaModelId: "llama3",
    openaiCompatibleBaseURL: "",
    openaiCompatibleModelId: "",
    openrouterModelId: "or-1",
    customEndpoints: endpoints,
  };
}

describe("commitMessageModelConfig", () => {
  it("forwards custom endpoints and their keys so compat models resolve", () => {
    const epKeys: CustomEndpointKeys = { f46e2124: "sk-1" };
    const cfg: LocalProviderConfig = commitMessageModelConfig(
      makePrefs(),
      epKeys,
    );
    expect(cfg.customEndpoints).toEqual(endpoints);
    expect(cfg.customEndpointKeys).toBe(epKeys);
  });

  it("keeps forwarding the local provider fields the call site listed before", () => {
    const cfg = commitMessageModelConfig(makePrefs(), {});
    expect(cfg.lmstudioBaseURL).toBe("http://lm:1234");
    expect(cfg.lmstudioModelId).toBe("qwen3");
    expect(cfg.mlxBaseURL).toBe("");
    expect(cfg.mlxModelId).toBe("");
    expect(cfg.ollamaBaseURL).toBe("http://ol:11434");
    expect(cfg.ollamaModelId).toBe("llama3");
    expect(cfg.openaiCompatibleBaseURL).toBe("");
    expect(cfg.openaiCompatibleModelId).toBe("");
    expect(cfg.openrouterModelId).toBe("or-1");
  });
});
