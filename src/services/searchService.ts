import { EcdictProvider } from '../providers/ecdict'
import { WordNetProvider } from '../providers/wordnet'
import type { DictionaryEntry } from '../types/dictionary'
import { vocabularySearch } from '../lib/search'
import type { Word } from '../types/word'

const ecdict = new EcdictProvider()
const wordnet = new WordNetProvider()

export async function searchVocabulary(query: string): Promise<Word[]> {
  return vocabularySearch(query)
}

// 阶段一：模糊匹配返回单词建议
export async function searchLemmas(query: string): Promise<string[]> {
  if (!query.trim()) return []
  const [ecdictResults, wordnetResults] = await Promise.all([
    ecdict.searchLemmas(query),
    wordnet.searchLemmas(query),
  ])
  const seen = new Set<string>()
  return [...ecdictResults, ...wordnetResults].filter(w => {
    if (seen.has(w)) return false
    seen.add(w)
    return true
  }).slice(0, 20)
}

// 阶段二：精确查询单词详情
export async function lookupWord(word: string): Promise<{ source: string; entries: DictionaryEntry[] }[]> {
  if (!word.trim()) return []
  const normalized = word.toLowerCase().trim()
  const [ecdictEntries, wordnetEntries] = await Promise.all([
    ecdict.lookup(normalized),
    wordnet.lookup(normalized),
  ])
  const results: { source: string; entries: DictionaryEntry[] }[] = []
  if (ecdictEntries.length > 0) results.push({ source: 'ecdict', entries: ecdictEntries })
  if (wordnetEntries.length > 0) results.push({ source: 'wordnet', entries: wordnetEntries })
  return results
}

// 过渡兼容：旧 TopSearchBar 仍引用 searchDictionary
/** @deprecated Use lookupWord instead */
export async function searchDictionary(query: string): Promise<DictionaryEntry[]> {
  const results = await lookupWord(query)
  return results.flatMap(r => r.entries)
}
