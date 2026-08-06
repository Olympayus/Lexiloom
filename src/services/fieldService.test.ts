import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { getDb } from '../db/connection'
import * as wordsDb from '../db/words'
import * as fieldsDb from '../db/fields'
import { createTestDb, type DbLike } from '../db/test-utils'
import { getValues, clearDefinitionsCache } from './fieldService'

vi.mock('../db/connection', () => ({
  getDb: vi.fn(),
  initDatabase: vi.fn(),
}))

let adapter: DbLike
beforeAll(async () => {
  adapter = await createTestDb()
  vi.mocked(getDb).mockReturnValue(adapter as unknown as ReturnType<typeof getDb>)
})
beforeEach(() => clearDefinitionsCache())

describe('fieldService.getValues 树聚合', () => {
  it('父字段挂载子字段，子字段不出现在根级', async () => {
    const w = await wordsDb.createWord({ lemma: 'observe' })
    if (!w.ok) throw new Error('createWord failed')
    const parent = await fieldsDb.insertFieldValue({ wordId: w.data.id, fieldId: 'f_exchange', value: '', source: 'ecdict' })
    if (!parent.ok) throw new Error('insertFieldValue failed')
    const c1 = await fieldsDb.insertFieldValue({ wordId: w.data.id, fieldId: 'f_exchange_item', value: '过去式: observed', source: 'ecdict', parentId: parent.data.id })
    const c2 = await fieldsDb.insertFieldValue({ wordId: w.data.id, fieldId: 'f_exchange_item', value: '过去分词: observed', source: 'ecdict', parentId: parent.data.id })
    if (!c1.ok || !c2.ok) throw new Error('insertFieldValue failed')

    const values = await getValues(w.data.id)
    const root = values.find(v => v.id === parent.data.id)
    expect(root).toBeDefined()
    expect(root!.children).toHaveLength(2)
    expect(root!.children!.map(c => c.id).sort()).toEqual([c1.data.id, c2.data.id].sort())
    expect(values.some(v => v.id === c1.data.id)).toBe(false)  // 子字段不在根级
  })

  it('无父字段直接为根级，children 为空数组', async () => {
    const w = await wordsDb.createWord({ lemma: 'apple' })
    if (!w.ok) throw new Error('createWord failed')
    const fv = await fieldsDb.insertFieldValue({ wordId: w.data.id, fieldId: 'f_phonetic', value: '/æpl/', source: 'ecdict' })
    if (!fv.ok) throw new Error('insertFieldValue failed')
    const values = await getValues(w.data.id)
    expect(values.map(v => v.id)).toEqual([fv.data.id])
    expect(values[0].children).toEqual([])
  })
})
