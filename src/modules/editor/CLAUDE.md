# 编辑器细节

- **缓冲 EOL**：LF 内部，保存时恢复原始 EOL（多数投票检测）
- **缩进单位**：per-file 检测，支持 compartment 动态切换
- **冲突检查**：写入前对比 mtime，不一致→警告 toast（显式 Overwrite）
- **文件大小**：>10 MB 提示"继续打开"，>50 MB 硬上限
- **格式化**：支持 biome/prettier/ruff/rustfmt/gofmt/clang-format/shfmt/zig fmt + 自定义 `{file}` 模板
- **AI 补全**：缓冲缩进单位随请求发送，响应规范化 tab/space 混用、多行 ghost 带块级 widget、closer-only 行隐藏重排
