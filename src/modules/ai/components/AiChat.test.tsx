import type { UIMessage } from "@ai-sdk/react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import i18next from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

// ContinueRow 的发送落点是模块级 chatRuntime.sendMessage：桩掉以观测
// #514 守卫是否拦截。守卫本体 collectPendingApprovalIds 不 mock。
vi.mock("../store/chatRuntime", () => ({
  sendMessage: vi.fn(),
}));

import { toast } from "sonner";
import { sendMessage } from "../store/chatRuntime";
import { useChatStore } from "../store/chatStore";
import { AiChatView } from "./AiChat";

function assistantMsg(parts: unknown[]): UIMessage {
  return { id: "m-1", role: "assistant", parts } as unknown as UIMessage;
}

function pendingApprovalMessages(): UIMessage[] {
  return [
    assistantMsg([
      {
        type: "tool-bash",
        state: "approval-requested",
        approval: { id: "ap-1" },
      },
    ]),
  ];
}

function plainAssistantMessages(): UIMessage[] {
  return [assistantMsg([{ type: "text", text: "done" }])];
}

function renderView(messages: UIMessage[]) {
  useChatStore.setState((s) => ({
    agentMeta: { ...s.agentMeta, hitStepCap: true },
  }));
  return render(
    <AiChatView
      messages={messages}
      status="ready"
      error={undefined}
      clearError={vi.fn()}
      addToolApprovalResponse={vi.fn()}
      stop={vi.fn()}
    />,
  );
}

function clickContinue() {
  // "继续" 文案在消息区还有其他按钮，用 ContinueRow 独有的 stepLimit 文案定位。
  const row = screen.getByText(i18next.t("ai.chat.stepLimit")).parentElement;
  fireEvent.click(within(row as HTMLElement).getByRole("button"));
}

// setup 未开 globals，testing-library 不会自动清理 DOM。
afterEach(cleanup);

beforeEach(() => {
  vi.clearAllMocks();
  useChatStore.setState((s) => ({
    agentMeta: { ...s.agentMeta, hitStepCap: false },
  }));
});

describe("AiChatView ContinueRow", () => {
  it("blocks continue while an approval is pending", () => {
    renderView(pendingApprovalMessages());
    clickContinue();
    expect(sendMessage).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalled();
  });

  it("sends the continue prompt when no approval is pending", () => {
    renderView(plainAssistantMessages());
    clickContinue();
    expect(sendMessage).toHaveBeenCalledTimes(1);
    expect(toast.warning).not.toHaveBeenCalled();
  });
});
