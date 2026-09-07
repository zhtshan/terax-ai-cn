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
});
