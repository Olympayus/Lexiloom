import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getDb } from '../db/connection'
import { createTestDb, type DbLike } from '../db/test-utils'
import * as categoriesDb from '../db/categories'
import * as categoryService from './categoryService'
import * as wordService from './wordService'

vi.mock('../db/connection', () => ({
  getDb: vi.fn(),
  initDatabase: vi.fn(),
}))

// 每例独立 DB：避免默认分类/单词跨用例泄漏（同 Task 2 categories.test.ts 模式）
let adapter: DbLike
beforeEach(async () => {
  adapter = await createTestDb()
  vi.mocked(getDb).mockReturnValue(adapter as unknown as ReturnType<typeof getDb>)
})

describe('categoryService 默认分类自动归入', () => {
  it('addWord 新建单词自动归入默认分类', async () => {
    const cat = await categoriesDb.createCategory({ name: '默认', color: '#6B8E7F', isDefault: true })
    if (!cat.ok) throw new Error('createCategory failed')
    const word = await wordService.addWord('default-cat-word')
    expect(word).not.toBeNull()
    const cats = await categoryService.getWordCategories(word!.id)
    expect(cats.map(c => c.id)).toContain(cat.data.id)
  })

  it('无默认分类时 addWord 不报错、无分类', async () => {
    const word = await wordService.addWord('no-default-word')
    expect(word).not.toBeNull()
    const cats = await categoryService.getWordCategories(word!.id)
    expect(cats).toHaveLength(0)
  })

  it('单词已存在时 addWord 不再重复归入', async () => {
    const cat = await categoriesDb.createCategory({ name: '默认2', color: '#4A6FA5', isDefault: true })
    if (!cat.ok) throw new Error('createCategory failed')
    const w1 = await wordService.addWord('again-word')
    await wordService.addWord('again-word')  // 已存在：走 existing 早退
    const cats = await categoryService.getWordCategories(w1!.id)
    expect(cats.filter(c => c.id === cat.data.id)).toHaveLength(1)
  })
})
