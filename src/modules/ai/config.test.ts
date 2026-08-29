import { describe, expect, it } from "vitest";
import {
  type CustomEndpoint,
  compatModelIdForEndpoint,
  compatWireModel,
  DEFAULT_MODEL_ID,
  endpointIdFromCompatModel,
  expandCompatModelInfos,
  getModelContextLimit,
  isCompatModelId,
  isOrphanCompatModel,
  MODEL_PRICING,
  migrateLegacyCompatEndpoint,
  modelKeepsReasoning,
  modelSlugFromCompatModel,
  modelSupportsTemperature,
  modelUsesReasoningTokens,
  orphanCompatFallback,
  resolveModel,
  splitEndpointModels,
} from "./config";

const endpoint: CustomEndpoint = {
  id: "ab12cd34",
  name: "My LLM",
  baseURL: "https://api.example.com/v1",
  modelId: "llama-3.3-70b",
  contextLimit: 64_000,
};

describe("compat model id helpers", () => {
  it("round-trips endpoint id through the synthetic model id", () => {
    const mid = compatModelIdForEndpoint(endpoint.id);
    expect(isCompatModelId(mid)).toBe(true);
    expect(endpointIdFromCompatModel(mid)).toBe(endpoint.id);
  });

  it("treats static model ids as non-compat", () => {
    expect(isCompatModelId("gpt-5.4-mini")).toBe(false);
    expect(endpointIdFromCompatModel("gpt-5.4-mini")).toBe("");
  });

  it("round-trips a slug-qualified model id", () => {
    const mid = compatModelIdForEndpoint("ep1", "model-a");
    expect(mid).toBe("compat-ep1#model-a");
    expect(isCompatModelId(mid)).toBe(true);
    expect(endpointIdFromCompatModel(mid)).toBe("ep1");
    expect(modelSlugFromCompatModel(mid)).toBe("model-a");
  });

  it("keeps the legacy form without a slug", () => {
    const mid = compatModelIdForEndpoint("ep1");
    expect(mid).toBe("compat-ep1");
    expect(endpointIdFromCompatModel(mid)).toBe("ep1");
    expect(modelSlugFromCompatModel(mid)).toBe(null);
  });

  it("cuts the endpoint id at the first # when a slug is present", () => {
    expect(
      endpointIdFromCompatModel(compatModelIdForEndpoint("ab12cd34", "m")),
    ).toBe("ab12cd34");
    expect(endpointIdFromCompatModel("compat-ep1#m#x")).toBe("ep1");
  });

  it("returns no slug for non-compat ids", () => {
    expect(modelSlugFromCompatModel("gpt-5.4-mini")).toBe(null);
  });
});

describe("isOrphanCompatModel", () => {
  it("flags legacy and slug compat ids whose endpoint no longer exists", () => {
    expect(isOrphanCompatModel("compat-gone", [endpoint])).toBe(true);
    expect(isOrphanCompatModel("compat-gone#model-a", [endpoint])).toBe(true);
  });

  it("accepts compat ids whose endpoint still exists", () => {
    expect(
      isOrphanCompatModel(compatModelIdForEndpoint(endpoint.id), [endpoint]),
    ).toBe(false);
    expect(
      isOrphanCompatModel(
        compatModelIdForEndpoint(endpoint.id, "llama-3.3-70b"),
        [endpoint],
      ),
    ).toBe(false);
  });

  it("accepts non-compat model ids", () => {
    expect(isOrphanCompatModel("gpt-5.4-mini", [endpoint])).toBe(false);
  });
});

describe("orphanCompatFallback", () => {
  it("falls back to the first surviving endpoint for an orphan id", () => {
    expect(orphanCompatFallback("compat-gone", [endpoint])).toBe(
      compatModelIdForEndpoint(endpoint.id),
    );
  });

  it("falls back to the default model when no endpoints remain", () => {
    expect(orphanCompatFallback("compat-gone", [])).toBe(DEFAULT_MODEL_ID);
  });

  it("keeps selections that are not orphaned", () => {
    expect(
      orphanCompatFallback(compatModelIdForEndpoint(endpoint.id), [endpoint]),
    ).toBe(null);
    expect(orphanCompatFallback("gpt-5.4-mini", [endpoint])).toBe(null);
  });
});

describe("splitEndpointModels", () => {
  it("returns empty for blank input", () => {
    expect(splitEndpointModels("")).toEqual([]);
    expect(splitEndpointModels("   ")).toEqual([]);
    expect(splitEndpointModels(" , , ")).toEqual([]);
  });

  it("keeps a single id intact", () => {
    expect(splitEndpointModels("llama-3.3-70b")).toEqual(["llama-3.3-70b"]);
  });

  it("splits on commas, trims and drops empties", () => {
    expect(splitEndpointModels(" a , b ,, c ")).toEqual(["a", "b", "c"]);
  });

  it("dedupes preserving first occurrence order", () => {
    expect(splitEndpointModels("b, a, b, c, a")).toEqual(["b", "a", "c"]);
  });
});

