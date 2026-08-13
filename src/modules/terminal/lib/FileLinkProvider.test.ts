/// <reference types="vitest/globals" />
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Terminal } from "@xterm/xterm";
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
    explorerRoot: "/repo",
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
        // undefined when no links match — that's the expected behavior
        expect(links).toBeUndefined();
        resolve();
      });
    });
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
        // undefined because cwd changed to /outside
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
    const { term, getLineMock } = makeMockTerm();
    mockLineContent(getLineMock, "src/app.ts");

    registerFileLinkProvider(term, baseOptions);
    const call = vi.mocked(term.registerLinkProvider).mock.calls[0]![0];
    const provider = call as {
      provideLinks: (y: number, cb: (links: unknown[]) => void) => void;
    };

    await new Promise<void>((resolve) => {
      provider.provideLinks(1, (links) => {
        const arr = links as { activate: (e: MouseEvent, t: string) => void }[];
        const link = arr[0]!;
        // Normal click — no modifier
        link.activate(makeClickEvent(), "src/app.ts");
        expect(navOpenFile).not.toHaveBeenCalled();
        // Ctrl+click
        link.activate(makeClickEvent({ ctrlKey: true }), "src/app.ts");
        expect(navOpenFile).toHaveBeenCalledWith("/repo/src/src/app.ts", 0);
        resolve();
      });
    });
  });
});
