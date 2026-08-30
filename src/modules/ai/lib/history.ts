import { isToolUIPart, type UIMessage } from "ai";

/**
 * Provider endpoints (notably OpenAI-compatible relays) reject assistant
 * tool calls whose `arguments` is not a JSON object. A failed stream can
 * persist tool parts whose input stayed a raw string (truncated JSON) or
 * is missing; normalize those to a parsed object (or `{}`) so the call is
 * replayable history instead of a 400. Pairing with the tool result is
 * preserved so the model still sees the earlier failure.
 */
export function normalizeToolInputsForHistory(
  parts: UIMessage["parts"],
): UIMessage["parts"] {
  return parts.map((part) => {
    if (!isToolUIPart(part)) return part;
    if (typeof part.input === "object" && part.input !== null) return part;
    let input: Record<string, unknown> = {};
    if (typeof part.input === "string" && part.input.trim() !== "") {
      try {
        const parsed: unknown = JSON.parse(part.input);
        if (typeof parsed === "object" && parsed !== null) {
          input = parsed as Record<string, unknown>;
        }
      } catch {
        // keep {}
      }
    }
    return { ...part, input };
  });
}
