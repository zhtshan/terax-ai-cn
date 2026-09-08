import i18next from "i18next";
import { describe, expect, it } from "vitest";

describe("i18n key coverage", () => {
  it("translates shared action keys", () => {
    expect(i18next.t("common.retry")).toBe("重试");
    expect(i18next.t("common.searching")).toBe("搜索中…");
  });

  it("translates the custom provider group title", () => {
    expect(i18next.t("settings.models.custom")).toBe("自定义");
  });
});

describe("sourceControl keys", () => {
  it("translates panel hints and empty states", () => {
    expect(i18next.t("sourceControl.unknownError")).toBe("未知的源代码管理错误");
    expect(i18next.t("sourceControl.statusDeleted")).toBe("已删除");
    expect(i18next.t("sourceControl.statusUntracked")).toBe("未跟踪");
    expect(i18next.t("sourceControl.generateNoStaged")).toBe(
      "请先暂存更改，再生成提交消息",
    );
    expect(i18next.t("sourceControl.generateNoProvider")).toBe(
      "连接 AI 服务商后即可生成提交消息",
    );
    expect(i18next.t("sourceControl.generateBusy")).toBe(
      "请等待当前 AI 操作完成",
    );
    expect(i18next.t("sourceControl.generateReady")).toBe("生成提交消息");
    expect(i18next.t("sourceControl.invalidCommitMessage")).toBe(
      "AI 返回了无效的提交消息，请重试或切换模型。",
    );
    expect(i18next.t("sourceControl.pushNoUpstream")).toBe(
      "请先在终端中配置或发布该分支，然后才能推送。",
    );
    expect(i18next.t("sourceControl.pushBehind")).toBe(
      "请先拉取远程更改，再推送本地提交。",
    );
    expect(
      i18next.t("sourceControl.pushNoCommits", { upstream: "origin/main" }),
    ).toBe("没有可推送到 origin/main 的本地提交。");
    expect(
      i18next.t("sourceControl.pushWill", { upstream: "origin/main" }),
    ).toBe("将推送到 origin/main。");
    expect(i18next.t("sourceControl.stagedEmpty")).toBe("暂存区为空");
    expect(i18next.t("sourceControl.unstagedEmpty")).toBe("没有未暂存的更改");
    expect(
      i18next.t("sourceControl.committed", { sha: "abc1234", summary: "x" }),
    ).toBe("已提交 abc1234 x");
    expect(
      i18next.t("sourceControl.pushedTo", { upstream: "origin/main" }),
    ).toBe("已推送到 origin/main");
    expect(i18next.t("sourceControl.pushCompleted")).toBe("推送完成");
    expect(i18next.t("sourceControl.nothingStaged")).toBe("暂存区没有更改");
    expect(i18next.t("sourceControl.stagedCount", { count: 3 })).toBe(
      "已暂存 3 个文件",
    );
  });

  it("translates statusbar remote action titles", () => {
    expect(i18next.t("sourceControl.divergedTitle")).toBe(
      "分支已与上游分叉，请在源代码管理面板或终端中处理。",
    );
    expect(i18next.t("sourceControl.pullTitle", { count: 2 })).toBe(
      "拉取 2 个远程提交（仅限快进）。",
    );
    expect(i18next.t("sourceControl.pushTitle", { count: 1 })).toBe(
      "推送 1 个本地提交。",
    );
    expect(i18next.t("sourceControl.syncLabel")).toBe("同步");
    expect(i18next.t("sourceControl.syncTitle")).toBe("获取远程更新。");
  });

  it("translates source control status labels", () => {
    expect(i18next.t("sourceControl.statusAdded")).toBe("新增");
    expect(i18next.t("sourceControl.statusModified")).toBe("已修改");
    expect(i18next.t("sourceControl.statusRenamed")).toBe("已重命名");
    expect(i18next.t("sourceControl.statusCopied")).toBe("已复制");
    expect(i18next.t("sourceControl.statusTypeChanged")).toBe("类型变更");
    expect(i18next.t("sourceControl.statusUnmerged")).toBe("未合并");
    expect(i18next.t("sourceControl.statusUnknown", { c: "X" })).toBe("状态 X");
  });
});

