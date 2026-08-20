## 任务清单

- [x] 创建 `src/modules/explorer/lib/useFileClipboard.ts` hook，管理复制/剪切状态（paths + mode）
- [ ] 在 `src/modules/explorer/FileTreeSection.tsx` 右键菜单添加"复制"和"剪切"菜单项
- [ ] 在 `src/modules/explorer/FileTreeSection.tsx` 右键菜单添加"粘贴"菜单项（仅剪贴板非空时显示）
- [ ] 粘贴操作调用 `invoke("fs_copy")` 将文件复制到目标文件夹
- [ ] 剪切操作在 `TreeRow` 中添加虚化视觉标记（opacity-50）
- [ ] 粘贴成功后刷新文件树（调用 tree.refresh）
- [ ] 添加翻译键（explorer.copyFile / explorer.cutFile / explorer.paste）
