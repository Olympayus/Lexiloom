import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDb } from './connection'
import { createTestDb, type DbLike } from './test-utils'
import { createWord } from './words'
import * as categoriesDb from './categories'

vi.mock('./connection', () => ({
  getDb: vi.fn(),
  initDatabase: vi.fn(),
}))

let adapter: DbLike
beforeEach(async () => {
  adapter = await createTestDb()
  vi.mocked(getDb).mockReturnValue(adapter as unknown as ReturnType<typeof getDb>)
})

describe('categories db 层', () => {
  it('createCategory 创建分类，isDefault 默认 false', async () => {
    const r = await categoriesDb.createCategory({ name: '医学英语', color: '#6B8E7F' })
    if (!r.ok) throw new Error('createCategory failed')
    expect(r.data.id).toBeTruthy()
    expect(r.data.name).toBe('医学英语')
    expect(r.data.color).toBe('#6B8E7F')
    expect(r.data.isDefault).toBe(false)
  })

  it('getAllCategories 返回全部分类（按创建顺序）', async () => {
    await categoriesDb.createCategory({ name: 'A', color: '#7A7368' })
    await categoriesDb.createCategory({ name: 'B', color: '#4A6FA5' })
    const r = await categoriesDb.getAllCategories()
    if (!r.ok) throw new Error('getAllCategories failed')
    expect(r.data.map(c => c.name)).toEqual(['A', 'B'])
  })

  it('assignCategoryToWord + getCategoriesForWord 返回该单词分类', async () => {
    const w = await createWord({ lemma: 'observe' })
    if (!w.ok) throw new Error('createWord failed')
    const cat = await categoriesDb.createCategory({ name: '生物', color: '#6B8E7F' })
    if (!cat.ok) throw new Error('createCategory failed')
    await categoriesDb.assignCategoryToWord(w.data.id, cat.data.id)
    const r = await categoriesDb.getCategoriesForWord(w.data.id)
    if (!r.ok) throw new Error('getCategoriesForWord failed')
    expect(r.data.map(c => c.id)).toEqual([cat.data.id])
  })

  it('setDefault：设新默认清除旧默认（仅一个默认）', async () => {
    const a = await categoriesDb.createCategory({ name: 'A', color: '#7A7368' })
    const b = await categoriesDb.createCategory({ name: 'B', color: '#4A6FA5' })
    if (!a.ok || !b.ok) throw new Error('createCategory failed')
    await categoriesDb.updateCategory(a.data.id, { isDefault: true })
    await categoriesDb.updateCategory(b.data.id, { isDefault: true })
    const d = await categoriesDb.getDefaultCategory()
    if (!d.ok) throw new Error('getDefaultCategory failed')
    expect(d.data?.id).toBe(b.data.id)
  })

  it('deleteCategory 解除所有单词关联但保留单词', async () => {
    const w = await createWord({ lemma: 'delete-cat' })
    if (!w.ok) throw new Error('createWord failed')
    const cat = await categoriesDb.createCategory({ name: '待删', color: '#B85450' })
    if (!cat.ok) throw new Error('createCategory failed')
    await categoriesDb.assignCategoryToWord(w.data.id, cat.data.id)
    await categoriesDb.deleteCategory(cat.data.id)
    const cats = await categoriesDb.getCategoriesForWord(w.data.id)
    if (!cats.ok) throw new Error('getCategoriesForWord failed')
    expect(cats.data).toHaveLength(0)
    const words = await adapter.select<{ id: string }[]>(
      'SELECT id FROM words WHERE id = ?1', [w.data.id]
    )
    expect(words.length).toBe(1)
  })

  it('updateCategory 重命名/换色/清空描述', async () => {
    const cat = await categoriesDb.createCategory({ name: '旧名', color: '#7A7368', description: 'desc' })
    if (!cat.ok) throw new Error('createCategory failed')
    await categoriesDb.updateCategory(cat.data.id, { name: '新名', color: '#8B6A8B', description: null })
    const r = await categoriesDb.getAllCategories()
    if (!r.ok) throw new Error('getAllCategories failed')
    const updated = r.data.find(c => c.id === cat.data.id)!
    expect(updated.name).toBe('新名')
    expect(updated.color).toBe('#8B6A8B')
    expect(updated.description).toBeUndefined()
  })

  it('assignCategoryToWord 幂等：重复赋分类不产生重复行', async () => {
    const w = await createWord({ lemma: 'idem' })
    if (!w.ok) throw new Error('createWord failed')
    const cat = await categoriesDb.createCategory({ name: '幂等', color: '#5A7A8C' })
    if (!cat.ok) throw new Error('createCategory failed')
    await categoriesDb.assignCategoryToWord(w.data.id, cat.data.id)
    await categoriesDb.assignCategoryToWord(w.data.id, cat.data.id)
    const r = await categoriesDb.getCategoriesForWord(w.data.id)
    if (!r.ok) throw new Error('getCategoriesForWord failed')
    expect(r.data).toHaveLength(1)
  })
})
