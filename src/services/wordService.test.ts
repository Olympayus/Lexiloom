import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { getDb } from '../db/connection'
import * as wordsDb from '../db/words'
import { createTestDb, type DbLike } from '../db/test-utils'
import { deleteWord, getPreviews, mergeFields } from './wordService'
import { clearDefinitionsCache } from './fieldService'
import { getFieldValuesForWord } from '../db/fields'
import * as fieldsDb from '../db/fields'

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

describe('wordService.mergeFields 显式父子匹配键', () => {
  it('词形变化：exchange_item 挂到 exchange 容器下', async () => {
    const w = await wordsDb.createWord({ lemma: 'observe' })
    if (!w.ok) throw new Error('createWord failed')
    const ok = await mergeFields(w.data.id, [
      { key: 'exchange', value: '', source: 'ecdict', tempId: 'p-exchange' },
      { key: 'exchange_item', value: '过去式: observed', source: 'ecdict', parentTempId: 'p-exchange' },
      { key: 'exchange_item', value: '过去分词: observed', source: 'ecdict', parentTempId: 'p-exchange' },
    ])
    expect(ok).toBe(true)
    const r = await getFieldValuesForWord(w.data.id)
    if (!r.ok) throw new Error('getFieldValuesForWord failed')
    const container = r.data.find(fv => fv.fieldId === 'f_exchange')
    const items = r.data.filter(fv => fv.fieldId === 'f_exchange_item')
    expect(container).toBeDefined()
    expect(items).toHaveLength(2)
    for (const item of items) expect(item.parentId).toBe(container!.id)
  })

  it('英文释义：synonyms/example 挂到对应 english_definition', async () => {
    const w = await wordsDb.createWord({ lemma: 'atmosphere' })
    if (!w.ok) throw new Error('createWord failed')
    await mergeFields(w.data.id, [
      { key: 'english_definition', value: 'the envelope of gases', source: 'wordnet', tempId: 'p-english-0' },
      { key: 'synonyms', value: 'air, aura', source: 'wordnet', parentTempId: 'p-english-0' },
      { key: 'example', value: 'The atmosphere was tense.', source: 'wordnet', parentTempId: 'p-english-0' },
    ])
    const r = await getFieldValuesForWord(w.data.id)
    if (!r.ok) throw new Error('getFieldValuesForWord failed')
    const def = r.data.find(fv => fv.fieldId === 'f_english_definition')
    const children = r.data.filter(fv => fv.parentId === def!.id)
    expect(def).toBeDefined()
    expect(children.map(c => c.fieldId).sort()).toEqual(['f_example', 'f_synonyms'])
  })

  it('重复合并去重：同一值不重复插入', async () => {
    const w = await wordsDb.createWord({ lemma: 'dedup' })
    if (!w.ok) throw new Error('createWord failed')
    const input = { key: 'phonetic', value: '/d/', source: 'ecdict' as const }
    await mergeFields(w.data.id, [input])
    await mergeFields(w.data.id, [input])
    const r = await getFieldValuesForWord(w.data.id)
    if (!r.ok) throw new Error('getFieldValuesForWord failed')
    expect(r.data.filter(fv => fv.fieldId === 'f_phonetic')).toHaveLength(1)
  })

  it('重复合并：父字段去重跳过时子字段仍挂到已存在父行', async () => {
    const w = await wordsDb.createWord({ lemma: 'dedup-parent' })
    if (!w.ok) throw new Error('createWord failed')

    // 第一次合并：容器 + 一个 item
    await mergeFields(w.data.id, [
      { key: 'exchange', value: '', source: 'ecdict', tempId: 'p-exchange' },
      { key: 'exchange_item', value: '过去式: observed', source: 'ecdict', parentTempId: 'p-exchange' },
    ])

    // 第二次合并：相同容器值（被去重跳过）+ 新的 item
    await mergeFields(w.data.id, [
      { key: 'exchange', value: '', source: 'ecdict', tempId: 'p-exchange' },
      { key: 'exchange_item', value: '过去分词: observed', source: 'ecdict', parentTempId: 'p-exchange' },
    ])

    const r = await getFieldValuesForWord(w.data.id)
    if (!r.ok) throw new Error('getFieldValuesForWord failed')
    const containers = r.data.filter(fv => fv.fieldId === 'f_exchange')
    const items = r.data.filter(fv => fv.fieldId === 'f_exchange_item')
    expect(containers).toHaveLength(1)
    expect(items).toHaveLength(2)
    const containerId = containers[0].id
    for (const item of items) expect(item.parentId).toBe(containerId)
  })

  it('未解析的 parentTempId 回退为根级而非报错', async () => {
    const w = await wordsDb.createWord({ lemma: 'orphan-child' })
    if (!w.ok) throw new Error('createWord failed')
    const ok = await mergeFields(w.data.id, [
      { key: 'english_definition', value: 'a standalone definition', source: 'wordnet' },
      { key: 'synonyms', value: 'alpha, beta', source: 'wordnet', parentTempId: 'p-missing' },
    ])
    expect(ok).toBe(true)
    const r = await getFieldValuesForWord(w.data.id)
    if (!r.ok) throw new Error('getFieldValuesForWord failed')
    const syn = r.data.find(fv => fv.fieldId === 'f_synonyms')
    expect(syn).toBeDefined()
    expect(syn!.parentId).toBeNull()  // 回退为根级（P4 ledger 未测路径）
  })
})

describe('wordService 词操作', () => {
  it('deleteWord 删除单词返回 true', async () => {
    const w = await wordsDb.createWord({ lemma: 'del-me' })
    if (!w.ok) throw new Error('createWord failed')
    expect(await deleteWord(w.data.id)).toBe(true)
  })

  it('getPreviews 返回首条释义预览', async () => {
    const w = await wordsDb.createWord({ lemma: 'run' })
    if (!w.ok) throw new Error('createWord failed')
    await fieldsDb.insertFieldValue({ wordId: w.data.id, fieldId: 'f_chinese_definition', value: '跑步', source: 'ecdict' })
    const previews = await getPreviews()
    const p = previews.find(x => x.id === w.data.id)
    expect(p?.chineseDefinition).toBe('跑步')
  })
})
