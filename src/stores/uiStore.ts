import { create } from 'zustand'
import type { Category } from '../types/category'

export interface EditorTarget { category: Category | null; wordId: string | null }

interface UiStore {
  assignWordId: string | null
  editorTarget: EditorTarget | null
  openAssign: (wordId: string) => void
  openEditor: (category: Category | null, wordId: string | null) => void
  closeModals: () => void
}

export const useUiStore = create<UiStore>((set) => ({
  assignWordId: null,
  editorTarget: null,
  openAssign: (wordId) => set({ assignWordId: wordId, editorTarget: null }),
  openEditor: (category, wordId) => set({ editorTarget: { category, wordId }, assignWordId: null }),
  closeModals: () => set({ assignWordId: null, editorTarget: null }),
}))
