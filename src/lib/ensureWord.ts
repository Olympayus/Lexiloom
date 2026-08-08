import { useWordStore } from '../stores/wordStore'
import type { Word } from '../types/word'

// 确保词条存在：先查存量（忽略大小写），无则创建
export async function ensureWord(lemma: string): Promise<Word | null> {
  const existing = useWordStore.getState().words.find(w => w.lemma.toLowerCase() === lemma.toLowerCase())
  if (existing) return existing
  return useWordStore.getState().addWord(lemma)
}
