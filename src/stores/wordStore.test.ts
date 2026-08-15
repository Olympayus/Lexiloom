import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../services/wordService', () => ({
  getPreviews: vi.fn(),
  addWord: vi.fn(),
  mergeFields: vi.fn(),
  deleteWord: vi.fn(),
}))
vi.mock('../services/fieldService', () => ({
  getValues: vi.fn(),
}))

import { useWordStore } from './wordStore'
import * as wordService from '../services/wordService'
import * as fieldService from '../services/fieldService'

describe('wordStore.mergeWordFields', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWordStore.setState({ words: [], fieldValues: [], selectedWordId: 'w1' })
  })

  it('合并成功 → 刷新侧边栏预览列表（音标/词性即时显示）', async () => {
    const previews = [
      { id: 'w1', lemma: 'apple', normalizedLemma: 'apple', language: 'en', createdAt: 1, updatedAt: 1, phonetic: '/ˈæpl/', partOfSpeechTags: ['n'] },
    ]
    vi.mocked(wordService.mergeFields).mockResolvedValue(true)
    vi.mocked(fieldService.getValues).mockResolvedValue([])
    vi.mocked(wordService.getPreviews).mockResolvedValue(previews)

    await useWordStore.getState().mergeWordFields('w1', [] as never)

    expect(wordService.getPreviews).toHaveBeenCalled()
    expect(useWordStore.getState().words).toEqual(previews)
  })

  it('合并失败 → 不刷新预览列表', async () => {
    vi.mocked(wordService.mergeFields).mockResolvedValue(false)

    await useWordStore.getState().mergeWordFields('w1', [] as never)

    expect(wordService.getPreviews).not.toHaveBeenCalled()
  })
})
