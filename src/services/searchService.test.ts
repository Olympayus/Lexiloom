import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useSettingsStore } from '../stores/settingsStore'
import { lookupWord } from './searchService'
import type { DictionaryEntry } from '../types/dictionary'

// mock 两个词典 provider：lookup 各返回一条非空条目，便于断言 lookupWord 按词典开关过滤
vi.mock('../providers/ecdict', () => ({
  EcdictProvider: class {
    readonly name = 'ecdict'
    async searchLemmas(): Promise<string[]> { return [] }
    async searchByChinese(): Promise<Array<{ word: string; translation: string }>> { return [] }
    async lookup(): Promise<DictionaryEntry[]> {
      return [{ word: 'apple', normalizedWord: 'apple', source: 'ecdict', fields: [] }]
    }
  },
}))

vi.mock('../providers/wordnet', () => ({
  WordNetProvider: class {
    readonly name = 'wordnet'
    async searchLemmas(): Promise<string[]> { return [] }
    async lookup(): Promise<DictionaryEntry[]> {
      return [{ word: 'apple', normalizedWord: 'apple', source: 'wordnet', fields: [] }]
    }
    async relatedWords() {
      return { path: [], groups: { synonyms: [], hypernyms: [], hyponyms: [], antonyms: [], partWhole: [], similarTo: [], alsoSee: [], derivatives: [] } }
    }
  },
}))

describe('lookupWord 词典开关过滤（v0.4.3 §7 词典开关）', () => {
  beforeEach(() => {
    useSettingsStore.setState({ dictionaries: { ecdict: true, wordnet: true } })
  })

  it('两个词典都开启时返回两源', async () => {
    const results = await lookupWord('apple')
    expect(results.map(r => r.source).sort()).toEqual(['ecdict', 'wordnet'])
  })

  it('关闭 wordnet → 仅返回 ecdict 详情', async () => {
    useSettingsStore.setState({ dictionaries: { ecdict: true, wordnet: false } })
    const results = await lookupWord('apple')
    expect(results.map(r => r.source)).toEqual(['ecdict'])
  })

  it('关闭 ecdict → 仅返回 wordnet 详情', async () => {
    useSettingsStore.setState({ dictionaries: { ecdict: false, wordnet: true } })
    const results = await lookupWord('apple')
    expect(results.map(r => r.source)).toEqual(['wordnet'])
  })

  it('全部关闭 → 无详情返回', async () => {
    useSettingsStore.setState({ dictionaries: { ecdict: false, wordnet: false } })
    const results = await lookupWord('apple')
    expect(results).toEqual([])
  })
})
