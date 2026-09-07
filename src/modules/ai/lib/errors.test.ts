import { describe, expect, it } from "vitest";
import { formatAiError } from "./errors";

describe("formatAiError", () => {
  it("prefixes provider errors with Chinese labels", () => {
    expect(formatAiError({ code: "invalid_api_key", message: "bad key" })).toMatch(
      /^认证失败: /,
    );
    expect(formatAiError({ code: "model_not_found", message: "nope" })).toMatch(
      /^模型不可用: /,
    );
    expect(formatAiError({ code: "insufficient_quota", message: "quota" })).toMatch(
      /^配额已用尽: /,
    );
    expect(formatAiError({ code: "rate_limit_exceeded", message: "slow" })).toMatch(
      /^请求过于频繁: /,
    );
  });

  it("uses a Chinese fallback when the payload is unreadable", () => {
    expect(formatAiError(null)).toBe(
      "AI 服务商拒绝了请求。请检查所选模型与服务商设置后重试。",
    );
  });
});
