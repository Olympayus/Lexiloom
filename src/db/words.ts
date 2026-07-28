import { getDb } from './connection'
import type { Word, WordWithPreview, CreateWordInput } from '../types/word'
import type { DbResult } from './types'

export async function createWord(input: CreateWordInput): Promise<DbResult<Word>> {
  try {
    const db = getDb()
    const id = crypto.randomUUID()
    const now = Date.now()
    const normalized = input.lemma.toLowerCase().trim()
    await db.execute(
      `INSERT INTO words (id, lemma, normalized_lemma, language, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?5)`,
      [id, input.lemma, normalized, input.language || 'en', now]
    )
    return { ok: true, data: { id, lemma: input.lemma, normalizedLemma: normalized, language: input.language || 'en', createdAt: now, updatedAt: now } }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function getAllWords(): Promise<DbResult<Word[]>> {
  try {
    const rows = await getDb().select<Record<string, any>[]>('SELECT * FROM words ORDER BY updated_at DESC')
    return {
      ok: true,
      data: rows.map(r => ({
        id: r.id,
        lemma: r.lemma,
        normalizedLemma: r.normalized_lemma,
        language: r.language,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function getWordsWithPreviews(): Promise<DbResult<WordWithPreview[]>> {
  try {
    const db = getDb()
    // 1. Get field definition IDs for chinese_definition and part_of_speech
    const fieldDefs = await db.select<{ id: string; key: string }[]>(
      `SELECT id, key FROM field_definitions WHERE key IN ('chinese_definition', 'part_of_speech')`
    )
    const defMap = new Map<string, string>()
    fieldDefs.forEach(fd => defMap.set(fd.key, fd.id))
    const chineseDefId = defMap.get('chinese_definition')
    const posId = defMap.get('part_of_speech')

    // 2. LEFT JOIN batch query
    const rows = await db.select<Record<string, any>[]>(
      `SELECT w.*,
              MAX(CASE WHEN fv.field_id = ?1 THEN fv.value END) as chinese_definition,
              MAX(CASE WHEN fv.field_id = ?2 THEN fv.value END) as part_of_speech
       FROM words w
       LEFT JOIN field_values fv ON fv.word_id = w.id
       GROUP BY w.id
       ORDER BY w.updated_at DESC`,
      [chineseDefId || '', posId || '']
    )

    return {
      ok: true,
      data: rows.map(r => ({
        id: r.id,
        lemma: r.lemma,
        normalizedLemma: r.normalized_lemma,
        language: r.language,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        chineseDefinition: r.chinese_definition || undefined,
        partOfSpeech: r.part_of_speech || undefined,
      })),
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function getWordByLemma(lemma: string): Promise<DbResult<Word | null>> {
  try {
    const rows = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM words WHERE normalized_lemma = ?1 LIMIT 1', [lemma.toLowerCase().trim()]
    )
    if (rows.length === 0) return { ok: true, data: null }
    const r = rows[0]
    return {
      ok: true,
      data: {
        id: r.id,
        lemma: r.lemma,
        normalizedLemma: r.normalized_lemma,
        language: r.language,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      },
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function deleteWord(id: string): Promise<DbResult<void>> {
  try {
    await getDb().execute('DELETE FROM words WHERE id = ?1', [id])
    return { ok: true, data: undefined }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}
