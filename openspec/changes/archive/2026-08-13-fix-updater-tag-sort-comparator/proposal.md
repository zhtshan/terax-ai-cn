## Why

macOS/Linux 用户点击"检查更新"时，即使 GitHub 上已发布更新的版本（如 0.8.7），App 仍会显示"已是最新版本"。已用真实 GitHub Tags API 数据 + 当前代码逻辑实测复现：`checkLinuxRelease()` 里给 tags 排序用的比较器存在逻辑不一致 bug，遇到仓库里一个非版本号格式的 tag（字面量 `list`）时会把排序结果搞乱，导致 `list` 被误判成"最新版本"，从而让真正的更新（v0.8.7）被忽略。

## What Changes

- 修复 `src/modules/updater/useUpdater.ts` 中 `checkLinuxRelease()` 内联排序比较器：统一在比较和取差值前都做 `?? 0` 兜底（与已有的 `isNewer()` 保持一致写法），消除因原始值 `undefined` 与兜底值 `0` 不一致导致的非传递比较问题。
- 修复后，非版本号格式的 tag（如 `list`）会被正确排到最前（视为最小），不会再被误选为"latest"。
- 新增/修正回归测试用例，覆盖"tags 列表中混入非版本号格式 tag"的场景。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

（无 —— 仓库当前没有已归档的 `openspec/specs/` 更新检查能力规格，此改动是纯 bug 修复，不改变对外可观察的需求/验收标准，本 change 的 `.openspec.yaml` 已设置 `skip_specs: true`）

## Impact

- 影响文件：`src/modules/updater/useUpdater.ts`（单文件，`checkLinuxRelease()` 内的排序比较器）
- 影响范围：仅 macOS/Linux 的"检查更新"路径（`IS_LINUX || IS_MAC` 分支）；Windows 走官方 `tauri-plugin-updater` 的 `check()`，不受影响
- 无接口变更、无新依赖、无数据库/配置变更
- 建议后续清理：仓库里存在一个疑似误操作产生的 git tag `list`（推测是 `git tag list` 误输入，本应是 `git tag -l`/`git tag --list`），建议后续手动删除该 tag（需要用户确认后单独执行 push 删除，不在本次代码修复范围内）
