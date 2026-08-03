import { describe, it, expect, vi, beforeAll } from 'vitest'
import { getDb } from './connection'
import * as wordsDb from './words'
import * as fieldsDb from './fields'
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

describe('db/words', () => {
  it('createWord 创建并归一化 lemma', async () => {
    const r = await wordsDb.createWord({ lemma: '  Apple ' })
    if (!r.ok) throw new Error('createWord failed')
    expect(r.data.normalizedLemma).toBe('apple')
  })

  it('getWordsWithPreviews 聚合中文释义与词性', async () => {
    const wordResult = await wordsDb.createWord({ lemma: 'run' })
    if (!wordResult.ok) throw new Error('createWord failed')
    const word = wordResult.data
    await fieldsDb.insertFieldValue({ wordId: word.id, fieldId: 'f_chinese_definition', value: '跑步', source: 'ecdict' })
    await fieldsDb.insertFieldValue({ wordId: word.id, fieldId: 'f_part_of_speech', value: 'v.', source: 'ecdict' })
    const r = await wordsDb.getWordsWithPreviews()
    if (!r.ok) throw new Error('getWordsWithPreviews failed')
    const w = r.data.find(x => x.id === word.id)!
    expect(w.chineseDefinition).toBe('跑步')
    expect(w.partOfSpeech).toBe('v.')
  })

  it('searchWords 按 lemma 过滤', async () => {
    await wordsDb.createWord({ lemma: 'perseverance' })
    await wordsDb.createWord({ lemma: 'patience' })
    const hit = await wordsDb.searchWords('sever')
    if (!hit.ok) throw new Error('searchWords failed')
    expect(hit.data.some(w => w.lemma === 'perseverance')).toBe(true)
    expect(hit.data.some(w => w.lemma === 'patience')).toBe(false)
  })

  it('deleteWord 删除单词及其字段（级联）', async () => {
    const wordResult = await wordsDb.createWord({ lemma: 'temp' })
    if (!wordResult.ok) throw new Error('createWord failed')
    const word = wordResult.data
    await fieldsDb.insertFieldValue({ wordId: word.id, fieldId: 'f_phonetic', value: '/temp/', source: 'ecdict' })
    await wordsDb.deleteWord(word.id)
    const all = await wordsDb.getAllWords()
    if (!all.ok) throw new Error('getAllWords failed')
    expect(all.data.some(w => w.id === word.id)).toBe(false)
    const vals = await fieldsDb.getFieldValuesForWord(word.id)
    if (!vals.ok) throw new Error('getFieldValuesForWord failed')
    expect(vals.data.length).toBe(0)
  })
})
