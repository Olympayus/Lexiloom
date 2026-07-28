import type { DictionaryEntry } from '../types/dictionary'

export interface DictionaryProvider {
  readonly name: string
  lookup(query: string): Promise<DictionaryEntry[]>
}
