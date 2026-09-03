import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn(() => Promise.resolve()),
}));

import { PreviewPane } from "./PreviewPane";

const invokeMock = vi.mocked(invoke);

// visible=false：iframe 保持 SuspendedState 不挂载，happy-dom 才不会对
// src 发真实 HTTP 请求（端口被占时行为漂移 + stderr 噪音）；提示条渲染
// 与 visible 无关。
function renderPane(url: string) {
  return render(
    <PreviewPane url={url} visible={false} onUrlChange={() => {}} />,
  );
}

afterEach(cleanup);

describe("PreviewPane cookie hint（#1148）", () => {
  it("loopback URL 显示 cookie 登录提示条与外部打开按钮", async () => {
    invokeMock.mockResolvedValue({ status: 200, headers: {} });
    renderPane("http://localhost:5173/login");

    expect(
      await screen.findByText("沙箱预览中，基于 Cookie 的登录可能无法使用。"),
    ).toBeTruthy();
    expect(screen.getByText("在系统浏览器中打开")).toBeTruthy();
    expect(screen.queryByText(/禁止嵌入/)).toBeNull();
  });

  it("点击忽略后 cookie 提示条消失", async () => {
    invokeMock.mockResolvedValue({ status: 200, headers: {} });
    renderPane("http://localhost:5173/login");

    await screen.findByText("沙箱预览中，基于 Cookie 的登录可能无法使用。");
    fireEvent.click(screen.getByTitle("忽略"));

    expect(
      screen.queryByText("沙箱预览中，基于 Cookie 的登录可能无法使用。"),
    ).toBeNull();
  });

  it("非 loopback URL 显示嵌入警告而非 cookie 提示", async () => {
    invokeMock.mockResolvedValue({ status: 200, headers: {} });
    renderPane("https://example.com/docs");

    expect(await screen.findByText(/禁止嵌入/)).toBeTruthy();
    expect(
      screen.queryByText("沙箱预览中，基于 Cookie 的登录可能无法使用。"),
    ).toBeNull();
  });

  it("loopback URL 被响应头拦截时仍显示嵌入警告（#807 回归）", async () => {
    invokeMock.mockResolvedValue({
      status: 200,
      headers: { "x-frame-options": "DENY" },
    });
    renderPane("http://localhost:5173/login");

    expect(await screen.findByText(/禁止嵌入/)).toBeTruthy();
  });

  it("openUrl 按钮调用系统浏览器打开当前 URL", async () => {
    invokeMock.mockResolvedValue({ status: 200, headers: {} });
    renderPane("http://localhost:5173/login");

    await screen.findByText("沙箱预览中，基于 Cookie 的登录可能无法使用。");
    fireEvent.click(screen.getByText("在系统浏览器中打开"));

    expect(openUrl).toHaveBeenCalledWith("http://localhost:5173/login");
  });
});
