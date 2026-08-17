## 修复方案

### 问题

`src/modules/lsp/lib/client.ts` 中 `gotoDefinition`/`findReferences`/`showResults` 在请求失败或返回空结果时完全静默（无 toast、无日志、无重试提示）。这在 tsserver 项目语义索引尚未完成的窗口期（已实测约需 4~15 秒，取决于项目规模）内表现为"Cmd+点击无反应""Shift-F12 看不到引用次数"，用户无法判断是功能坏了还是需要重试。

### 已排除的方案

在 `presets.ts`/`sessionManager.ts` 中显式注入 `tsserver.path`——协议级探测证实 SDK 自动探测本来就正确（`$/typescriptVersion` 报告 `source: "workspace"`，路径和版本均正确），这个方案不解决问题，故不采用。

### 解决方案

`src/modules/lsp/lib/client.ts` 内 `lspInteractions()` 函数的三处收尾逻辑增加用户可见反馈，复用项目里已有的 `sonner` toast（`sessionManager.ts` 已采用同样的模式）：

1. `gotoDefinition` 的 `catch` 分支：从静默 `return` 改为 `toast.error(...)` 附带错误信息后再 `return`
2. `showResults` 的 `locs.length === 0` 分支上移到调用方（`gotoDefinition`/`findReferences`），改为按各自语境提示"未找到定义"/"未找到引用"，而不是在共用函数里用同一句话
3. `findReferences` 的 `catch` 分支同样改为 `toast.error(...)`

不引入项目加载状态监听或自动重试（那需要处理 `$/typescript/projectLoadingStart`/`Finish` 自定义通知并改动 `transport.ts` 转发逻辑，属于更大改动，超出 hotfix 范围）。用户看到明确的失败提示后，可自行按 F12/Shift-F12 重试，此时 tsserver 项目大概率已完成加载。

### 实现细节

```typescript
// client.ts 顶部新增
import { toast } from "sonner";

// gotoDefinition
const gotoDefinition = async (view: EditorView, pos: number): Promise<void> => {
  let result: DefinitionResult;
  try {
    result = await opts.client.textDocumentDefinition({
      textDocument: { uri: opts.documentUri },
      position: positionAt(view, pos),
    });
  } catch (e) {
    toast.error("Go to definition failed", { description: String(e) });
    return;
  }
  const locs = normalizeLocations(result);
  if (locs.length === 0) {
    toast.info("No definition found");
    return;
  }
  showResults(view, "Definitions", locs);
};

// findReferences
const findReferences = async (view: EditorView, pos: number): Promise<void> => {
  let result: LspLocation[] | null;
  try {
    result = await opts.client.textDocumentReferences({
      textDocument: { uri: opts.documentUri },
      position: positionAt(view, pos),
      context: { includeDeclaration: true },
    });
  } catch (e) {
    toast.error("Find references failed", { description: String(e) });
    return;
  }
  const locs = result ?? [];
  if (locs.length === 0) {
    toast.info("No references found");
    return;
  }
  showResults(view, "References", locs);
};

// showResults 去掉空结果分支（由调用方处理），其余不变
```

### 验证方式

由于无法在无头环境里驱动真实浏览器完成 Cmd+点击，验证分两层：

1. 协议层：复用本次根因排查用的 Node LSP 探测脚本，确认 `definition`/`references` 请求在正常（非空）情况下依旧返回预期结果，未被本次改动破坏
2. 代码层：`pnpm check-types`、`pnpm lint` 通过；人工审查确认三处静默路径已全部替换为 toast 反馈，且不影响非空结果路径的既有行为
