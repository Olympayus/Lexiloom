import * as wordsDb from '../db/words'
import type { Word, CreateWordInput, WordWithPreview } from '../types/word'

export async function addWord(lemma: string): Promise<Word | null> {
  // Deduplication check (extracted from store)
  const existing = await wordsDb.getWordByLemma(lemma)
  if (existing.ok && existing.data) return existing.data

  const result = await wordsDb.createWord({ lemma })
  return result.ok ? result.data : null
}

export async function deleteWord(id: string): Promise<boolean> {
  // Later: add cascading cleanup for field_values
  const result = await wordsDb.deleteWord(id)
  return result.ok
}

export async function getPreviews(): Promise<WordWithPreview[]> {
  const result = await wordsDb.getWordsWithPreviews()
  return result.ok ? result.data : []
}
