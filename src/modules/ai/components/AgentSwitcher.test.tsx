import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/settings/openSettingsWindow", () => ({
  openSettingsWindow: vi.fn(),
}));

import { AgentSwitcher } from "./AgentSwitcher";

// 触发按钮展示当前激活代理（默认 builtin:coder）。
// 内置代理名称必须走 i18n 显示中文，而不是 agents.ts 里的英文原文。
afterEach(cleanup);

describe("AgentSwitcher 内置代理展示", () => {
  it("触发按钮显示激活代理的中文名称", () => {
    render(<AgentSwitcher />);
    expect(screen.getByText("编程助手")).toBeTruthy();
  });
});
