import { create } from 'zustand'
import type { Word, WordWithPreview, FieldKey, FieldValue } from '../types'
import * as wordService from '../services/wordService'
import * as fieldService from '../services/fieldService'

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
    const words = await wordService.getPreviews()
    set({ words, loading: false })
  },

  selectWord: async (id) => {
    set({ selectedWordId: id, fieldValues: {} })
    if (!id) return
    const map = await fieldService.getValues(id)
    set({ fieldValues: map })
  },

  updateFieldValue: async (fieldKey, value) => {
    const { selectedWordId } = get()
    if (!selectedWordId) return

    const defs = await fieldService.getDefinitions()
    const def = defs.find(d => d.key === fieldKey)
    if (!def) return

    await fieldService.upsertValue({
      wordId: selectedWordId,
      fieldId: def.id,
      value,
      source: 'user',
    })
    await get().selectWord(selectedWordId)
  },

  addWord: async (lemma) => {
    const word = await wordService.addWord(lemma)
    if (word) await get().loadWords()
    return word
  },
}))
