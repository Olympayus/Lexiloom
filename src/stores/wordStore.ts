import { create } from 'zustand'
import type { Word, WordWithPreview, FieldKey, FieldValue } from '../types'
import * as wordsDb from '../db/words'
import * as fieldsDb from '../db/fields'

interface WordStore {
  words: (Word | WordWithPreview)[]
  loading: boolean
  selectedWordId: string | null
  fieldValues: Record<string, FieldValue | null>

  loadWords: () => Promise<void>
  selectWord: (id: string | null) => Promise<void>
  updateFieldValue: (fieldKey: FieldKey, value: string) => Promise<void>
  addWord: (lemma: string) => Promise<Word | null>
}

export const useWordStore = create<WordStore>((set, get) => ({
  words: [],
  loading: false,
  selectedWordId: null,
  fieldValues: {},

  loadWords: async () => {
    set({ loading: true })
    const result = await wordsDb.getWordsWithPreviews()
    if (result.ok) set({ words: result.data })
    set({ loading: false })
  },

  selectWord: async (id) => {
    set({ selectedWordId: id, fieldValues: {} })
    if (!id) return
    const result = await fieldsDb.getFieldValuesForWord(id)
    if (result.ok) {
      const map: Record<string, FieldValue | null> = {}
      for (const fv of result.data) map[fv.fieldId] = fv
      set({ fieldValues: map })
    }
  },

  updateFieldValue: async (fieldKey, value) => {
    const { selectedWordId } = get()
    if (!selectedWordId) return

    const defs = await fieldsDb.getFieldDefinitions()
    if (!defs.ok) return
    const def = defs.data.find(d => d.key === fieldKey)
    if (!def) return

    await fieldsDb.upsertFieldValue({
      wordId: selectedWordId, fieldId: def.id,
      value, source: 'user',
    })
    await get().selectWord(selectedWordId)
  },

  addWord: async (lemma) => {
    const existing = await wordsDb.getWordByLemma(lemma)
    if (existing.ok && existing.data) return existing.data

    const result = await wordsDb.createWord({ lemma })
    if (!result.ok) return null
    await get().loadWords()
    return result.data
  },
}))
