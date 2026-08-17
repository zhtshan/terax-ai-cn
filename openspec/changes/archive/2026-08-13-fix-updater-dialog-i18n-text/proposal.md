## Why

更新提示弹窗（`UpdaterDialog.tsx`）在官方更新路径（`status.kind === "available"`）下，说明文字显示的是英文 "See the assets to download and install. Auto-update is built in."，与应用其余部分统一使用中文 i18n 文案的做法不一致。

## What Changes

- `src/modules/updater/UpdaterDialog.tsx` 的 `DialogDescription` 不再优先显示 `update?.body`（GitHub Release 原始英文 release notes），始终使用已存在的中文翻译 `t('updater.newVersionReady')`

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无 —— 纯文案展示修复，不改变对外可观察的行为契约；`.openspec.yaml` 设置 `skip_specs: true`）

## Impact

- 影响文件：`src/modules/updater/UpdaterDialog.tsx`（单文件单行）
- 无接口变更、无新依赖
