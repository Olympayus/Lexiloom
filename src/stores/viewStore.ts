import { create } from 'zustand'

export type ActiveView = 'workbench' | 'dict'

interface ViewStore {
  activeView: ActiveView
  dictWord: string | null
  editorMode: boolean
  showWorkbench: () => void
  showDict: (word: string) => void
  setEditorMode: (on: boolean) => void
}

export const useViewStore = create<ViewStore>((set) => ({
  activeView: 'workbench',
  dictWord: null,
  editorMode: false,
  showWorkbench: () => set({ activeView: 'workbench', dictWord: null }),
  showDict: (word) => set({ activeView: 'dict', dictWord: word }),
  setEditorMode: (on) => set({ editorMode: on }),
}))
