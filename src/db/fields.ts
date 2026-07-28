import { getDb } from './connection'
import type { FieldValue, UpsertFieldValueInput, FieldDefinition } from '../types/field'
import type { DbResult } from './types'

export async function getFieldDefinitions(): Promise<DbResult<FieldDefinition[]>> {
  try {
    const rows = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM field_definitions ORDER BY display_order'
    )
    return {
      ok: true,
      data: rows.map(r => ({
        id: r.id,
        name: r.name,
        key: r.key,
        fieldType: r.field_type,
        displayOrder: r.display_order,
        createdAt: r.created_at,
      })),
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function getFieldValuesForWord(wordId: string): Promise<DbResult<FieldValue[]>> {
  try {
    const rows = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM field_values WHERE word_id = ?1', [wordId]
    )
    return {
      ok: true,
      data: rows.map(r => ({
        id: r.id,
        wordId: r.word_id,
        fieldId: r.field_id,
        value: r.value,
        source: r.source,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function upsertFieldValue(input: UpsertFieldValueInput): Promise<DbResult<FieldValue>> {
  try {
    const now = Date.now()
    const existing = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM field_values WHERE word_id = ?1 AND field_id = ?2',
      [input.wordId, input.fieldId]
    )
    if (existing.length > 0) {
      await getDb().execute(
        'UPDATE field_values SET value = ?1, source = ?2, updated_at = ?3 WHERE id = ?4',
        [input.value, input.source, now, existing[0].id]
      )
      return {
        ok: true,
        data: {
          id: existing[0].id,
          wordId: existing[0].word_id,
          fieldId: existing[0].field_id,
          value: input.value,
          source: input.source as 'cc-cedict' | 'user',
          createdAt: existing[0].created_at,
          updatedAt: now,
        },
      }
    } else {
      const id = crypto.randomUUID()
      await getDb().execute(
        `INSERT INTO field_values (id, word_id, field_id, value, source, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,
        [id, input.wordId, input.fieldId, input.value, input.source, now]
      )
      return {
        ok: true,
        data: {
          id,
          wordId: input.wordId,
          fieldId: input.fieldId,
          value: input.value,
          source: input.source as 'cc-cedict' | 'user',
          createdAt: now,
          updatedAt: now,
        },
      }
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function deleteFieldValue(wordId: string, fieldId: string): Promise<DbResult<void>> {
  try {
    await getDb().execute(
      'DELETE FROM field_values WHERE word_id = ?1 AND field_id = ?2',
      [wordId, fieldId]
    )
    return { ok: true, data: undefined }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}
