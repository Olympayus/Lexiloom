import type { DictionaryEntry } from '../types/dictionary'

export interface DictionaryProvider {
  readonly name: string
  /** Phase 1: fuzzy match, return word suggestion list */
  searchLemmas(query: string): Promise<string[]>
  /** Phase 2: exact lookup, return full entry */
  lookup(word: string): Promise<DictionaryEntry[]>
}
