import { describe, expect, it } from "vitest";
import { getSourceControlRemoteIndicator } from "./useSourceControl";

const base = {
  hasRepo: true,
  upstream: "origin/main",
  ahead: 0,
  behind: 0,
  busyAction: null,
};

describe("getSourceControlRemoteIndicator", () => {
  it("uses Chinese labels and tooltips for each remote state", () => {
    expect(
      getSourceControlRemoteIndicator({ ...base, behind: 2 }),
    ).toMatchObject({ title: "拉取 2 个远程提交（仅限快进）。" });
    expect(
      getSourceControlRemoteIndicator({ ...base, ahead: 3 }),
    ).toMatchObject({ title: "推送 3 个本地提交。" });
    expect(getSourceControlRemoteIndicator(base)).toEqual({
      visible: true,
      label: "同步",
      title: "获取远程更新。",
      disabled: false,
      action: "fetch",
    });
    expect(
      getSourceControlRemoteIndicator({ ...base, ahead: 1, behind: 1 }),
    ).toMatchObject({
      title: "分支已与上游分叉，请在源代码管理面板或终端中处理。",
    });
  });
});
