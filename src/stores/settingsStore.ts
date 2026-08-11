import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { SidebarMode } from '../lib/sidebar'

export type DisplayFieldKey =
  | 'phonetic' | 'part_of_speech' | 'chinese_definition'
  | 'english_definition' | 'example' | 'exchange' | 'synonyms'

export type OnlineSourceKey = 'oxford' | 'longman' | 'collins' | 'merriam'

export interface SettingsStore {
  settingsOpen: boolean
  displayFields: Record<DisplayFieldKey, boolean>
  onlineDictEnabled: boolean
  onlineSources: Record<OnlineSourceKey, boolean>
  sidebarMode: SidebarMode
  openSettings: () => void
  closeSettings: () => void
  setDisplayField: (key: DisplayFieldKey, on: boolean) => void
  setOnlineDictEnabled: (on: boolean) => void
  setOnlineSource: (key: OnlineSourceKey, checked: boolean) => void
  setSidebarMode: (mode: SidebarMode) => void
}

// 默认（规格 §7）：词典返回词条全开、在线词典关闭（来源全选）、字母模式、抽屉关闭
const DEFAULT_DISPLAY_FIELDS: Record<DisplayFieldKey, boolean> = {
  phonetic: true, part_of_speech: true, chinese_definition: true,
  english_definition: true, example: true, exchange: true, synonyms: true,
}
const DEFAULT_ONLINE_SOURCES: Record<OnlineSourceKey, boolean> = {
  oxford: true, longman: true, collins: true, merriam: true,
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settingsOpen: false,
      displayFields: DEFAULT_DISPLAY_FIELDS,
      onlineDictEnabled: false,
      onlineSources: DEFAULT_ONLINE_SOURCES,
      sidebarMode: 'alphabet',
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
      setDisplayField: (key, on) => set(s => ({ displayFields: { ...s.displayFields, [key]: on } })),
      setOnlineDictEnabled: (on) => set({ onlineDictEnabled: on }),
      setOnlineSource: (key, checked) => set(s => ({ onlineSources: { ...s.onlineSources, [key]: checked } })),
      setSidebarMode: (mode) => set({ sidebarMode: mode }),
    }),
    {
      name: 'lexiloom-settings',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<SettingsStore> & { displayFields?: Record<string, boolean> }
        const fields: Record<string, boolean> = { ...DEFAULT_DISPLAY_FIELDS, ...(state.displayFields) }
        delete fields.etymology
        if (fields.synonyms === undefined) fields.synonyms = true
        return { ...state, displayFields: fields } as SettingsStore
      },
      onRehydrateStorage: () => (_, error) => {
        if (error) {
          // 损坏/缺失数据 → 回退默认值
          useSettingsStore.setState({
            displayFields: DEFAULT_DISPLAY_FIELDS,
            onlineDictEnabled: false,
            onlineSources: DEFAULT_ONLINE_SOURCES,
            sidebarMode: 'alphabet',
          })
        }
      },
      partialize: (s) => ({
        displayFields: s.displayFields,
        onlineDictEnabled: s.onlineDictEnabled,
        onlineSources: s.onlineSources,
        sidebarMode: s.sidebarMode,
      }),
    }
  )
)
