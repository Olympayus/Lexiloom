import { describe, it, expect, vi, beforeAll } from 'vitest'
import { getDb } from './connection'
import * as fieldsDb from './fields'
import { createWord } from './words'
import { createTestDb, type DbLike } from './test-utils'

vi.mock('./connection', () => ({
  getDb: vi.fn(),
  initDatabase: vi.fn(),
}))

let adapter: DbLike
beforeAll(async () => {
  adapter = await createTestDb()
  vi.mocked(getDb).mockReturnValue(adapter as unknown as ReturnType<typeof getDb>)
})

describe('db/fields', () => {
  it('getFieldDefinitions 返回 11 个内置字段且按 display_order 排序', async () => {
    const r = await fieldsDb.getFieldDefinitions()
    if (!r.ok) throw new Error('getFieldDefinitions failed')
    expect(r.data.length).toBe(11)
    expect(r.data[0].key).toBe('chinese_definition')
  })

  it('insertFieldValue 插入父字段与子字段', async () => {
    const wResult = await createWord({ lemma: 'observe' })
    if (!wResult.ok) throw new Error('createWord failed')
    const w = wResult.data
    const parentResult = await fieldsDb.insertFieldValue({ wordId: w.id, fieldId: 'f_exchange', value: '', source: 'ecdict' })
    if (!parentResult.ok) throw new Error('insertFieldValue failed')
    const parent = parentResult.data
    const childResult = await fieldsDb.insertFieldValue({ wordId: w.id, fieldId: 'f_exchange_item', value: '过去式: observed', source: 'ecdict', parentId: parent.id })
    if (!childResult.ok) throw new Error('insertFieldValue failed')
    const child = childResult.data
    expect(child.parentId).toBe(parent.id)
    const children = await fieldsDb.getFieldValuesByParent(parent.id)
    if (!children.ok) throw new Error('getFieldValuesByParent failed')
    expect(children.data.length).toBe(1)
    expect(children.data[0].value).toBe('过去式: observed')
  })

  it('updateFieldValueById 更新值且保留 display_order 与 parent_id', async () => {
    const wResult = await createWord({ lemma: 'apple' })
    if (!wResult.ok) throw new Error('createWord failed')
    const w = wResult.data
    const fvResult = await fieldsDb.insertFieldValue({ wordId: w.id, fieldId: 'f_chinese_definition', value: '苹果', source: 'ecdict', displayOrder: 5 })
    if (!fvResult.ok) throw new Error('insertFieldValue failed')
    const fv = fvResult.data
    const updated = await fieldsDb.updateFieldValueById(fv.id, '苹果（旧）', 'user')
    if (!updated.ok) throw new Error('updateFieldValueById failed')
    expect(updated.data.value).toBe('苹果（旧）')
    expect(updated.data.displayOrder).toBe(5)
    const notFound = await fieldsDb.updateFieldValueById('nonexistent', 'x')
    expect(notFound.ok).toBe(false)
  })

  it('deleteFieldValue 删除字段', async () => {
    const wResult = await createWord({ lemma: 'banana' })
    if (!wResult.ok) throw new Error('createWord failed')
    const w = wResult.data
    const fvResult = await fieldsDb.insertFieldValue({ wordId: w.id, fieldId: 'f_phonetic', value: '/bə/', source: 'ecdict' })
    if (!fvResult.ok) throw new Error('insertFieldValue failed')
    const fv = fvResult.data
    await fieldsDb.deleteFieldValue(fv.id)
    const vals = await fieldsDb.getFieldValuesForWord(w.id)
    if (!vals.ok) throw new Error('getFieldValuesForWord failed')
    expect(vals.data.length).toBe(0)
  })

  it('插入的 field_value 返回 edited=false 且 originalValue=null', async () => {
    const wResult = await createWord({ lemma: 'edited-test' })
    if (!wResult.ok) throw new Error('createWord failed')
    const fvResult = await fieldsDb.insertFieldValue({ wordId: wResult.data.id, fieldId: 'f_phonetic', value: '/edit/', source: 'ecdict' })
    if (!fvResult.ok) throw new Error('insertFieldValue failed')
    expect(fvResult.data.edited).toBe(false)
    expect(fvResult.data.originalValue).toBeNull()
    const vals = await fieldsDb.getFieldValuesForWord(wResult.data.id)
    if (!vals.ok) throw new Error('getFieldValuesForWord failed')
    expect(vals.data[0].edited).toBe(false)
    expect(vals.data[0].originalValue).toBeNull()
  })
})
