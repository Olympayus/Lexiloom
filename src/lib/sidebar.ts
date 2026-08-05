import type { WordWithPreview } from '../types/word'
import type { Category } from '../types/category'

export type SidebarMode = 'alphabet' | 'category'

export interface LetterGroup {
  letter: string
  words: WordWithPreview[]
}

// 字母模式：按首字母分组，A-Z 排序；非字母按原字符（数字等）
export function groupByLetter(words: WordWithPreview[]): LetterGroup[] {
  const map = new Map<string, WordWithPreview[]>()
  for (const w of words) {
    const letter = w.lemma.trim().charAt(0).toUpperCase() || '#'
    if (!map.has(letter)) map.set(letter, [])
    map.get(letter)!.push(w)
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, list]) => ({ letter, words: list }))
}

export interface CategoryGroup {
  category: Category | null   // null = 未分类
  words: WordWithPreview[]
}

// 分类模式：有词的分类一组（多分类词在各组重复引用），无分类置底部；空分类组不返回
export function groupByCategory(
  words: WordWithPreview[],
  wordCategoryMap: Record<string, string[]>,
  categories: Category[],
): CategoryGroup[] {
  const groups: CategoryGroup[] = categories.map(c => ({ category: c, words: [] }))
  const uncategorized: WordWithPreview[] = []
  for (const w of words) {
    const ids = wordCategoryMap[w.id] || []
    if (ids.length === 0) { uncategorized.push(w); continue }
    for (const id of ids) {
      const g = groups.find(g => g.category?.id === id)
      if (g) g.words.push(w)
    }
  }
  const nonEmpty = groups.filter(g => g.words.length > 0)
  if (uncategorized.length > 0) nonEmpty.push({ category: null, words: uncategorized })
  return nonEmpty
}

// 收起态列表项固定 chrome（镜像 WordListItem 收起态布局）：
// 字母模式：padding 20 + 编织线 3 + gap 20 + 色圈(≤3) 27 = 70px
// 分类模式：padding 16 + 编织线 3 + gap 10 = 29px（居中单词名，无色圈）
export const COLLAPSED_CHROME_ALPHABET = 70
export const COLLAPSED_CHROME_CATEGORY = 29

// D1：收起宽度 = clamp(最长单词渲染宽度 + 实际 chrome, 120px, 240px)
export function fitCollapsedWidth(maxWordWidthPx: number, chromePx: number): number {
  return Math.min(240, Math.max(120, maxWordWidthPx + chromePx))
}

// 用 canvas measureText 测量一组单词的最宽渲染宽度（浏览器环境）
export function measureMaxWordWidth(lemmas: string[], font: string): number {
  if (typeof document === 'undefined') return 0
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return 0
  ctx.font = font
  let max = 0
  for (const lemma of lemmas) max = Math.max(max, ctx.measureText(lemma).width)
  return max
}
