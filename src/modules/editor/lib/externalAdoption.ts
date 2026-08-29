// 返回需要写入视图的目标内容；一致时返回 null（无需 dispatch）。
// 对比对象是"视图当前内容"而非上一次的 value prop——这正是 #988 的修复点：
// prop 未变时视图可能已漂移，必须以视图为准检测差异。
export function pendingExternalAdoption(
  docContent: string,
  viewContent: string,
): string | null {
  return docContent === viewContent ? null : docContent;
}
