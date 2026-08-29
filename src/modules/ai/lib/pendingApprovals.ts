import type { UIMessage } from "@ai-sdk/react";

/**
 * Collect every `state: "approval-requested"` tool part's approval id from the
 * chat history. The composer uses these ids to BLOCK sending a new message while
 * an approval is unanswered (#514): denying is a user action from the approval
 * UI, never auto-dispatched. Returning the ids is enough for the caller to
 * detect the blocking condition.
 */
export function collectPendingApprovalIds(messages: UIMessage[]): string[] {
  const ids: string[] = [];
  for (const m of messages) {
    if (m.role !== "assistant") continue;
    const parts = m.parts as Array<{
      state?: string;
      approval?: { id?: string };
    }>;
    for (const p of parts) {
      if (p.state === "approval-requested" && p.approval?.id) {
        ids.push(p.approval.id);
      }
    }
  }
  return ids;
}
