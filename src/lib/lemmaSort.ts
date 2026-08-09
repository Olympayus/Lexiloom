// 建议列表排序：精确匹配最前 → 前缀长度升序 → 字母序（searchLemmas 合并两词典源后使用）
export function sortLemmasByRelevance(query: string, lemmas: string[]): string[] {
  const q = query.trim().toLowerCase()
  return [...lemmas].sort((a, b) => {
    const rank = (w: string) => (w.toLowerCase() === q ? 0 : w.length)
    const ra = rank(a)
    const rb = rank(b)
    if (ra !== rb) return ra - rb
    return a.localeCompare(b)
  })
}
