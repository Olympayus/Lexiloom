const CJK_RE = /[㐀-䶿一-鿿豈-﫿]/

export function isChineseQuery(query: string): boolean {
  return CJK_RE.test(query)
}

export function rankChineseResults(
  rows: Array<{ word: string; translation: string }>,
  query: string
): string[] {
  const q = query.trim()
  if (!q) return []
  return [...new Set(
    rows
      .filter(r => r.translation.includes(q))
      .map(r => ({
        word: r.word,
        idx: r.translation.indexOf(q),
        exact: r.translation.trim() === q,
      }))
      .sort((a, b) =>
        (b.exact ? 1 : 0) - (a.exact ? 1 : 0) ||
        a.idx - b.idx ||
        a.word.length - b.word.length
      )
      .map(s => s.word)
  )].slice(0, 20)
}
