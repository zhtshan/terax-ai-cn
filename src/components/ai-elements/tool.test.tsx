import { cleanup, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { STATUS_LABEL, Tool, TOOL_META } from "./tool";

// setup 未开 globals，testing-library 不会自动清理 DOM。
afterEach(cleanup);

const noMatches = i18next.t("ai.tools.noMatches");
const truncated = i18next.t("ai.tools.truncated");

describe("Tool glob output", () => {
  it("lists hits from the actual {root, hits} output shape", () => {
    render(
      <Tool
        toolName="glob"
        state="output-available"
        defaultOpen
        input={{ pattern: "**/*.ts" }}
        output={{
          root: "/w",
          hits: [
            { path: "/w/src/a.ts", rel: "src/a.ts" },
            { path: "/w/src/b.ts", rel: "src/b.ts" },
          ],
          truncated: false,
        }}
      />,
    );
    expect(screen.getByText("src/a.ts")).toBeTruthy();
    expect(screen.getByText("src/b.ts")).toBeTruthy();
    expect(screen.queryByText(noMatches)).toBeFalsy();
  });

  it("shows noMatches only when hits is empty", () => {
    render(
      <Tool
        toolName="glob"
        state="output-available"
        defaultOpen
        input={{ pattern: "**/*.ts" }}
        output={{ root: "/w", hits: [], truncated: false }}
      />,
    );
    expect(screen.getByText(noMatches)).toBeTruthy();
  });

  it("marks truncated results", () => {
    render(
      <Tool
        toolName="glob"
        state="output-available"
        defaultOpen
        input={{ pattern: "**/*.ts" }}
        output={{
          root: "/w",
          hits: [{ path: "/w/src/a.ts", rel: "src/a.ts" }],
          truncated: true,
        }}
      />,
    );
    expect(screen.getByText(truncated)).toBeTruthy();
  });
});

describe("Tool bash_run output", () => {
  const interrupted = i18next.t("ai.tools.interrupted");

  it("marks interrupted runs", () => {
    render(
      <Tool
        toolName="bash_run"
        state="output-available"
        defaultOpen
        input={{ command: "sleep 30" }}
        output={{
          command: "sleep 30",
          stdout: "partial",
          stderr: "",
          exit_code: null,
          timed_out: false,
          truncated: false,
          interrupted: true,
          cwd_after: null,
        }}
      />,
    );
    expect(screen.getByText(interrupted)).toBeTruthy();
  });

  it("does not mark normal runs as interrupted", () => {
    render(
      <Tool
        toolName="bash_run"
        state="output-available"
        defaultOpen
        input={{ command: "echo hi" }}
        output={{
          command: "echo hi",
          stdout: "hi",
          stderr: "",
          exit_code: 0,
          timed_out: false,
          truncated: false,
          interrupted: false,
          cwd_after: null,
        }}
      />,
    );
    expect(screen.queryByText(interrupted)).toBeFalsy();
  });
});

describe("Tool label localization", () => {
  it("renders the localized label for a known tool", () => {
    render(
      <Tool
        toolName="read_file"
        state="input-available"
        input={{ path: "/w/a.ts" }}
      />,
    );
    expect(screen.getByText("读取")).toBeTruthy();
    expect(screen.queryByText(/ai\.tools\./)).toBeFalsy();
  });

  it("labels the status dot while awaiting approval", () => {
    render(
      <Tool
        toolName="bash_run"
        state="approval-requested"
        input={{ command: "ls" }}
      />,
    );
    expect(screen.getByLabelText("等待审批")).toBeTruthy();
  });

  it("resolves every TOOL_META label to a translation", () => {
    for (const { label } of Object.values(TOOL_META)) {
      expect(i18next.t(`ai.tools.${label}`)).not.toBe(`ai.tools.${label}`);
    }
  });

  it("resolves every STATUS_LABEL state to a translation", () => {
    for (const value of Object.values(STATUS_LABEL)) {
      expect(i18next.t(`ai.tools.${value}`)).not.toBe(`ai.tools.${value}`);
    }
  });
});
