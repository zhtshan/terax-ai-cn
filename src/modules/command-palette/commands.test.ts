import i18next from "i18next";
import { describe, expect, it } from "vitest";
import type { Tab } from "@/modules/tabs";
import {
  createCommandItems,
  type CommandPaletteActionContext,
} from "./commands";

function ctxWithTabs(
  tabs: Tab[],
  activeId: number = tabs[0]?.id ?? 0,
): CommandPaletteActionContext {
  return {
    tabs,
    activeId,
    searchTarget: null,
    explorerRoot: null,
    home: null,
    openNewTab: () => {},
    openNewBlock: () => {},
    openNewPrivate: () => {},
    openNewEditor: () => {},
    openNewPreview: () => {},
    openGitGraph: () => {},
    toggleSourceControl: () => {},
    closeActiveTabOrPane: () => {},
    splitPaneRight: () => {},
    splitPaneDown: () => {},
    focusSearch: () => {},
    focusExplorerSearch: () => {},
    toggleSidebar: () => {},
    toggleAi: () => {},
    askAiSelection: () => {},
    openSettings: () => {},
    openKeyboardShortcuts: () => {},
    spaces: [],
    activeSpaceId: null,
    openSpacesOverview: () => {},
    newSpace: () => {},
    switchSpace: () => {},
  };
}

function terminalTab(
  over: Partial<Extract<Tab, { kind: "terminal" }>> = {},
): Tab {
  return {
    id: 1,
    kind: "terminal",
    spaceId: "default",
    title: "shell",
    paneTree: { kind: "leaf", id: 2 },
    activeLeafId: 2,
    ...over,
  };
}

const SPLIT_IDS = ["pane.splitRight", "pane.splitDown"];

describe("createCommandItems split disable reasons", () => {
  it("disables both split commands on a blocks tab", () => {
    const items = createCommandItems(ctxWithTabs([terminalTab({ blocks: true })]));
    for (const id of SPLIT_IDS) {
      expect(items.find((i) => i.id === id)?.disabledReason).toBe(
        i18next.t("commandPalette.disabled.blocksTab"),
      );
    }
  });

  it("keeps split enabled on a regular terminal tab", () => {
    const items = createCommandItems(ctxWithTabs([terminalTab()]));
    for (const id of SPLIT_IDS) {
      expect(items.find((i) => i.id === id)?.disabledReason).toBeUndefined();
    }
  });

  it("disables split with the no-terminal reason on non-terminal tabs", () => {
    const editor: Tab = {
      id: 2,
      kind: "editor",
      spaceId: "default",
      title: "a.ts",
      path: "/tmp/a.ts",
      dirty: false,
      preview: false,
    };
    const items = createCommandItems(ctxWithTabs([editor]));
    for (const id of SPLIT_IDS) {
      expect(items.find((i) => i.id === id)?.disabledReason).toBe(
        i18next.t("commandPalette.disabled.noTerminalTab"),
      );
    }
  });

  it("resolves the disabled-reason i18n keys from locale resources", () => {
    expect(i18next.t("commandPalette.disabled.blocksTab")).not.toBe(
      "commandPalette.disabled.blocksTab",
    );
    expect(i18next.t("commandPalette.disabled.noTerminalTab")).not.toBe(
      "commandPalette.disabled.noTerminalTab",
    );
  });
});
