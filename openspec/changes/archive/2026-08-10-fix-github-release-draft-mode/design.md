## 修复方案

将 `.github/workflows/release.yml` 第 70 行的 `releaseDraft: true` 改为 `releaseDraft: false`。

tauri-action 在 `releaseDraft: true` 时创建 GitHub draft release，草稿 release：
1. 对仓库协作者以外不可见
2. 每次 workflow run 会更新同一草稿，可能丢失之前上传的资产
3. 需要手动 publish 才能对外可见

改为 `releaseDraft: false` 后，tauri-action 直接创建已发布的 release，所有平台构建产物自动关联并对外可见。

## 根因验证

- 当前 GitHub API 返回 0 个 release（全部为草稿或已被删除）
- workflow_dispatch 触发的 release 流程在 2026-07-29 成功运行，但创建的是 draft
- v0.8.5.1-cn 的 workflow run 也成功，但同样是 draft
