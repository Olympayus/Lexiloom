import { searchWords } from '../db/words'
import type { WordWithPreview } from '../types/word'

export async function vocabularySearch(query: string): Promise<WordWithPreview[]> {
  const result = await searchWords(query)
  return result.ok ? result.data : []
}
