import { create } from 'zustand'
import type { Word, WordWithPreview, FieldValue } from '../types'
import * as wordService from '../services/wordService'
import * as fieldService from '../services/fieldService'

interface WordStore {
  words: WordWithPreview[]
  loading: boolean
  selectedWordId: string | null
  fieldValues: FieldValue[]

  loadWords: () => Promise<void>
  selectWord: (id: string | null) => Promise<void>
  updateFieldValue: (fvId: string, value: string) => Promise<void>
  addWord: (lemma: string) => Promise<Word | null>
  mergeWordFields: (wordId: string, fields: { key: string; value: string; source: 'ecdict' | 'wordnet' | 'user'; parentKey?: string }[]) => Promise<boolean>
  deleteWord: (id: string) => Promise<void>
}

export const useWordStore = create<WordStore>((set, get) => ({
  words: [],
  loading: false,
  selectedWordId: null,
  fieldValues: [],

  loadWords: async () => {
    set({ loading: true })
    const words = await wordService.getPreviews()
    set({ words, loading: false })
  },

  selectWord: async (id) => {
    set({ selectedWordId: id, fieldValues: [] })
    if (!id) return
    const values = await fieldService.getValues(id)
    set({ fieldValues: values })
  },

  updateFieldValue: async (fvId, value) => {
    const { selectedWordId } = get()
    if (!selectedWordId) return
    await fieldService.updateValueById(fvId, value)
    await get().selectWord(selectedWordId)
  },

  deleteWord: async (id) => {
    const ok = await wordService.deleteWord(id)
    if (!ok) return
    if (get().selectedWordId === id) {
      set({ selectedWordId: null, fieldValues: [] })
    }
    await get().loadWords()
  },

  addWord: async (lemma) => {
    const word = await wordService.addWord(lemma)
    if (word) await get().loadWords()
    return word
  },

  mergeWordFields: async (wordId, fields) => {
    const ok = await wordService.mergeFields(wordId, fields)
    if (ok) {
      const values = await fieldService.getValues(wordId)
      set({ fieldValues: values })
    }
    return ok
  },
}))
