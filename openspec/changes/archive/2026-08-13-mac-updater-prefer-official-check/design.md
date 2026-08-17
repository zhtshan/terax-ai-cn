## Context

见 proposal.md - Why。当前 `runCheck()`（`useUpdater.ts:109-136`）用 `IS_LINUX || IS_MAC` 把 mac 和 linux 归为同一条 fallback 路径，Windows 单独走官方 `check()`。

## Goals / Non-Goals

**Goals:**
- macOS 生产（CI 签名）构建优先使用官方 `check()`，获得和 Windows 一致的应用内静默下载安装体验
- macOS 本地未签名 dev 构建等官方 `check()` 失败的场景，无缝降级到现有的 `checkLinuxRelease()` 手动流程，不引入新的错误状态
- 不改变 Linux、Windows 现有行为

**Non-Goals:**
- 不改变 `UpdaterStatus` 类型或任何 UI 组件
- 不处理"官方 check() 成功但 install() 失败"这类下游场景（该场景已有既存的 `install()` 错误处理，不受本次改动影响）
- 不为 macOS 单独做"是否是生产签名构建"的显式探测（如读取代码签名信息）——直接尝试官方 `check()`，用真实调用结果（成功/异常）作为判断依据，比额外做环境探测更简单可靠

## Decisions

**决策：mac 分支用 try/catch 包裹官方 `check()`，catch 内 fallback 到 `checkLinuxRelease()`**

```js
const applyOfficial = (update: Update | null) => {
  if (update) {
    setStatus({ kind: "available", update });
  } else {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    setStatus({ kind: "uptodate" });
  }
};
const applyManual = (info: ManualUpdateInfo | null) => {
  if (info) {
    setStatus({ kind: "manual-available", info });
  } else {
    localStorage.setItem(LAST_CHECK_KEY, String(Date.now()));
    setStatus({ kind: "uptodate" });
  }
};

try {
  if (IS_LINUX) {
    applyManual(await checkLinuxRelease());
    return;
  }
  if (IS_MAC) {
    try {
      applyOfficial(await check());
    } catch {
      applyManual(await checkLinuxRelease());
    }
    return;
  }
  applyOfficial(await check());
} catch (err) {
  setStatus({ kind: "error", message: String(err) });
}
```

- 内层 `try/catch` 只吞掉官方 `check()` 的异常，转而尝试 `checkLinuxRelease()`；如果 fallback 本身也抛异常，会正常冒泡到外层 `catch`，呈现 `error` 状态——不会静默吞掉真正的网络/API 故障。
- `applyOfficial`/`applyManual` 消除了原本 Windows 路径和 Linux 路径里重复的"设置状态 + 写节流时间戳"代码，mac 分支复用这两个 helper，不引入第三套状态处理逻辑。

**为什么不显式探测"是否生产签名构建"（备选方案）**：可以考虑读取 app 的代码签名信息或某个 build-time 常量来判断，但 Tauri 官方 updater 本身已经具备"没有可用更新后端就抛错"的行为，直接 try/catch 复用这个信号最简单、最不容易与实际运行时状态脱节（不需要维护一个额外的"什么算生产构建"的判断逻辑）。

## Risks / Trade-offs

- [风险] macOS 生产版本改为静默下载安装 + 自动重启，是一个用户可见的行为变化（原来是"跳转浏览器手动下载"）→ [缓解] 复用 Windows 已验证过的 `install()`/`downloadAndInstall()`/`relaunch()` 路径和既有 UI（`UpdaterDialog` 已有"稍后"/"立即安装重启"按钮，用户仍可选择暂缓），不是强制静默重启
- [风险] 如果官方 `check()` 在某些边缘场景下"部分失败"（比如超时而不是直接抛错）→ [缓解] `@tauri-apps/plugin-updater` 的 `check()` 对网络错误统一走 Promise rejection，不存在"部分失败"的中间态，try/catch 能完整覆盖
- [风险] catch 掉官方 `check()` 异常后可能掩盖生产环境真实的网络故障（本该提示"检查失败"却显示"手动下载可用"或"已最新"）→ [缓解] 这是可接受的降级：即使掩盖了具体错误类型，用户仍能通过 fallback 路径查到是否有新版本，不会比现状(macOS 上一直如此) 更差；且 fallback 路径本身若失败仍会正确冒泡为 `error` 状态