describe("ai keys", () => {
  it("covers slash command labels and plan toasts", () => {
    expect(i18next.t("ai.slashCommands.initWorkspace")).toBe("初始化工作区");
    expect(i18next.t("ai.slashCommands.planMode")).toBe("计划模式");
    expect(i18next.t("ai.slashCommands.delegateToClaude")).toBe(
      "委派给 Claude Code",
    );
    expect(i18next.t("ai.slashCommands.planModeOn")).toBe("计划模式已开启");
    expect(i18next.t("ai.slashCommands.planModeOff")).toBe("计划模式已关闭");
    expect(i18next.t("ai.sessions.newChat")).toBe("新对话");
  });

  it("covers attachment chips, stt errors and provider error prefixes", () => {
    expect(i18next.t("ai.composer.editorSelection")).toBe("编辑器选区");
    expect(i18next.t("ai.composer.terminalSelection")).toBe("终端选区");
    expect(i18next.t("ai.customEndpoint")).toBe("自定义端点");
    expect(i18next.t("ai.errors.modelUnavailable")).toBe("模型不可用");
    expect(i18next.t("ai.errors.authFailed")).toBe("认证失败");
    expect(i18next.t("ai.errors.quotaExceeded")).toBe("配额已用尽");
    expect(i18next.t("ai.errors.rateLimited")).toBe("请求过于频繁");
    expect(i18next.t("ai.errors.fallback")).toBe(
      "AI 服务商拒绝了请求。请检查所选模型与服务商设置后重试。",
    );
    expect(i18next.t("ai.errors.transcriptionFailed")).toBe("转录失败");
    expect(i18next.t("ai.errors.micDenied")).toBe("无法访问麦克风");
    expect(
      i18next.t("ai.stt.invalidWhisperUrl", { url: "http://x" }),
    ).toBe("Whisper.cpp 地址无效：http://x");
    expect(i18next.t("ai.stt.whisperLoopbackOnly")).toBe(
      "Whisper.cpp 必须运行在本地回环地址（localhost 或 127.x.x.x）上，以保证转录不出本机。",
    );
    expect(i18next.t("ai.stt.openaiKeyMissing")).toBe("未配置 OpenAI API Key");
    expect(i18next.t("ai.stt.groqKeyMissing")).toBe("未配置 Groq API Key");
  });
});

describe("editor and search keys", () => {
  it("covers editor placeholder, formatter and diff status labels", () => {
    expect(i18next.t("editor.formatFailed", { formatter: "Prettier" })).toBe(
      "Prettier 格式化失败",
    );
    expect(i18next.t("editor.binaryFile")).toBe("二进制文件");
    expect(i18next.t("editor.fileTooLarge")).toBe("文件过大");
    expect(i18next.t("editor.syntaxDisabled")).toBe("语法功能已禁用");
    expect(i18next.t("editor.previewNotSupported")).toBe("暂不支持预览");
    expect(i18next.t("editor.openAnyway")).toBe("仍要打开");
    expect(i18next.t("editor.plainText")).toBe("纯文本");
    expect(i18next.t("editor.formatterLsp")).toBe("语言服务器");
    expect(i18next.t("editor.formatterCustom")).toBe("自定义命令");
    expect(i18next.t("editor.noFormatCommand")).toBe(
      "未在设置中配置自定义格式化命令。",
    );
    expect(i18next.t("editor.cmdClickToOpen")).toBe(
      "按住 Cmd/Ctrl 并点击打开链接",
    );
    expect(i18next.t("aiDiff.pending")).toBe("待审核");
    expect(i18next.t("aiDiff.approved")).toBe("已应用");
    expect(i18next.t("aiDiff.rejected")).toBe("已拒绝");
    expect(i18next.t("aiDiff.toggleDiff")).toBe("展开/收起 Diff");
    expect(i18next.t("aiDiff.reject")).toBe("拒绝");
  });

  it("covers search panel empty states", () => {
    expect(i18next.t("searchPanel.noResults")).toBe("无结果");
    expect(i18next.t("searchPanel.truncated")).toBe("结果已截断");
    expect(i18next.t("common.searching")).toBe("搜索中…");
  });

  it("covers common UI label keys", () => {
    expect(i18next.t("common.breadcrumb")).toBe("面包屑");
    expect(i18next.t("common.more")).toBe("更多");
    expect(i18next.t("common.copy")).toBe("复制");
    expect(i18next.t("common.copyCode")).toBe("复制代码");
    expect(i18next.t("common.contextUsage")).toBe("模型上下文用量");
    expect(i18next.t("common.branchPrevious")).toBe("上一个分支");
    expect(i18next.t("common.branchNext")).toBe("下一个分支");
  });
});

