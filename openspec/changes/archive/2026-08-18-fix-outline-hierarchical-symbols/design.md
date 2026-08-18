## Context

大纲 UI 已具备树形渲染与折叠能力，缺的是上游数据：LSP 返回的符号是扁平的，`OutlineItem.level` 恒为 1。修复点在 LSP 客户端握手与结果归一化两处。

## Goals / Non-Goals

- Goals：让 `normalizeDocumentSymbols` 产出真实的 `level` 层级，使既有树形与折叠 UI 生效
- Non-Goals：不改动 `OutlineSection` 的渲染与折叠逻辑（已验证正确）；不引入大纲搜索、排序、符号过滤等新功能

## Decisions

### 决策 1：在客户端 initialize 声明 hierarchicalDocumentSymbolSupport

`TeraxLspClient.getInitializeParams()` 已经是覆盖底层库默认 capabilities 的既定位置（现有的 `publishDiagnostics`、`references` 就是这么补的），沿用同一模式：

```ts
documentSymbol: {
  hierarchicalDocumentSymbolSupport: true,
  symbolKind: { valueSet: [...1..26] },
},
```

`symbolKind.valueSet` 显式列出 LSP 3.17 的 1..26，与 `symbolKindIcons.ts` 的映射范围对齐——不声明时服务器只能假定客户端支持 1..17（LSP 1.x 集合），会把 Object/Key/EnumMember 等新 kind 降级。

替代方案「在 Rust 侧代理时改写 initialize」被否：LSP 握手参数属于前端客户端职责，Rust 侧只做管道转发，改写会把协议知识泄漏到传输层。

### 决策 2：扁平结果用 containerName 兜底推断层级

规范允许服务器忽略该 capability 继续返回 `SymbolInformation[]`（老服务器、部分社区实现）。此时 `SymbolInformation.containerName` 是唯一可用的父子线索。兜底规则：

- 按 line 排序后，若某符号的 `containerName` 等于此前某个符号的 `name`，则 level = 该父符号 level + 1
- 匹配不到（containerName 为空、或指向文件名/模块名）时 level = 1
- 只做单层名字匹配，不做跨作用域消歧——重名场景取最近的前驱，宁可少一层缩进也不错挂父子

这是尽力而为的降级路径，不是主路径；主路径仍是层级 `DocumentSymbol[]`。

## Risks / Trade-offs

- 声明 hierarchical 后返回结构变化，`normalizeDocumentSymbols` 的两个分支都需要单测覆盖，避免只测到其中一条
- 条目数会变少（顶层符号数），用户视觉上「大纲变短了」——这是预期行为，子符号在展开后可见，且默认全展开
