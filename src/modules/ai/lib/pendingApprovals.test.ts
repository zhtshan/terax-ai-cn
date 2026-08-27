import type { UIMessage } from "@ai-sdk/react";
import { describe, expect, it } from "vitest";
import { collectPendingApprovalIds } from "./pendingApprovals";

function msg(
  parts: unknown[],
  role: UIMessage["role"] = "assistant",
): UIMessage {
  return { id: "m", role, parts } as unknown as UIMessage;
}

describe("collectPendingApprovalIds (#951)", () => {
  it("returns empty list when there are no messages", () => {
    expect(collectPendingApprovalIds([])).toEqual([]);
  });

  it("ignores user messages even if a part looks approval-pending", () => {
    expect(
      collectPendingApprovalIds([
        msg(
          [{ state: "approval-requested", approval: { id: "x" } }],
          "user",
        ),
      ]),
    ).toEqual([]);
  });

  it("collects a single pending approval id from an assistant message", () => {
    expect(
      collectPendingApprovalIds([
        msg([
          { type: "text", text: "ok" },
          { state: "approval-requested", approval: { id: "ap-1" } },
        ]),
      ]),
    ).toEqual(["ap-1"]);
  });

  it("collects multiple pending approval ids across messages", () => {
    expect(
      collectPendingApprovalIds([
        msg([{ state: "approval-requested", approval: { id: "ap-1" } }]),
        msg([{ state: "approval-requested", approval: { id: "ap-2" } }]),
      ]),
    ).toEqual(["ap-1", "ap-2"]);
  });

  it("skips already-responded approvals", () => {
    expect(
      collectPendingApprovalIds([
        msg([
          {
            state: "approval-responded",
            approval: { id: "old", approved: true },
          },
        ]),
      ]),
    ).toEqual([]);
  });

  it("skips parts already in output-available state", () => {
    expect(
      collectPendingApprovalIds([
        msg([{ state: "output-available", output: {} }]),
      ]),
    ).toEqual([]);
  });

  it("skips approval-requested parts missing an id", () => {
    expect(
      collectPendingApprovalIds([
        msg([{ state: "approval-requested", approval: undefined }]),
        msg([{ state: "approval-requested", approval: { id: "" } }]),
      ]),
    ).toEqual([]);
  });
});
