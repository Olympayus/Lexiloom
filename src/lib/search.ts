import { getDb } from '../db/connection'
import type { WordWithPreview } from '../types/word'

export async function vocabularySearch(query: string): Promise<WordWithPreview[]> {
  const db = getDb()
  // Get field definition IDs for preview fields
  const fieldDefs = await db.select<{ id: string; key: string }[]>(
    `SELECT id, key FROM field_definitions WHERE key IN ('chinese_definition', 'part_of_speech')`
  )
  const defMap = new Map(fieldDefs.map(fd => [fd.key, fd.id]))
  const chineseDefId = defMap.get('chinese_definition')
  const posId = defMap.get('part_of_speech')

  if (!query.trim()) {
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
    return rows.map(r => ({
      id: r.id,
      lemma: r.lemma,
      normalizedLemma: r.normalized_lemma,
      language: r.language,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      chineseDefinition: r.chinese_definition || undefined,
      partOfSpeech: r.part_of_speech || undefined,
    }))
  }
  const q = `%${query.toLowerCase().trim()}%`
  const rows = await db.select<Record<string, any>[]>(
    `SELECT w.*,
            MAX(CASE WHEN fv.field_id = ?2 THEN fv.value END) as chinese_definition,
            MAX(CASE WHEN fv.field_id = ?3 THEN fv.value END) as part_of_speech
     FROM words w
     LEFT JOIN field_values fv ON fv.word_id = w.id
     WHERE w.lemma LIKE ?1 OR fv.value LIKE ?1
     GROUP BY w.id
     ORDER BY w.updated_at DESC`,
    [q, chineseDefId || '', posId || '']
  )
  return rows.map(r => ({
    id: r.id,
    lemma: r.lemma,
    normalizedLemma: r.normalized_lemma,
    language: r.language,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    chineseDefinition: r.chinese_definition || undefined,
    partOfSpeech: r.part_of_speech || undefined,
  }))
}
