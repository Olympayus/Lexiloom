import { create } from 'zustand'
import type { Category } from '../types/category'

export interface EditorTarget { category: Category | null; wordId: string | null }

export interface ConfirmRequest {
  title: string
  message: string
  danger?: boolean
  confirmLabel?: string
  alertMode?: boolean
}

interface UiStore {
  assignWordId: string | null
  editorTarget: EditorTarget | null
  confirmReq: ConfirmRequest | null
  openAssign: (wordId: string) => void
  openEditor: (category: Category | null, wordId: string | null) => void
  closeModals: () => void
  confirm: (req: ConfirmRequest) => Promise<boolean>
  resolveConfirm: (ok: boolean) => void
}

let confirmResolver: ((ok: boolean) => void) | null = null

export const useUiStore = create<UiStore>((set) => ({
  assignWordId: null,
  editorTarget: null,
  confirmReq: null,
  openAssign: (wordId) => set({ assignWordId: wordId, editorTarget: null }),
  openEditor: (category, wordId) => set({ editorTarget: { category, wordId }, assignWordId: null }),
  closeModals: () => set({ assignWordId: null, editorTarget: null }),
  confirm: (req) => {
    set({ confirmReq: req })
    return new Promise<boolean>((resolve) => { confirmResolver = resolve })
  },
  resolveConfirm: (ok) => {
    confirmResolver?.(ok)
    confirmResolver = null
    set({ confirmReq: null })
  },
}))