describe("getCompatModelInfo slug labels", () => {
  const multi: CustomEndpoint = {
    id: "ab12cd34",
    name: "My LLM",
    baseURL: "https://api.example.com/v1",
    modelId: "model-a, model-b",
    contextLimit: 64_000,
  };

  it("labels a slug entry with the slug and keeps the endpoint name as hint", () => {
    const mid = compatModelIdForEndpoint(multi.id, "model-b");
    const info = resolveModel(mid, [multi]);
    expect(info.id).toBe(mid);
    expect(info.label).toBe("model-b");
    expect(info.hint).toBe("My LLM");
  });

  it("labels a legacy selection with the first configured model", () => {
    const info = resolveModel(compatModelIdForEndpoint(multi.id), [multi]);
    expect(info.label).toBe("model-a");
  });

  it("keeps the single-model label for a legacy selection", () => {
    const info = resolveModel(compatModelIdForEndpoint(endpoint.id), [
      endpoint,
    ]);
    expect(info.label).toBe(endpoint.modelId);
  });

  it("falls back to the endpoint name when no model splits out", () => {
    const blank: CustomEndpoint = { ...multi, modelId: "  " };
    const info = resolveModel(compatModelIdForEndpoint(blank.id), [blank]);
    expect(info.label).toBe("My LLM");
  });
});

describe("compatWireModel", () => {
  it("returns the slug from a slug-qualified selection", () => {
    expect(
      compatWireModel(compatModelIdForEndpoint(endpoint.id, "qwen3-coder"), [
        endpoint,
      ]),
    ).toBe("qwen3-coder");
  });

  it("falls back to the first listed model for a legacy selection", () => {
    const multi: CustomEndpoint = { ...endpoint, modelId: "model-a, model-b" };
    expect(compatWireModel(compatModelIdForEndpoint(multi.id), [multi])).toBe(
      "model-a",
    );
  });

  it("returns empty for a legacy selection whose endpoint is gone", () => {
    expect(compatWireModel("compat-gone", [endpoint])).toBe("");
  });

  it("returns empty when no slug and the endpoint lists no usable model", () => {
    const blank: CustomEndpoint = { ...endpoint, modelId: " , " };
    expect(compatWireModel(compatModelIdForEndpoint(blank.id), [blank])).toBe(
      "",
    );
  });
});

describe("expandCompatModelInfos", () => {
  it("expands each comma-separated model into its own selectable entry", () => {
    const multi: CustomEndpoint = { ...endpoint, modelId: "model-a, model-b" };
    const infos = expandCompatModelInfos([multi]);
    expect(infos.map((i) => i.id)).toEqual([
      compatModelIdForEndpoint(multi.id, "model-a"),
      compatModelIdForEndpoint(multi.id, "model-b"),
    ]);
    expect(infos[0]?.label).toBe("model-a");
    expect(infos[0]?.hint).toBe(multi.name);
  });

  it("keeps one slug entry for an endpoint with a single model", () => {
    const infos = expandCompatModelInfos([endpoint]);
    expect(infos).toHaveLength(1);
    expect(infos[0]?.id).toBe(
      compatModelIdForEndpoint(endpoint.id, endpoint.modelId),
    );
    expect(infos[0]?.label).toBe(endpoint.modelId);
  });

  it("keeps a bare endpoint entry when it lists no usable model", () => {
    const blank: CustomEndpoint = { ...endpoint, modelId: " , " };
    const infos = expandCompatModelInfos([blank]);
    expect(infos).toHaveLength(1);
    expect(infos[0]?.id).toBe(compatModelIdForEndpoint(blank.id));
  });
});

describe("resolveModel", () => {
  it("resolves a compat model id against its endpoint", () => {
    const mid = compatModelIdForEndpoint(endpoint.id);
    const info = resolveModel(mid, [endpoint]);
    expect(info.provider).toBe("openai-compatible");
    expect(info.id).toBe(mid);
    expect(info.label).toBe(endpoint.modelId);
  });

  it("falls back to a placeholder when the endpoint is gone", () => {
    const info = resolveModel(compatModelIdForEndpoint("missing"), []);
    expect(info.provider).toBe("openai-compatible");
  });

  it("resolves a static model id from the registry", () => {
    expect(resolveModel("gpt-5.4-mini").provider).toBe("openai");
  });

  it.each([
    ["gpt-5.6", "openai"],
    ["gpt-5.6-terra", "openai"],
    ["gpt-5.6-luna", "openai"],
    ["claude-fable-5", "anthropic"],
    ["claude-sonnet-5", "anthropic"],
    ["grok-4.5", "xai"],
  ] as const)("resolves current model %s through %s", (modelId, provider) => {
    expect(resolveModel(modelId).provider).toBe(provider);
  });

  it("throws on an unknown static model id", () => {
    expect(() => resolveModel("nope-not-real")).toThrow();
  });
});

