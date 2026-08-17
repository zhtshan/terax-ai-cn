## Why

以编辑器模式打开 `.tsx` 文件时，LSP 无法解析 TypeScript 符号（引用次数、跳转定义），因为 `typescript-language-server` 找不到项目本地的 TypeScript SDK。pnpm 的虚拟存储结构导致默认查找路径失效，服务器使用不匹配的 TS 版本或完全找不到 SDK。

## What Changes

- 在 TypeScript LSP preset 中添加 `tsserver.path` 初始化选项，指向项目本地 TypeScript SDK
- 在 `sessionManager.ts` 中动态计算 TS SDK 路径（基于 workspace 根目录）
- 将计算出的 SDK 路径注入到 LSP 客户端的初始化选项中

## Capabilities

### New Capabilities
- `typescript-lsp-sdk`: TypeScript LSP 正确定位本地 TypeScript SDK，支持 TSX 文件符号解析

### Modified Capabilities
<!-- None -->

## Impact
- `src/modules/lsp/lib/presets.ts` — TypeScript preset 添加 `tsserver.path`
- `src/modules/lsp/lib/sessionManager.ts` — 动态计算 TS SDK 路径并注入
- 影响范围：仅 TypeScript/TSX 文件的 LSP 功能
