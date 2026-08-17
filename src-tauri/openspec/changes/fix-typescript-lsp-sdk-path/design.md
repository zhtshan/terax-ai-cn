## 修复方案

### 问题
`typescript-language-server` 在 pnpm 环境中无法找到项目本地的 TypeScript SDK，导致 TSX 文件的 LSP 功能（引用次数、跳转定义）失效。

### 解决方案
1. 在 `sessionManager.ts` 中动态计算 workspace 的 TS SDK 路径
2. 将 SDK 路径注入到 LSP 客户端初始化选项的 `tsserver.path`

### 实现细节

**sessionManager.ts**
```typescript
const launchDir = getLaunchDir() ?? managed.root;
const tsSdkPath = path.join(launchDir, "node_modules", "typescript", "lib");

// 注入到初始化选项
initializationOptions: {
  ...(preset.initializationOptions ?? {}),
  tsserver: { path: tsSdkPath },
},
```
