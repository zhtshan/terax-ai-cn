# Design: VS Code 风格内容搜索

> 高层架构决策。本文件不替代 Superpowers Design Doc（design 阶段会产出 `docs/superpowers/specs/YYYY-MM-DD-vscode-style-content-search-design.md`，归档时同步）。

## 1. 总体数据流

```
┌────────────────────────────────────────────────────────────────────┐
│  Left Sidebar: Search Panel                                       │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ [Search input ▾]  [Replace input ▾]  [Aa] [ab] [.*] [...]    │ │
│  │ include: [______]  exclude: [______]    files: N  matches: M  │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ ▾ src/app/App.tsx (3)                                         │ │
│  │   12 │ const fn = () => ...test...                            │ │
│  │   47 │ // test this case                                     │ │
│  │ ▸ src/modules/explorer/ExplorerSearch.tsx (1)                │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │ [Preview affected files: N files, M matches]   [Replace All] │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
        │ invoke('fs_search_content', { ... })             ▲
        │ invoke('fs_replace_all',   { ... })             │ UI events
        ▼                                                  │
┌────────────────────────────────────────────────────────────────────┐
│  Rust IPC (src-tauri/src/modules/fs/grep.rs)                       │
│   fs_search_content(pattern, root, regex, ci, whole_word,          │
│                      include, exclude, max_results)                │
│     → 复用 search_tree + ContentSearchState 自取消                 │
│   fs_replace_all(pattern, replacement, root, regex, ci,            │
│                   whole_word, include, exclude)                    │
│     → 内部搜索 + 原子写（临时文件 + rename）                       │
│     → 复用 secret-path deny-list + workspace 鉴权                  │
└────────────────────────────────────────────────────────────────────┘
```

## 2. IPC 命令设计

### 2.1 `fs_search_content`

| 字段 | 类型 | 说明 |
|---|---|---|
| `pattern` | string | 搜索词；regex=true 时按正则解析，否则按字面量（自动 escape） |
| `root` | string | 搜索根路径 |
| `regex` | bool | 是否按正则（默认 false） |
| `case_sensitive` | bool | 大小写敏感（默认 smart-case；false 时仍受 smart-case 启发式） |
| `whole_word` | bool | 全字匹配 |
| `include` | string? | 单个 glob（不含逗号分隔，避免 UI 复杂度） |
| `exclude` | string? | 单个 glob |
| `max_results` | usize? | 默认 20000（提升自 2000） |

实现要点：

- 复用 `search_tree`（`grep.rs:68`），但加 `whole_word` 处理：
  - regex=false + whole_word → 用 `\b{escape_literal(p)}\b` 构造 matcher
  - regex=true + whole_word → 用户自行写 `\b...\b`，后端不处理（前端 hint 提示）
- `include` 走现有 `GlobSet` 路径（`grep.rs:43`），`exclude` 走现有 `WalkBuilder::ignore` 的自定义 skip（需新增 `filter_entry` 判断）

### 2.2 `fs_replace_all`

| 字段 | 类型 | 说明 |
|---|---|---|
| `pattern` / `replacement` | string | 同上语义 |
| `regex` / `case_sensitive` / `whole_word` | bool | 同上 |
| `root` / `include` / `exclude` | string? | 同上 |

返回：

```rust
struct ReplaceResponse {
  files_changed: Vec<ReplaceFileResult>,
  total_replacements: usize,
  truncated: bool, // 命中已达 max_results 时为 true
}
struct ReplaceFileResult {
  path: String,    // 绝对路径
  replacements: usize, // 该文件的替换次数
}
```

实现要点：

- 在内部以相同的 search 流程找命中（复用同一套 matcher / include / exclude），但**只保留每行第一个匹配**（避免一行多次替换导致偏移错乱）
- 对每个文件：读取内容 → 构造新内容（行级替换） → **原子写**（临时文件 + rename），路径解析与 secret-path 检查走 `fs::file::fs_write_file` 已有的鉴权链路
- 错误策略：任一文件写失败 → 中止并返回部分结果 + 错误列表（不静默成功部分）

## 3. 前端模块结构

```
src/modules/search/
├── index.ts                       # 导出 SearchPanel + 公共类型
├── SearchPanel.tsx                # 主面板：输入行 + 结果列表 + 替换条
├── SearchInput.tsx                # 搜索 + 替换输入框 + 三件套开关 + include/exclude
├── SearchResults.tsx              # 按文件分组的结果列表（虚拟滚动可选；先 plain）
├── ReplaceAffectedBar.tsx         # "将修改 N 个文件 / M 个匹配" + Replace All 按钮
├── hooks/
│   ├── useSearchRun.ts            # 防抖 + generation 自取消的 search 调用
│   └── useReplaceRun.ts           # replace 状态机（idle / previewing / running / done / error）
├── lib/
│   ├── mode.ts                    # 输入选项类型 + 序列化到 IPC payload
│   └── highlight.ts               # 行内命中片段高亮（基于 query 切分）
└── styles.css                     # 局部样式（如果需要）
```

## 4. 关键设计取舍

| 决策 | 选择 | 理由 |
|---|---|---|
| 替换粒度 | Replace All | 用户明确要求；VS Code 也提供 Replace All 入口 |
| 前端是否参与 regex 拼装 | 否 | 用户输入原样下发，避免前端 escape 出错导致行为不一致 |
| `whole_word` 实现位置 | 后端 | 前端不组装 regex，集中在一个地方实现边界匹配 |
| include/exclude 是数组还是单值 | 单值 | VS Code 默认单值；UI 更简单 |
| 替换的二次确认 | 仅"显示文件清单" | 用户明确不要弹确认 |
| 跨平台 ripgrep | 不引入 | 现有 `grep-*` crates 性能已足够；零外部依赖 |
| 后端是否流式推 | 暂不 | 同步阻塞调用足够；Tauri `spawn_blocking` 不强求 |
| 20000 上限的内存压力 | 接受 | ~4 MB 单次峰值，对端侧无害 |

## 5. 与现有能力的复用

| 复用 | 位置 |
|---|---|
| 搜索 walker + 自取消 generation | `grep.rs:68-170`, `grep.rs:215-252` |
| Glob 文件过滤 | `grep.rs:43-54`, `grep.rs:117-121` |
| 工作区鉴权 + secret-path 拒绝 | `src-tauri/src/modules/workspace/`, `fs::file::*` |
| 原子写文件 | 需核实 `fs::file::fs_write_file`；若没有 → 本次补 |
| Command Palette 弹窗 | `CommandPalette.tsx` 保留 `#` 模式，移除 UI 开关 |

## 6. 不在本次范围

- 单条 Accept/Reject
- 搜索历史持久化
- 跨工作区（multi-root）
- 二级搜索（首次结果里再搜）
- 全局快捷键 `Cmd+Shift+H`（panel open/close toggle）— 仅做 `Cmd+Shift+F` 打开并聚焦