describe("lsp and misc keys", () => {
  it("covers lsp toasts and result panel titles", () => {
    expect(i18next.t("lsp.definitionFailed")).toBe("跳转到定义失败");
    expect(i18next.t("lsp.noDefinition")).toBe("未找到定义");
    expect(i18next.t("lsp.referencesFailed")).toBe("查找引用失败");
    expect(i18next.t("lsp.noReferences")).toBe("未找到引用");
    expect(i18next.t("lsp.definitions")).toBe("定义");
    expect(i18next.t("lsp.references")).toBe("引用");
    expect(
      i18next.t("lsp.spawnFailed", { name: "typescript" }),
    ).toBe("typescript 语言服务器启动失败");
    expect(i18next.t("lsp.stopped", { name: "rust" })).toBe(
      "rust 语言服务器已停止",
    );
    expect(i18next.t("lsp.keepsCrashing", { name: "gopls" })).toBe(
      "gopls 语言服务器反复崩溃",
    );
    expect(i18next.t("lsp.giveUp")).toBe("已放弃此工作区。");
    expect(i18next.t("lsp.exited", { name: "pyright" })).toBe(
      "pyright 语言服务器已退出",
    );
  });

  it("covers chat code, context usage and misc labels", () => {
    expect(i18next.t("ai.chatCode.generating")).toBe("正在生成代码…");
    expect(i18next.t("ai.chatCode.generatingLang", { lang: "Python" })).toBe(
      "正在生成 Python…",
    );
    expect(i18next.t("ai.chatCode.runInTerminal")).toBe("在活动终端运行");
    expect(i18next.t("ai.context.input")).toBe("输入");
    expect(i18next.t("ai.context.output")).toBe("输出");
    expect(i18next.t("ai.context.reasoning")).toBe("推理");
    expect(i18next.t("ai.context.cache")).toBe("缓存");
    expect(i18next.t("gitHistory.viewOnHost", { host: "GitHub" })).toBe(
      "在 GitHub 上查看",
    );
    expect(i18next.t("tabs.historyBranch", { branch: "main" })).toBe(
      "历史 · main",
    );
    expect(i18next.t("tabs.gitHistory")).toBe("Git 历史");
    expect(i18next.t("statusbar.noSubfolders")).toBe("无子文件夹");
    expect(i18next.t("statusbar.showHiddenFolders")).toBe("显示隐藏文件夹");
    expect(i18next.t("searchPanel.replaceEmpty")).toBe("替换内容为空");
    expect(i18next.t("searchPanel.replaceFailed")).toBe("替换失败");
    expect(
      i18next.t("explorer.copyFailed", { detail: "denied" }),
    ).toBe("复制失败：denied");
    expect(i18next.t("preview.title")).toBe("预览");
    expect(i18next.t("terminal.closePane")).toBe("关闭面板");
    expect(i18next.t("window.settingsTitle")).toBe("设置");
  });
});

