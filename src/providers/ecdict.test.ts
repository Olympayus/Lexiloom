import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getCachedDbMock } = vi.hoisted(() => ({ getCachedDbMock: vi.fn() }))
vi.mock('./dbCache', () => ({ getCachedDb: getCachedDbMock }))
vi.mock('./dictPath', () => ({
  resolveDictPath: vi.fn(async () => 'test.db'),
  toSqliteUrl: vi.fn((p: string) => `sqlite:${p}`),
}))

import { EcdictProvider } from './ecdict'

describe('EcdictProvider.searchLemmas', () => {
  const select = vi.fn()
  beforeEach(() => {
    select.mockReset()
    getCachedDbMock.mockResolvedValue({ select })
  })

  it('建议查询带 EXISTS 过滤：只返回 entries 中存在的词（排除 lemma.json 里的孤儿词）', async () => {
    select.mockResolvedValue([{ word: 'apple' }, { word: 'applejacks' }])
    const results = await new EcdictProvider().searchLemmas('apple')
    expect(results).toEqual(['apple', 'applejacks'])
    const [sql] = select.mock.calls[0]
    expect(sql).toContain('EXISTS (SELECT 1 FROM entries WHERE entries.word = lemmas.word)')
  })

  it('空查询直接返回空数组，不访问数据库', async () => {
    await expect(new EcdictProvider().searchLemmas('   ')).resolves.toEqual([])
    expect(select).not.toHaveBeenCalled()
  })
})
