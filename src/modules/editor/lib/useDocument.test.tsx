import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { useDocument } from "./useDocument";

const invoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...a: unknown[]) => invoke(...a),
}));
vi.mock("sonner", () => ({
  toast: { warning: vi.fn(), error: vi.fn() },
}));
vi.mock("@/modules/lsp", () => ({ notifyDocumentSaved: vi.fn() }));
vi.mock("@/modules/workspace", () => ({
  currentWorkspaceEnv: () => ({ kind: "local" }),
}));
vi.mock("@/modules/settings/preferences", () => ({
  usePreferencesStore: Object.assign(
    (selector: (s: { editorAutoSave: boolean; editorAutoSaveDelay: number }) => unknown) =>
      selector({ editorAutoSave: false, editorAutoSaveDelay: 1000 }),
    { getState: () => ({ editorAutoSave: false, editorAutoSaveDelay: 1000 }) },
  ),
}));

type TextResult = { kind: "text"; content: string; size: number; mtime: number };

const text = (content: string, mtime = 100): TextResult => ({
  kind: "text",
  content,
  size: content.length,
  mtime,
});

function mockDisk(next: TextResult, statMtime?: number) {
  invoke.mockImplementation(async (cmd: string) => {
    if (cmd === "fs_read_file") return next;
    if (cmd === "fs_stat")
      return { size: next.size, kind: "file", mtime: statMtime ?? next.mtime };
    if (cmd === "fs_write_file") return statMtime ?? next.mtime;
    return null;
  });
}

function setup(onExternal?: (changed: boolean) => void) {
  return renderHook(() =>
    useDocument({ path: "/w/a.txt", onExternalChange: onExternal }),
  );
}

async function untilReady(h: ReturnType<typeof setup>) {
  await waitFor(() =>
    expect(h.result.current.doc).toMatchObject({ status: "ready" }),
  );
}

describe("useDocument 保存冲突", () => {
  it("磁盘 mtime 变化时保存被拦截并弹出中文冲突 toast", async () => {
    mockDisk(text("A"));
    const h = setup();
    await untilReady(h);
    act(() => {
      h.result.current.onChange("local edit");
    });
    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "fs_stat") return { size: 1, kind: "file", mtime: 200 };
      return null;
    });
    let ok = true;
    await act(async () => {
      ok = await h.result.current.save();
    });
    expect(ok).toBe(false);
    expect(toast.warning).toHaveBeenCalledWith(
      "磁盘上的文件已修改",
      expect.objectContaining({ id: "save-conflict:/w/a.txt" }),
    );
  });
});