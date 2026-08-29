import type { Chat, UIMessage } from "@ai-sdk/react";
import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

// 语音钩子拉起 MediaRecorder/偏好存储，与守卫无关，直接桩掉。
vi.mock("../hooks/useWhisperRecording", () => ({
  useWhisperRecording: () => ({ supported: false }),
}));

// #514 守卫断言的唯一出口是 sendMessage 落点：动态导入的 chatRuntime 必须是
// 可观测的桩。守卫本体 collectPendingApprovalIds 不 mock，走真实实现。
vi.mock("../store/chatRuntime", () => ({
  getOrCreateChat: vi.fn(),
}));

import { toast } from "sonner";
import { getOrCreateChat } from "../store/chatRuntime";
import { chats, useChatStore } from "../store/chatStore";
import { AiComposerProvider, useComposer } from "./composer";

const SESSION_ID = "s-1";

type ChatStub = {
  messages: UIMessage[];
  sendMessage: ReturnType<typeof vi.fn>;
  addToolApprovalResponse: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};

function pendingApprovalMessages(): UIMessage[] {
  return [
    {
      id: "m-1",
      role: "assistant",
      parts: [
        {
          type: "tool-bash",
          state: "approval-requested",
          approval: { id: "ap-1" },
        },
      ],
    } as unknown as UIMessage,
  ];
}

function makeChatStub(messages: UIMessage[]): ChatStub {
  return {
    messages,
    sendMessage: vi.fn(),
    addToolApprovalResponse: vi.fn(),
    stop: vi.fn(),
  };
}

function seedChat(stub: ChatStub) {
  chats.set(SESSION_ID, stub as unknown as Chat<UIMessage>);
  vi.mocked(getOrCreateChat).mockReturnValue(
    stub as unknown as Chat<UIMessage>,
  );
  useChatStore.setState({ activeSessionId: SESSION_ID, mini: { open: false } });
}

let ctx: ReturnType<typeof useComposer> | null = null;

function Probe() {
  ctx = useComposer();
  return null;
}

function renderComposer() {
  ctx = null;
  render(
    <AiComposerProvider>
      <Probe />
    </AiComposerProvider>,
  );
}

function typeAndSubmit(text: string) {
  act(() => {
    ctx?.setValue(text);
  });
  act(() => {
    ctx?.submit();
  });
}

describe("AiComposerProvider submit guard (#514)", () => {
  beforeEach(() => {
    chats.delete(SESSION_ID);
    useChatStore.setState({ activeSessionId: null });
  });

  it("blocks submit and warns instead of reaching sendMessage while an approval is pending", async () => {
    const stub = makeChatStub(pendingApprovalMessages());
    seedChat(stub);
    renderComposer();

    typeAndSubmit("next turn");

    await waitFor(() => {
      expect(toast.warning).toHaveBeenCalledTimes(1);
    });
    expect(toast.warning).toHaveBeenCalledWith(expect.any(String), {
      id: `approval-pending:${SESSION_ID}`,
      description: expect.any(String),
    });
    await act(async () => {});
    expect(stub.sendMessage).not.toHaveBeenCalled();
    expect(stub.addToolApprovalResponse).not.toHaveBeenCalled();
  });

  it("still sends when no approval is pending (guard is not over-blocking)", async () => {
    const stub = makeChatStub([]);
    seedChat(stub);
    renderComposer();

    typeAndSubmit("hello");

    await waitFor(() => {
      expect(stub.sendMessage).toHaveBeenCalledTimes(1);
    });
    expect(stub.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ role: "user" }),
    );
    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("never auto-denies a pending approval from the composer (old deny path gone)", async () => {
    const stub = makeChatStub(pendingApprovalMessages());
    seedChat(stub);
    renderComposer();

    typeAndSubmit("next turn");
    await act(async () => {});

    expect(stub.addToolApprovalResponse).not.toHaveBeenCalled();
    expect(stub.sendMessage).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });
});
