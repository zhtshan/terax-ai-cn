export type LspWorkDone = {
  token: string | number;
  title?: string;
  message?: string;
  percentage?: number;
};

export type LspProgressEvent = {
  token: string | number;
  kind: "begin" | "report" | "end";
  title?: string;
  message?: string;
  percentage?: number;
};

// 分流在 transport 原始流上做：先字符串预检再 parse，非进度消息零 JSON 开销。
export function parseProgressEvent(raw: string): LspProgressEvent | null {
  if (!raw.includes('"$/progress"')) return null;
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  const params = (msg as { params?: unknown } | null)?.params;
  if (typeof params !== "object" || params === null) return null;
  const { token, value } = params as { token?: unknown; value?: unknown };
  if (typeof token !== "string" && typeof token !== "number") return null;
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.kind !== "begin" && v.kind !== "report" && v.kind !== "end") {
    return null;
  }
  return {
    token,
    kind: v.kind,
    title: typeof v.title === "string" ? v.title : undefined,
    message: typeof v.message === "string" ? v.message : undefined,
    percentage: typeof v.percentage === "number" ? v.percentage : undefined,
  };
}

// 并发 token 时最后一个 begin 胜出；end 只清除同 token 的任务。
export function applyProgress(
  prev: LspWorkDone | null,
  e: LspProgressEvent,
): LspWorkDone | null {
  if (e.kind === "begin") {
    return {
      token: e.token,
      title: e.title,
      message: e.message,
      percentage: e.percentage,
    };
  }
  if (!prev || prev.token !== e.token) return prev;
  if (e.kind === "end") return null;
  return {
    ...prev,
    message: e.message ?? prev.message,
    percentage: e.percentage ?? prev.percentage,
  };
}