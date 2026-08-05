import { create } from 'zustand'
import type { Word, WordWithPreview, FieldValue } from '../types'
import type { FieldValueContentUpdate } from '../types/field'
import * as wordService from '../services/wordService'
import type { MergeFieldInput } from '../services/wordService'
import * as fieldService from '../services/fieldService'

interface WordStore {
  words: WordWithPreview[]
  loading: boolean
  selectedWordId: string | null
  fieldValues: FieldValue[]

  loadWords: () => Promise<void>
  selectWord: (id: string | null) => Promise<void>
  updateFieldValue: (fvId: string, input: FieldValueContentUpdate) => Promise<void>
  restoreFieldValue: (fvId: string) => Promise<void>
  addFieldValue: (fieldId: string) => Promise<FieldValue | null>
  reorderFieldValues: (entries: { id: string; displayOrder: number }[]) => Promise<void>
  addWord: (lemma: string) => Promise<Word | null>
  mergeWordFields: (wordId: string, fields: MergeFieldInput[]) => Promise<boolean>
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
    // 仅切换单词时清空（加载态）；同名刷新（拖拽重排/编辑保存/还原/添加字段）保留列表，
    // 避免字段列表先坍缩再重取导致滚动容器 scrollTop 被钳到顶部（跳顶）。
    if (id !== get().selectedWordId) set({ selectedWordId: id, fieldValues: [] })
    if (!id) return
    const values = await fieldService.getValues(id)
    set({ fieldValues: values })
  },

  updateFieldValue: async (fvId, input) => {
    const { selectedWordId } = get()
    if (!selectedWordId) return
    await fieldService.updateValueById(fvId, input)
    await get().selectWord(selectedWordId)
  },

  restoreFieldValue: async (fvId) => {
    const { selectedWordId } = get()
    if (!selectedWordId) return
    await fieldService.restoreValue(fvId)
    await get().selectWord(selectedWordId)
  },

  addFieldValue: async (fieldId) => {
    const { selectedWordId } = get()
    if (!selectedWordId) return null
    const fv = await fieldService.addFieldValue(selectedWordId, fieldId)
    await get().selectWord(selectedWordId)
    return fv
  },

  reorderFieldValues: async (entries) => {
    const { selectedWordId } = get()
    if (!selectedWordId) return
    await fieldService.reorderValues(entries)
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
