import { cleanup, render, screen } from "@testing-library/react";
import i18next from "i18next";
import { afterEach, describe, expect, it } from "vitest";
import { Tool } from "./tool";

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
