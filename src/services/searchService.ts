import { vocabularySearch } from '../lib/search'
import type { Word } from '../types/word'
import { CcCedictProvider } from '../providers/cc-cedict'
import type { DictionaryEntry } from '../types/dictionary'

export async function searchVocabulary(query: string): Promise<Word[]> {
  return vocabularySearch(query)
}

const dictProvider = new CcCedictProvider()

export async function searchDictionary(query: string): Promise<DictionaryEntry[]> {
  return dictProvider.lookup(query)
}
