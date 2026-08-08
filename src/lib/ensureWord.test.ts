import { describe, it, expect, vi } from 'vitest'
import { useWordStore } from '../stores/wordStore'
import { ensureWord } from './ensureWord'
import type { Word } from '../types/word'

describe('ensureWord', () => {
  it('有存量（case-insensitive）直接返回，不重复创建', async () => {
    const existing = { id: 'w1', lemma: 'observe' } as Word
    const addWord = vi.fn()
    useWordStore.setState({ words: [existing as never], addWord: addWord as never })
    const w = await ensureWord('OBSERVE')
    expect(w?.id).toBe('w1')
    expect(addWord).not.toHaveBeenCalled()
  })

  it('无存量时调用 addWord 创建', async () => {
    const created = { id: 'w2', lemma: 'ball' } as Word
    const addWord = vi.fn().mockResolvedValue(created)
    useWordStore.setState({ words: [], addWord: addWord as never })
    const w = await ensureWord('ball')
    expect(addWord).toHaveBeenCalledWith('ball')
    expect(w?.id).toBe('w2')
  })
})
