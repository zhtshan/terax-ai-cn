import { beforeEach, describe, expect, it } from "vitest";
import {
  applyProgress,
  parseProgressEvent,
} from "./progress";
import { useLspRuntimeStore } from "./runtimeStore";

const BEGIN = {
  token: "t1",
  kind: "begin" as const,
  title: "Indexing",
  percentage: 0,
};

describe("parseProgressEvent", () => {
  it("parses a begin notification", () => {
    expect(
      parseProgressEvent(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "$/progress",
          params: { token: "t1", value: { kind: "begin", title: "Indexing" } },
        }),
      ),
    ).toEqual({ token: "t1", kind: "begin", title: "Indexing" });
  });

  it("returns null for payloads without a $/progress marker", () => {
    expect(
      parseProgressEvent(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "textDocument/publishDiagnostics",
          params: { uri: "file:///a.ts", diagnostics: [] },
        }),
      ),
    ).toBeNull();
    expect(parseProgressEvent("not json")).toBeNull();
  });

  it("returns null for a missing or unknown-kind value", () => {
    expect(
      parseProgressEvent(
        JSON.stringify({
          method: "$/progress",
          params: { token: "t1", value: { kind: "nope" } },
        }),
      ),
    ).toBeNull();
    expect(
      parseProgressEvent(
        JSON.stringify({ method: "$/progress", params: { token: "t1" } }),
      ),
    ).toBeNull();
  });

  it("returns null when the token is missing", () => {
    expect(
      parseProgressEvent(
        JSON.stringify({
          method: "$/progress",
          params: { value: { kind: "begin" } },
        }),
      ),
    ).toBeNull();
  });

  it("drops non-numeric percentage and non-string title", () => {
    expect(
      parseProgressEvent(
        JSON.stringify({
          method: "$/progress",
          params: {
            token: "t1",
            value: { kind: "report", title: 5, percentage: "x" },
          },
        }),
      ),
    ).toEqual({ token: "t1", kind: "report" });
  });
});

describe("applyProgress", () => {
  it("begin always starts or replaces the tracked work", () => {
    expect(applyProgress(null, BEGIN)).toEqual({
      token: "t1",
      title: "Indexing",
      percentage: 0,
    });
    expect(
      applyProgress(
        { token: "t0", title: "Old" },
        { token: "t1", kind: "begin", title: "New" },
      ),
    ).toEqual({ token: "t1", title: "New" });
  });

  it("report updates only a matching token and keeps prior fields", () => {
    const prev = { token: "t1", title: "Indexing", percentage: 10 };
    expect(
      applyProgress(prev, {
        token: "t1",
        kind: "report",
        message: "3/30",
        percentage: 10,
      }),
    ).toEqual({
      token: "t1",
      title: "Indexing",
      message: "3/30",
      percentage: 10,
    });
    expect(
      applyProgress(prev, { token: "t1", kind: "report" }),
    ).toEqual(prev);
    expect(
      applyProgress(prev, { token: "other", kind: "report", percentage: 99 }),
    ).toEqual(prev);
  });

  it("end clears only a matching token", () => {
    const prev = { token: "t1", title: "Indexing" };
    expect(applyProgress(prev, { token: "t1", kind: "end" })).toBeNull();
    expect(applyProgress(prev, { token: "t2", kind: "end" })).toEqual(prev);
  });
});

describe("runtimeStore progress housekeeping", () => {
  beforeEach(() => {
    const s = useLspRuntimeStore.getState();
    s.upsertSession({ key: "k", presetId: "typescript", root: "/r", status: "running" });
    s.setProgress("k", BEGIN);
  });

  it("removeSession clears the progress entry", () => {
    useLspRuntimeStore.getState().removeSession("k", "typescript");
    expect(useLspRuntimeStore.getState().progress["k"]).toBeUndefined();
  });

  it("removeSessionQuiet clears the progress entry", () => {
    useLspRuntimeStore.getState().removeSessionQuiet("k");
    expect(useLspRuntimeStore.getState().progress["k"]).toBeUndefined();
  });
});
