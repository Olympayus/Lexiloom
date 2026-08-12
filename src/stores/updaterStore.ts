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
let downloadGen = 0  // 递增代次令牌：只有最新一次 startDownload 才能写 phase
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
        set({ phase: 'available', hasUpdateBadge: true, badgeVersion: r.version, version: r.version, notes: r.notes, update: r.update })
      }
      // latest / error：静默
    },

    checkManually: async () => {
      const { phase } = get()
      if (phase === 'downloading' || phase === 'installing' || phase === 'checking') return  // 幂等：检查/更新中忽略重复触发
      set({ open: true, phase: 'checking', errorMessage: null, errorHint: null })
      applyCheck(await checkForUpdates())
    },

    startDownload: async () => {
      const { update, phase } = get()
      if (phase === 'downloading' || phase === 'installing') return  // 幂等：下载/安装中忽略重复触发
      if (!update) return
      const gen = ++downloadGen  // 本代次令牌：仅最新代次可写 phase
      set({ phase: 'downloading', downloadedBytes: 0, contentLength: undefined, percent: null, stalled: false })
      lastProgress = Date.now()
      clearStallTimer()
      stallTimer = setInterval(() => { if (Date.now() - lastProgress >= STALL_MS) set({ stalled: true }) }, 2000)
      try {
        await downloadUpdate(update, (p) => {
          if (gen !== downloadGen) return
          lastProgress = Date.now()
          set({ downloadedBytes: p.downloadedBytes, contentLength: p.contentLength, percent: p.percent, stalled: false })
        })
        if (gen !== downloadGen) return  // 已被取消/新下载取代：不进入 installing
        clearStallTimer()
        set({ phase: 'installing' })
        await installAndRelaunch(update)
        set({ phase: 'done' })
      } catch (e) {
        if (gen !== downloadGen) return  // 迟到 reject：不写 error
        clearStallTimer()
        set({ phase: 'error', errorMessage: e instanceof Error ? e.message : String(e), errorHint: proxyHintForDownload() })
      }
    },

    cancelDownload: async () => {
      const { update } = get()
      downloadGen += 1  // 使进行中的旧下载失效
      clearStallTimer()
      try {
        if (update) await update.close()
      } finally {
        // close() 即使 reject 也要回 idle 并清徽标/update，避免弹窗卡在 downloading
        set({ phase: 'idle', open: false, hasUpdateBadge: false, badgeVersion: null, update: null, downloadedBytes: 0, contentLength: undefined, percent: null, stalled: false })
      }
    },
  }
})
