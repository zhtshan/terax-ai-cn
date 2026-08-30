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
    (
      selector: (s: {
        editorAutoSave: boolean;
        editorAutoSaveDelay: number;
      }) => unknown,
    ) => selector({ editorAutoSave: false, editorAutoSaveDelay: 1000 }),
    { getState: () => ({ editorAutoSave: false, editorAutoSaveDelay: 1000 }) },
  ),
}));

type TextResult = {
  kind: "text";
  content: string;
  size: number;
  mtime: number;
};

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

describe("useDocument 外部变更检测", () => {
  it("dirty 时 reload 被跳过，磁盘内容与基线不同则上抛外部变更", async () => {
    mockDisk(text("A"));
    const onExternal = vi.fn();
    const h = setup(onExternal);
    await untilReady(h);
    mockDisk(text("B", 200));
    act(() => {
      h.result.current.onChange("local edit");
    });
    let skipped = true;
    await act(async () => {
      skipped = h.result.current.reload();
    });
    expect(skipped).toBe(false);
    await waitFor(() => expect(onExternal).toHaveBeenCalledWith(true));
    expect(onExternal).toHaveBeenCalledTimes(1);
  });

  it("dirty 时 reload 被跳过，磁盘内容与基线相同则不上抛", async () => {
    mockDisk(text("A"));
    const onExternal = vi.fn();
    const h = setup(onExternal);
    await untilReady(h);
    act(() => {
      h.result.current.onChange("local edit");
    });
    let skipped = true;
    await act(async () => {
      skipped = h.result.current.reload();
    });
    expect(skipped).toBe(false);
    await act(async () => {});
    expect(onExternal).not.toHaveBeenCalled();
  });

  it("clean 时 reload 正常采用磁盘内容且不上抛", async () => {
    mockDisk(text("A"));
    const onExternal = vi.fn();
    const h = setup(onExternal);
    await untilReady(h);
    mockDisk(text("B", 200));
    let skipped = true;
    await act(async () => {
      skipped = h.result.current.reload();
    });
    expect(skipped).toBe(true);
    await waitFor(() =>
      expect(h.result.current.doc).toMatchObject({
        status: "ready",
        content: "B",
      }),
    );
    expect(h.result.current.dirty).toBe(false);
    expect(onExternal).not.toHaveBeenCalled();
  });

  it("reload 读取期间转 dirty 且磁盘不同则上抛外部变更", async () => {
    mockDisk(text("A"));
    const onExternal = vi.fn();
    const h = setup(onExternal);
    await untilReady(h);
    let resolveRead: ((r: TextResult) => void) | undefined;
    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "fs_read_file")
        return new Promise<TextResult>((res) => {
          resolveRead = res;
        });
      return null;
    });
    let skipped = true;
    await act(async () => {
      skipped = h.result.current.reload();
    });
    expect(skipped).toBe(true);
    act(() => {
      h.result.current.onChange("local edit");
    });
    await act(async () => {
      resolveRead?.(text("B", 200));
    });
    await waitFor(() => expect(onExternal).toHaveBeenCalledWith(true));
  });

  it("discardAndReload 放弃本地修改采用磁盘版本并清标记", async () => {
    mockDisk(text("A"));
    const onExternal = vi.fn();
    const h = setup(onExternal);
    await untilReady(h);
    mockDisk(text("B", 200));
    act(() => {
      h.result.current.onChange("local edit");
    });
    await act(async () => {
      h.result.current.reload();
    });
    await waitFor(() => expect(onExternal).toHaveBeenCalledWith(true));
    await act(async () => {
      h.result.current.discardAndReload();
    });
    await waitFor(() =>
      expect(h.result.current.doc).toMatchObject({
        status: "ready",
        content: "B",
      }),
    );
    expect(h.result.current.dirty).toBe(false);
    await waitFor(() => expect(onExternal).toHaveBeenCalledWith(false));
  });

  it("保存成功后清除外部变更标记", async () => {
    mockDisk(text("A"));
    const onExternal = vi.fn();
    const h = setup(onExternal);
    await untilReady(h);
    // Coarse mtime granularity: disk content diverged while mtime stayed put,
    // so content detection flags it and the save guard still lets the write
    // through.
    mockDisk(text("B", 100));
    act(() => {
      h.result.current.onChange("local edit");
    });
    await act(async () => {
      h.result.current.reload();
    });
    await waitFor(() => expect(onExternal).toHaveBeenCalledWith(true));
    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "fs_stat") return { size: 1, kind: "file", mtime: 100 };
      if (cmd === "fs_write_file") return 300;
      return null;
    });
    let ok = false;
    await act(async () => {
      ok = await h.result.current.save();
    });
    expect(ok).toBe(true);
    await waitFor(() => expect(onExternal).toHaveBeenCalledWith(false));
  });

  it("acknowledgeExternalChange 清除标记且后续变更可重新上抛", async () => {
    mockDisk(text("A"));
    const onExternal = vi.fn();
    const h = setup(onExternal);
    await untilReady(h);
    mockDisk(text("B", 200));
    act(() => {
      h.result.current.onChange("local edit");
    });
    await act(async () => {
      h.result.current.reload();
    });
    await waitFor(() => expect(onExternal).toHaveBeenCalledWith(true));
    await act(async () => {
      h.result.current.acknowledgeExternalChange();
    });
    await waitFor(() => expect(onExternal).toHaveBeenCalledWith(false));
    mockDisk(text("C", 300));
    await act(async () => {
      h.result.current.reload();
    });
    await waitFor(() => expect(onExternal).toHaveBeenCalledTimes(3));
    expect(onExternal).toHaveBeenLastCalledWith(true);
  });

  it("dirty 时 reload 读取失败补 warn 日志且不破坏文档状态", async () => {
    mockDisk(text("A"));
    const h = setup();
    await untilReady(h);
    act(() => {
      h.result.current.onChange("local edit");
    });
    invoke.mockImplementation(async (cmd: string) => {
      if (cmd === "fs_read_file") throw new Error("ENOENT");
      return null;
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let skipped = true;
    await act(async () => {
      skipped = h.result.current.reload();
    });
    expect(skipped).toBe(false);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        "[editor] reload failed",
        "/w/a.txt",
        expect.any(Error),
      ),
    );
    warn.mockRestore();
    expect(h.result.current.doc).toMatchObject({ status: "ready" });
  });
});
