import { create } from 'zustand'

export type ActiveView = 'workbench' | 'dict'

interface ViewStore {
  activeView: ActiveView
  dictWord: string | null
  showWorkbench: () => void
  showDict: (word: string) => void
}

export const useViewStore = create<ViewStore>((set) => ({
  activeView: 'workbench',
  dictWord: null,
  showWorkbench: () => set({ activeView: 'workbench', dictWord: null }),
  showDict: (word) => set({ activeView: 'dict', dictWord: word }),
}))
