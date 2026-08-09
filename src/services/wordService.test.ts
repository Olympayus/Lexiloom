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

  it('双词源合并：同词性父合并，模板重排（中文释义先于英文释义）', async () => {
    const w = await wordsDb.createWord({ lemma: 'observe' })
    if (!w.ok) throw new Error('createWord failed')
    // wordnet 先来：n. 英文释义
    await mergeFields(w.data.id, [
      { key: 'part_of_speech', value: 'n.', source: 'wordnet', tempId: 'p0' },
      { key: 'english_definition', value: 'the envelope of gases', source: 'wordnet', parentTempId: 'p0' },
    ])
    // ecdict 后来：n. 中文释义 → 并入同一 n. 窗格，模板重排使中文释义显示在英文前
    await mergeFields(w.data.id, [
      { key: 'part_of_speech', value: 'n.', source: 'ecdict', tempId: 'p0' },
      { key: 'chinese_definition', value: '大气', source: 'ecdict', parentTempId: 'p0' },
    ])
    const r = await getFieldValuesForWord(w.data.id)
    if (!r.ok) throw new Error('getFieldValuesForWord failed')
    const posRows = r.data.filter(fv => fv.fieldId === 'f_part_of_speech')
    expect(posRows).toHaveLength(1)
    const children = r.data.filter(fv => fv.parentId === posRows[0].id)
    expect(children.map(c => c.fieldId)).toEqual(['f_chinese_definition', 'f_english_definition'])
    const zh = children.find(c => c.fieldId === 'f_chinese_definition')!
    const en = children.find(c => c.fieldId === 'f_english_definition')!
    expect(zh.displayOrder).toBeLessThan(en.displayOrder)
  })

  it('同名释义分属不同词性父不去重，同父同名批内去重', async () => {
    const w = await wordsDb.createWord({ lemma: 'tie' })
    if (!w.ok) throw new Error('createWord failed')
    // 同一批次：n. 下出现两次 `跑`（批内同父同值应去重），vi. 下出现一次 `跑`
    await mergeFields(w.data.id, [
      { key: 'part_of_speech', value: 'n.', source: 'ecdict', tempId: 'p-n' },
      { key: 'chinese_definition', value: '跑', source: 'ecdict', parentTempId: 'p-n' },
      { key: 'part_of_speech', value: 'vi.', source: 'ecdict', tempId: 'p-v' },
      { key: 'chinese_definition', value: '跑', source: 'ecdict', parentTempId: 'p-v' },
      { key: 'chinese_definition', value: '跑', source: 'ecdict', parentTempId: 'p-n' },
    ])
    const r = await getFieldValuesForWord(w.data.id)
    if (!r.ok) throw new Error('getFieldValuesForWord failed')
    expect(r.data.filter(fv => fv.fieldId === 'f_chinese_definition')).toHaveLength(2)
    // n. 下 1 行、vi. 下 1 行（旧实现：n. 下 2 行 + vi. 下 1 行 = 3 行）
    const posRows = r.data.filter(fv => fv.fieldId === 'f_part_of_speech')
    const underN = r.data.filter(fv => fv.parentId === posRows.find(p => p.value === 'n.')!.id)
    const underV = r.data.filter(fv => fv.parentId === posRows.find(p => p.value === 'vi.')!.id)
    expect(underN.filter(fv => fv.fieldId === 'f_chinese_definition')).toHaveLength(1)
    expect(underV.filter(fv => fv.fieldId === 'f_chinese_definition')).toHaveLength(1)
  })

  it('深度3合并：wordnet 树（POS→释义→synonyms→synonym_item）不产生根级孤儿', async () => {
    const w = await wordsDb.createWord({ lemma: 'atmosphere' })
    if (!w.ok) throw new Error('createWord failed')
    const ok = await mergeFields(w.data.id, [
      { key: 'part_of_speech', value: 'n.', source: 'wordnet', tempId: 'p-pos' },
      { key: 'english_definition', value: 'the atmosphere', source: 'wordnet', tempId: 'p-def', parentTempId: 'p-pos' },
      { key: 'synonyms', value: '', source: 'wordnet', tempId: 'p-syn', parentTempId: 'p-def' },
      { key: 'synonym_item', value: 'air', source: 'wordnet', tempId: 'p-item', parentTempId: 'p-syn' },
    ])
    expect(ok).toBe(true)
    const r = await getFieldValuesForWord(w.data.id)
    if (!r.ok) throw new Error('getFieldValuesForWord failed')
    // 除词性根外，每一行都必须有非空 parent_id（无根级孤儿）
    const orphans = r.data.filter(fv => fv.parentId === null)
    expect(orphans.map(fv => fv.fieldId)).toEqual(['f_part_of_speech'])
    // 深度3 精确挂载链：释义→POS，synonyms→释义，synonym_item→synonyms
    const pos = r.data.find(fv => fv.fieldId === 'f_part_of_speech')!
    const def = r.data.find(fv => fv.fieldId === 'f_english_definition')!
    const syn = r.data.find(fv => fv.fieldId === 'f_synonyms')!
    const item = r.data.find(fv => fv.fieldId === 'f_synonym_item')!
    expect(def.parentId).toBe(pos.id)
    expect(syn.parentId).toBe(def.id)
    expect(item.parentId).toBe(syn.id)
  })
})

describe('wordService 词操作', () => {
  it('deleteWord 删除单词返回 true', async () => {
    const w = await wordsDb.createWord({ lemma: 'del-me' })
    if (!w.ok) throw new Error('createWord failed')
    expect(await deleteWord(w.data.id)).toBe(true)
  })

  it('getPreviews 返回词性标签预览', async () => {
    const w = await wordsDb.createWord({ lemma: 'run' })
    if (!w.ok) throw new Error('createWord failed')
    await fieldsDb.insertFieldValue({ wordId: w.data.id, fieldId: 'f_part_of_speech', value: 'v.', source: 'ecdict' })
    const previews = await getPreviews()
    const p = previews.find(x => x.id === w.data.id)
    expect(p?.partOfSpeechTags).toEqual(['v.'])
  })
})