describe("getModelContextLimit", () => {
  it("uses the per-endpoint override for compat models", () => {
    const mid = compatModelIdForEndpoint(endpoint.id);
    expect(getModelContextLimit(mid, endpoint.contextLimit)).toBe(64_000);
  });

  it("reads the static table for known models", () => {
    expect(getModelContextLimit("claude-opus-4-7")).toBe(1_000_000);
  });

  it.each([
    ["gpt-5.6", 1_050_000],
    ["gpt-5.6-terra", 1_050_000],
    ["gpt-5.6-luna", 1_050_000],
    ["claude-fable-5", 1_000_000],
    ["claude-sonnet-5", 1_000_000],
    ["grok-4.5", 500_000],
  ] as const)("uses the published context limit for %s", (modelId, limit) => {
    expect(getModelContextLimit(modelId)).toBe(limit);
  });
});

describe("current model pricing", () => {
  it.each([
    ["gpt-5.6", 5, 30, 0.5],
    ["gpt-5.6-terra", 2.5, 15, 0.25],
    ["gpt-5.6-luna", 1, 6, 0.1],
    ["claude-fable-5", 10, 50, 1],
    ["claude-sonnet-5", 3, 15, 0.3],
    ["grok-4.5", 2, 6, 0.5],
  ] as const)(
    "uses the published token pricing for %s",
    (modelId, input, output, cacheRead) => {
      expect(MODEL_PRICING[modelId]).toEqual({ input, output, cacheRead });
    },
  );
});

describe("modelKeepsReasoning", () => {
  it("keeps reasoning for compat endpoints (freeform provider)", () => {
    const info = resolveModel(compatModelIdForEndpoint(endpoint.id), [
      endpoint,
    ]);
    expect(modelKeepsReasoning(info)).toBe(true);
  });

  it("drops reasoning for plain non-reasoning models", () => {
    expect(modelKeepsReasoning(resolveModel("gpt-5.4-mini"))).toBe(false);
  });

  it("keeps reasoning for tagged reasoning models", () => {
    expect(modelKeepsReasoning(resolveModel("claude-opus-4-7"))).toBe(true);
  });
});

describe("model sampling capabilities", () => {
  it.each([
    ["openai", "gpt-5.4-nano"],
    ["openai", "gpt-5.6"],
    ["anthropic", "claude-fable-5"],
    ["anthropic", "claude-sonnet-5"],
  ] as const)("omits temperature for %s/%s", (provider, modelId) => {
    expect(modelSupportsTemperature(provider, modelId)).toBe(false);
  });

  it("keeps temperature for models that accept sampling parameters", () => {
    expect(modelSupportsTemperature("openai", "gpt-4.1-mini")).toBe(true);
    expect(modelSupportsTemperature("xai", "grok-4.5")).toBe(true);
  });

  it("defaults unknown provider models to temperature support", () => {
    expect(modelSupportsTemperature("openai-compatible", "custom-model")).toBe(
      true,
    );
  });

  it.each([
    ["openai", "gpt-5.4-nano"],
    ["openai", "gpt-5.6-luna"],
    ["anthropic", "claude-sonnet-5"],
    ["xai", "grok-4.5"],
    ["groq", "openai/gpt-oss-20b"],
  ] as const)(
    "allocates a reasoning output budget for %s/%s",
    (provider, modelId) => {
      expect(modelUsesReasoningTokens(provider, modelId)).toBe(true);
    },
  );
});

describe("migrateLegacyCompatEndpoint", () => {
  it("migrates a fully configured legacy endpoint", () => {
    const out = migrateLegacyCompatEndpoint(
      "https://api.example.com/v1",
      "llama-3.3-70b",
      32_000,
      "fixedid1",
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: "fixedid1",
      baseURL: "https://api.example.com/v1",
      modelId: "llama-3.3-70b",
      contextLimit: 32_000,
    });
  });

  it("skips migration when base URL or model id is missing", () => {
    expect(migrateLegacyCompatEndpoint("", "m", 1, "x")).toEqual([]);
    expect(migrateLegacyCompatEndpoint("u", "  ", 1, "x")).toEqual([]);
  });
});
