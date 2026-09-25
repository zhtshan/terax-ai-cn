import { describe, expect, it, vi } from "vitest";
import { openSidebarViewCore } from "./useSidebarPanel";

type FakePanel = {
  getSize: () => { asPercentage: number };
  resize: (v: string) => void;
  collapse: () => void;
};

describe("openSidebarViewCore", () => {
  it("switches view when panel is open with a different view", () => {
    const storedView: Record<string, string> = {};
    const persist = (view: string) => {
      storedView["terax.sidebar.view"] = view;
    };
    const panel: FakePanel = {
      getSize: () => ({ asPercentage: 40 }),
      resize: vi.fn(),
      collapse: vi.fn(),
    };
    openSidebarViewCore(panel, 260, "source-control", "explorer", persist);
    expect(storedView["terax.sidebar.view"]).toBe("source-control");
    expect(panel.resize).not.toHaveBeenCalled();
    expect(panel.collapse).not.toHaveBeenCalled();
  });

  it("no-ops when panel is open and view already matches", () => {
    const persist = vi.fn();
    const panel: FakePanel = {
      getSize: () => ({ asPercentage: 40 }),
      resize: vi.fn(),
      collapse: vi.fn(),
    };
    openSidebarViewCore(panel, 260, "source-control", "source-control", persist);
    expect(persist).not.toHaveBeenCalled();
    expect(panel.resize).not.toHaveBeenCalled();
    expect(panel.collapse).not.toHaveBeenCalled();
  });

  it("expands collapsed panel and persists the view", () => {
    const persist = vi.fn();
    const panel: FakePanel = {
      getSize: () => ({ asPercentage: 0 }),
      resize: vi.fn(),
      collapse: vi.fn(),
    };
    openSidebarViewCore(panel, 260, "source-control", "explorer", persist);
    expect(panel.resize).toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith("source-control");
  });
});
