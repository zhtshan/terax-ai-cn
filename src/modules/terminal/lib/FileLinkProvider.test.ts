/// <reference types="vitest/globals" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Terminal } from "@xterm/xterm";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { getLspNavigator } from "@/modules/lsp/lib/navigator";
import { leafCwd } from "./useTerminalSession";
import type { FileLinkProviderOptions } from "./FileLinkProvider";
import { registerFileLinkProvider } from "./FileLinkProvider";

vi.mock("@/modules/lsp/lib/navigator", () => ({
  getLspNavigator: vi.fn(() => null),
}));

vi.mock("./useTerminalSession", () => ({
  leafCwd: vi.fn(() => null),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

type MockFn = ReturnType<typeof vi.fn>;

describe("registerFileLinkProvider", () => {
  function makeMockTerm(): {
    term: Terminal;
    getLineMock: MockFn;
    registerLinkProviderMock: MockFn;
  } {
    const getLineMock = vi.fn();
    const registerLinkProviderMock = vi.fn(() => ({ dispose: vi.fn() }));
    const term = {
      buffer: {
        active: {
          getLine: getLineMock,
          length: 10,
          baseY: 0,
          getNullCell: () => ({
            getChars: () => "",
            getWidth: () => 1,
          }),
        },
      },
      rows: 24,
      cols: 80,
      options: {},
      registerLinkProvider: registerLinkProviderMock,
    } as unknown as Terminal;
    return { term, getLineMock, registerLinkProviderMock };
  }

  const baseOptions = {
    getLeafId: () => 1,
    getExplorerRoot: () => "/repo" as string | null,
    getHomeDir: () => "/home/user" as string | null,
  } satisfies FileLinkProviderOptions;

  function mockLineContent(
    getLine: MockFn,
    content: string,
  ): void {
    const lineMock = {
      translateToString: (_rightTrim: boolean) => content,
      isWrapped: false,
      length: content.length,
      getCell: vi.fn(),
    };
    getLine.mockImplementation((idx: number) => {
      if (idx === 0) return lineMock;
      return null;
    });
  }

  function makeClickEvent(props: { ctrlKey?: boolean; metaKey?: boolean } = {}): MouseEvent {
    return Object.assign(
      new Event("click"),
      props,
    ) as unknown as MouseEvent;
  }

  it("registers the provider on the terminal and returns an IDisposable", () => {
    const { term } = makeMockTerm();
    const disposable = registerFileLinkProvider(term, baseOptions);
    expect(term.registerLinkProvider).toHaveBeenCalledTimes(1);
    expect(typeof disposable?.dispose).toBe("function");
    disposable?.dispose();
  });

  it("produces ILink for a valid file path with line number", async () => {
    vi.mocked(leafCwd).mockReturnValue("/repo/src");
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "Building src/app.ts:12 done");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        expect(links).toBeDefined();
        const arr = links as {
          text: string;
          range: { start: { x: number; y: number }; end: { x: number; y: number } };
          decorations?: { underline: boolean; pointerCursor: boolean };
          activate: () => void;
        }[];
        expect(arr.length).toBeGreaterThan(0);
        const link = arr[0]!;
        expect(link.text).toContain("src/app.ts");
        expect(link.decorations?.underline).toBe(true);
        expect(link.decorations?.pointerCursor).toBe(true);
        expect(typeof link.activate).toBe("function");
        resolve();
      });
    });
  });

  it("does not produce links for paths outside workspace", async () => {
    vi.mocked(leafCwd).mockReturnValue("/tmp");
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "cat /etc/passwd");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        expect(links).toBeUndefined();
        resolve();
      });
    });
  });

  it("produces links once the explorer root arrives (lazy root read)", async () => {
    vi.mocked(leafCwd).mockReturnValue("/repo/src");
    let root: string | null = null;
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "src/app.ts");

    registerFileLinkProvider(term, {
      getLeafId: () => 1,
      getExplorerRoot: () => root,
      getHomeDir: () => "/home/user",
    });
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        expect(links).toBeUndefined();
        resolve();
      });
    });

    root = "/repo";
    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as { text: string }[];
        expect(arr.length).toBeGreaterThan(0);
        resolve();
      });
    });
  });

  it("activates a ~/ path by expanding it against home", async () => {
    const navOpenFile = vi.fn();
    vi.mocked(getLspNavigator).mockReturnValue({ openFile: navOpenFile });
    vi.mocked(leafCwd).mockReturnValue("/repo/src");
    vi.mocked(invoke).mockResolvedValue({ kind: "file" });
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "~/repo/src/app.ts");

    registerFileLinkProvider(term, {
      ...baseOptions,
      getExplorerRoot: () => "/home/user/repo",
    });
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as {
          activate: (e: MouseEvent, t: string) => Promise<void>;
        }[];
        const link = arr[0]!;
        link.activate(makeClickEvent({ metaKey: true }), "~/repo/src/app.ts");
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(invoke).toHaveBeenCalledWith(
      "fs_stat",
      expect.objectContaining({ path: "/home/user/repo/src/app.ts" }),
    );
    expect(navOpenFile).toHaveBeenCalledWith("/home/user/repo/src/app.ts", 0);
  });

  it("re-reads cwd on every provideLinks call", async () => {
    vi.mocked(leafCwd)
      .mockReturnValueOnce("/repo/src")
      .mockReturnValueOnce("/outside");
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "src/app.ts");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as { text: string }[];
        expect(arr.length).toBeGreaterThan(0);
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        expect(links).toBeUndefined();
        expect(vi.mocked(leafCwd).mock.calls).toHaveLength(2);
        resolve();
      });
    });
  });

  it("activate only responds to Cmd/Ctrl+click", async () => {
    const navOpenFile = vi.fn();
    vi.mocked(getLspNavigator).mockReturnValue({ openFile: navOpenFile });
    vi.mocked(leafCwd).mockReturnValue("/repo/src");
    vi.mocked(invoke).mockResolvedValue({ kind: "file" });
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "src/app.ts");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as {
          activate: (e: MouseEvent, t: string) => Promise<void>;
        }[];
        const link = arr[0]!;
        // Normal click — no modifier
        link.activate(makeClickEvent(), "src/app.ts");
        expect(navOpenFile).not.toHaveBeenCalled();
        // Ctrl+click
        link.activate(makeClickEvent({ ctrlKey: true }), "src/app.ts");
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(navOpenFile).toHaveBeenCalledWith("/repo/src/src/app.ts", 0);
  });

  it("calls navigator.openFile when fs_stat succeeds with File kind", async () => {
    const navOpenFile = vi.fn();
    vi.mocked(getLspNavigator).mockReturnValue({ openFile: navOpenFile });
    vi.mocked(leafCwd).mockReturnValue("/repo/src");
    vi.mocked(invoke).mockResolvedValue({ kind: "file" });
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "src/app.ts:42");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as {
          activate: (e: MouseEvent, t: string) => Promise<void>;
        }[];
        const link = arr[0]!;
        link.activate(makeClickEvent({ metaKey: true }), "src/app.ts:42");
        // activate is now async — let it resolve
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(invoke).toHaveBeenCalledWith("fs_stat", expect.objectContaining({ path: "/repo/src/src/app.ts" }));
    expect(navOpenFile).toHaveBeenCalledWith("/repo/src/src/app.ts", 42);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows toast.error when fs_stat throws (file not found)", async () => {
    const navOpenFile = vi.fn();
    vi.mocked(getLspNavigator).mockReturnValue({ openFile: navOpenFile });
    vi.mocked(leafCwd).mockReturnValue("/repo/src");
    vi.mocked(invoke).mockRejectedValue(new Error("no such file"));
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "missing/file.ts");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as {
          activate: (e: MouseEvent, t: string) => Promise<void>;
        }[];
        const link = arr[0]!;
        link.activate(makeClickEvent({ ctrlKey: true }), "missing/file.ts");
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(navOpenFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("文件不存在");
  });

  it("shows toast.error and skips navigator when target is a directory", async () => {
    const navOpenFile = vi.fn();
    vi.mocked(getLspNavigator).mockReturnValue({ openFile: navOpenFile });
    vi.mocked(leafCwd).mockReturnValue("/repo/src");
    vi.mocked(invoke).mockResolvedValue({ kind: "dir" });
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "some/file.ts");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as {
          activate: (e: MouseEvent, t: string) => Promise<void>;
        }[];
        const link = arr[0]!;
        link.activate(makeClickEvent({ metaKey: true }), "some/file.ts");
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(invoke).toHaveBeenCalledWith("fs_stat", expect.objectContaining({ path: "/repo/src/some/file.ts" }));
    expect(navOpenFile).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("不能打开目录");
  });

  it("silently ignores activate when navigator is null", async () => {
    const toastErrorSpy = vi.spyOn(toast, "error");
    vi.mocked(getLspNavigator).mockReturnValue(null);
    vi.mocked(leafCwd).mockReturnValue("/repo/src");
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "src/app.ts");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as {
          activate: (e: MouseEvent, t: string) => Promise<void>;
        }[];
        const link = arr[0]!;
        link.activate(makeClickEvent({ ctrlKey: true }), "src/app.ts");
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(toastErrorSpy).not.toHaveBeenCalled();
  });
});
