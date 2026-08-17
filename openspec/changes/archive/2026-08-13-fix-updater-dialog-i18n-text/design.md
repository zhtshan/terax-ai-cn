## Context

见 proposal.md - Why。`UpdaterDialog.tsx:109` 当前写法：
```js
: update?.body || t('updater.newVersionReady')
```
`update.body` 来自官方 `Update` 对象，取值直接等于 GitHub Release 的 `releaseBody`（`.github/workflows/release.yml:72` 硬编码的英文文案），未做 i18n。

## Goals / Non-Goals

**Goals:**
- 弹窗说明文字始终使用中文本地化文案，不受 GitHub Release notes 原始语言影响

**Non-Goals:**
- 不修改 `.github/workflows/release.yml` 里的 `releaseBody`（该文案是 GitHub Release 页面本身的说明，不是应用内 UI，保留英文不影响本次修复目标）
- 不改动 `manual`（macOS/Linux fallback）分支的文案逻辑，该分支已经用的是 `t('updater.pickDistro', ...)`，本身就是本地化的

## Decisions

**决策：直接改成固定使用 `t('updater.newVersionReady')`**

```js
: t('updater.newVersionReady')
```

`update?.body` 这个数据源本质上是外部（GitHub Release 撰写者）填写的自由文本，语言不受应用控制，不适合直接展示在中文本地化 UI 里；`updater.newVersionReady` 是应用自己维护的翻译 key，语义已经覆盖"有新版本可安装"这个场景，直接替换即可，无需新增翻译 key。

## Risks / Trade-offs

- [风险] 以后如果 GitHub Release notes 里写了重要的版本更新说明，用户在弹窗里将看不到 → [缓解] 弹窗本身有"查看 GitHub"等入口（`AboutSection` 里的"在 GitHub 上查看"按钮）可以看到完整 release notes，弹窗只是提示"有更新"，不承担展示详细更新日志的职责
