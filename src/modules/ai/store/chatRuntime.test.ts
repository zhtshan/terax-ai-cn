import type { Chat, UIMessage } from "@ai-sdk/react";
import { describe, expect, it, vi } from "vitest";
import { sendMessage } from "./chatRuntime";
import { chats, useChatStore } from "./chatStore";

function seedChat(sessionId: string) {
  const send = vi.fn().mockResolvedValue(undefined);
  chats.set(sessionId, { sendMessage: send } as unknown as Chat<UIMessage>);
  return send;
}

describe("sendMessage key precheck", () => {
  it("sends with a compat custom-endpoint model instead of failing on getModel", async () => {
    useChatStore.setState({
      activeSessionId: "s-compat",
      selectedModelId: "compat-ep1#gpt-local",
    });
    const send = seedChat("s-compat");
    await expect(sendMessage("continue")).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith({ text: "continue" });
  });
});
