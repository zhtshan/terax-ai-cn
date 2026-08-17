## Context

`src/modules/updater/useUpdater.ts` 中 `checkLinuxRelease()`（52-82 行）拉取 `GITHUB_TAGS_URL` 返回的 tags 列表，用一段内联排序取出"最新版本"：

```js
const versions = tags.map((t) => t.name).sort((a, b) => {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] !== pb[i]) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
});
const latest = versions[versions.length - 1];
```

`parseVersion(v)` 对不以数字开头的字符串（如仓库里实际存在的 tag `list`）返回空数组 `[]`。此时排序比较器在第一个索引上：判断条件 `pa[i] !== pb[i]` 用的是**原始值**（`pa[0]` 是 `undefined`），但真正参与运算/返回的是**兜底后的值**（`(pa[0] ?? 0) - (pb[0] ?? 0)`）。由于所有真实版本 tag 的首段（major）都是 `0`，`undefined !== 0` 恒为真，进入分支后却算出 `0 - 0 = 0`，比较器把 `list` 和**任意**版本 tag 都判定为"相等"。这是一个非传递（non-transitive）比较器 —— 违反了排序算法要求的总序公理，`Array.prototype.sort` 在这种输入下的最终顺序是未定义行为。经用真实 GitHub tags 数据实测，`list` 被排到了数组末位，取代了真正的最新版本 `v0.8.7` 被选中，进而让 `isNewer("list", "0.8.6")` 因 `list` 解析为空数组（等效于全 0）而返回 `false`，最终 `checkLinuxRelease()` 返回 `null`，App 显示"已是最新版本"。

同一文件里的 `isNewer()`（40-50 行）已经用了正确写法：先各自 `?? 0` 得到 `x`/`y` 再比较——两处逻辑本该一致，`checkLinuxRelease()` 里的内联比较器是唯一遗漏点。

## Goals / Non-Goals

**Goals:**
- 让排序比较器在遇到无法解析出版本号的 tag（`parseVersion` 返回空数组或短于对方的数组）时，稳定地将其视为"更小"，不产生非传递比较。
- 修复后不改变对正常版本号 tag（含 `-N-cn`、`.N-cn` 等历史格式）之间的相对顺序。
- 补充回归测试，覆盖"tags 列表混入非版本号格式字符串"的场景，防止同类 bug 再次引入。

**Non-Goals:**
- 不清理远端仓库里那个误产生的 `list` tag（这是数据层面的操作，不属于代码修复范围，且删除远端 tag 属于有一定影响面的操作，需要用户单独确认执行）。
- 不改动 Windows 路径（官方 `tauri-plugin-updater` + `check()`），该路径未受此 bug 影响。
- 不重构 `parseVersion`/`isNewer` 已有逻辑（这两者本身行为正确，且有既存测试覆盖）。

## Decisions

**决策：统一比较器写法为"先兜底、再比较、再返回"，与 `isNewer()` 保持一致模式**

```js
const versions = tags.map((t) => t.name).sort((a, b) => {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
});
```

已用 Node 脚本对当前仓库真实 tags 数据（含 `list`）验证：修复后 `list` 被排到数组最前（视为最小），`v0.8.7` 正确排到最后被选为 `latest`，`isNewer("v0.8.7", "0.8.6")` 返回 `true`。

**为什么不是过滤掉非版本号 tag（备选方案）**：过滤方案（如 `tags.filter(t => parseVersion(t.name).length > 0)`）同样能解决问题，但需要额外判断"什么才算有效版本号"，且当前 bug 的真正病灶是比较器本身不一致（视觉上和 `isNewer()` 几乎一样却存在细微差异），直接对齐现有正确写法是最小、最直接、风险最低的修复，不引入新的过滤语义。

## Risks / Trade-offs

- [风险] 仓库/远端未来仍可能出现新的非版本号 tag（人为误操作） → [缓解] 修复后的比较器对任意非版本号 tag 都会正确将其排至最前而非破坏排序，不依赖清理远端 tag 才能生效，属于代码层面的根治。
- [风险] 修复本身很小，容易被误判为"不需要测试" → [缓解] 补充回归测试用真实场景（正常版本 tag + 混入非版本号 tag）断言排序结果和 `isNewer` 判定，防止回归。