describe("settings and theme keys", () => {
  it("covers provider descriptions and model hints", () => {
    expect(i18next.t("settings.models.mlxDesc")).toBe(
      "通过 mlx_lm.server（pip install mlx-lm）在 Apple 芯片上本地推理。",
    );
    expect(i18next.t("settings.models.ollamaDesc")).toBe(
      "通过 Ollama 内置的 OpenAI 兼容 API 使用本地模型。",
    );
    expect(i18next.t("settings.models.openrouterDesc")).toBe(
      "OpenRouter 上的任意模型 — 输入完整的 provider/model id。",
    );
    expect(i18next.t("settings.models.localLmstudioDesc")).toContain("LM Studio");
    expect(i18next.t("settings.models.openaiCompatDesc")).toContain("OpenAI");
    expect(i18next.t("settings.models.lmstudioModelHint")).toContain(
      "/v1/models",
    );
    expect(i18next.t("settings.models.mlxModelHint")).toContain("mlx_lm.server");
    expect(i18next.t("settings.models.ollamaModelHint")).toContain("ollama list");
    expect(i18next.t("settings.models.openrouterModelHint")).toContain(
      "openrouter.ai/models",
    );
  });

  it("covers shell descriptions and theme validation errors", () => {
    expect(i18next.t("settings.general.shellNoBlocks")).toBe(
      "此 Shell 不支持命令块与目录跟踪。",
    );
    expect(i18next.t("settings.general.shellWsl")).toContain("WSL");
    expect(i18next.t("settings.general.shellDefault")).toContain("Shell");
    expect(i18next.t("settings.themes.starterName")).toBe("我的主题");
    expect(i18next.t("settings.themes.starterDesc")).toBe("自定义主题。");
    expect(i18next.t("settings.themes.bgStorageFull")).toContain("存储空间不足");
    expect(i18next.t("settings.themes.bgNotImage")).toBe("这不是图片文件。");
    expect(
      i18next.t("settings.themes.bgTooLargeAnimated", { limit: 8, size: "9 MB" }),
    ).toContain("动图");
    expect(i18next.t("settings.themes.bgTooLargeStatic", { limit: 8, size: "9 MB" })).toContain(
      "图片最大",
    );
    expect(i18next.t("settings.themes.bgDecodeFailed")).toContain("无法解码");
    expect(i18next.t("settings.themes.importNotObject")).toBe("主题必须是 JSON 对象");
    expect(i18next.t("settings.themes.importIdInvalid")).toContain("kebab-case");
    expect(i18next.t("settings.themes.importNameRequired")).toContain("name");
    expect(i18next.t("settings.themes.importVariantsObject")).toContain("variants");
    expect(i18next.t("settings.themes.importVariantsRequired")).toContain("light");
    expect(i18next.t("settings.themes.vObject", { path: "variants.light" })).toBe(
      "variants.light 必须是对象",
    );
    expect(i18next.t("settings.themes.vString", { path: "v.background" })).toBe(
      "v.background 必须是字符串",
    );
    expect(i18next.t("settings.themes.vNonEmptyString", { path: "colors.bg" })).toBe(
      "colors.bg 必须是非空字符串",
    );
    expect(
      i18next.t("settings.themes.vColorKey", { path: "colors", key: "nope" }),
    ).toContain("无法识别的颜色键");
    expect(i18next.t("settings.themes.vAnsiArray", { path: "t.ansi" })).toContain("16");
  });
});

describe("terax error code keys", () => {
  it("translates terax fs error codes", () => {
    expect(i18next.t("terax.fs_not_a_directory", { rest: "/tmp/x" })).toBe("不是目录：/tmp/x");
    expect(i18next.t("terax.fs_not_found", { rest: "foo.txt" })).toBe("未找到：foo.txt");
    expect(i18next.t("terax.pty_no_session")).toBe("PTY 会话不存在");
    expect(i18next.t("terax.git_command_failed", { rest: "git log" })).toBe("命令执行失败：git log");
  });

  it("terax error codes exist in both locales", () => {
    const en = i18next.getResourceBundle("en", "translation") as Record<string, Record<string, unknown>>;
    const zh = i18next.getResourceBundle("zh-CN", "translation") as Record<string, Record<string, unknown>>;
    const codes = Object.keys(en.terax ?? {});
    expect(codes.length).toBeGreaterThan(50);
    for (const c of codes) {
      expect(zh.terax).toHaveProperty(c);
    }
  });
});
