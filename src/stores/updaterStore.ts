import { create } from 'zustand'
import type { Update } from '@tauri-apps/plugin-updater'
import { checkForUpdates, downloadUpdate, installAndRelaunch, proxyHintForCheck, proxyHintForDownload } from '../services/updater'

export type UpdatePhase = 'idle' | 'checking' | 'latest' | 'available' | 'downloading' | 'installing' | 'done' | 'error'

const STALL_MS = 8000

interface UpdateStore {
  phase: UpdatePhase
  open: boolean
  hasUpdateBadge: boolean
  badgeVersion: string | null
  version: string | null
  notes: string | undefined
  errorMessage: string | null
  errorHint: string | null
  downloadedBytes: number
  contentLength: number | undefined
  percent: number | null
  stalled: boolean
  update: Update | null

  openDialog: () => void
  closeDialog: () => void
  checkSilently: () => Promise<void>
  checkManually: () => Promise<void>
  startDownload: () => Promise<void>
  cancelDownload: () => Promise<void>
}

let stallTimer: ReturnType<typeof setInterval> | undefined
let lastProgress = 0
const clearStallTimer = () => { if (stallTimer) clearInterval(stallTimer); stallTimer = undefined }

export const useUpdaterStore = create<UpdateStore>((set, get) => {
  const applyCheck = (r: Awaited<ReturnType<typeof checkForUpdates>>) => {
    if (r.status === 'update-available') {
      set({ phase: 'available', version: r.version, notes: r.notes, update: r.update, hasUpdateBadge: true, badgeVersion: r.version })
    } else if (r.status === 'latest') {
      set({ phase: 'latest', version: null, notes: undefined, update: null, hasUpdateBadge: false, badgeVersion: null })
    } else {
      set({ phase: 'error', errorMessage: r.message, errorHint: proxyHintForCheck(), update: null })
    }
  }

  return {
    phase: 'idle',
    open: false,
    hasUpdateBadge: false,
    badgeVersion: null,
    version: null,
    notes: undefined,
    errorMessage: null,
    errorHint: null,
    downloadedBytes: 0,
    contentLength: undefined,
    percent: null,
    stalled: false,
    update: null,

    openDialog: () => set({ open: true }),
    closeDialog: () => set({ open: false }),

    checkSilently: async () => {
      const r = await checkForUpdates()
      if (r.status === 'update-available') {
        set({ hasUpdateBadge: true, badgeVersion: r.version, version: r.version, notes: r.notes, update: r.update })
      }
      // latest / error：静默
    },

    checkManually: async () => {
      const { phase } = get()
      if (phase === 'downloading' || phase === 'installing') return  // 幂等：更新中忽略重复触发
      set({ open: true, phase: 'checking', errorMessage: null, errorHint: null })
      applyCheck(await checkForUpdates())
    },

    startDownload: async () => {
      const { update } = get()
      if (!update) return
      set({ phase: 'downloading', downloadedBytes: 0, contentLength: undefined, percent: null, stalled: false })
      lastProgress = Date.now()
      clearStallTimer()
      stallTimer = setInterval(() => { if (Date.now() - lastProgress >= STALL_MS) set({ stalled: true }) }, 2000)
      try {
        await downloadUpdate(update, (p) => {
          lastProgress = Date.now()
          set({ downloadedBytes: p.downloadedBytes, contentLength: p.contentLength, percent: p.percent, stalled: false })
        })
        clearStallTimer()
        set({ phase: 'installing' })
        await installAndRelaunch(update)
        set({ phase: 'done' })
      } catch (e) {
        clearStallTimer()
        set({ phase: 'error', errorMessage: e instanceof Error ? e.message : String(e), errorHint: proxyHintForDownload() })
      }
    },

    cancelDownload: async () => {
      const { update } = get()
      clearStallTimer()
      if (update) await update.close()
      set({ phase: 'idle', open: false, downloadedBytes: 0, contentLength: undefined, percent: null, stalled: false })
    },
  }
})
