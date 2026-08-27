import type { UIMessage } from "@ai-sdk/react";

/**
 * Collect every `state: "approval-requested"` tool part's approval id from the
 * chat history. Used by the composer to auto-deny any approval the user did
 * not act on before sending a new turn — otherwise the AI SDK treats the new
 * user message as a collision with the still-pending approval and the chat
 * errors out, blocking the rest of the session (#951).
 *
 * Pure function. Caller is responsible for actually invoking
 * `chat.addToolApprovalResponse({ id, approved: false })` for each id.
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
