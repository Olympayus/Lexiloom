import { getDb } from './connection'
import type { FieldValue, UpsertFieldValueInput, FieldDefinition, FieldSource, FieldValueContentUpdate } from '../types/field'
import type { DbResult } from './types'

function mapFieldValueRow(r: Record<string, any>): FieldValue {
  return {
    id: r.id, wordId: r.word_id, fieldId: r.field_id, value: r.value, source: r.source,
    displayOrder: r.display_order, parentId: r.parent_id, edited: !!r.edited,
    originalValue: r.original_value ?? null, createdAt: r.created_at, updatedAt: r.updated_at,
  }
}

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
      'SELECT * FROM field_values WHERE word_id = ?1 ORDER BY display_order', [wordId]
    )
    return {
      ok: true,
      data: rows.map(mapFieldValueRow),
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

// Update one existing field_value row by its id, setting only the provided columns.
// Targets the exact row, so editing the 2nd+ value of a multi-value field no longer
// overwrites the first. `source` is never touched here — a user edit must not re-label
// a dictionary (ecdict/wordnet) field as 'user' (spec §5.3).
export async function updateFieldValueById(id: string, input: FieldValueContentUpdate): Promise<DbResult<FieldValue>> {
  try {
    const sets: string[] = []
    const params: unknown[] = []
    if (input.value !== undefined) { sets.push(`value = ?${params.length + 1}`); params.push(input.value) }
    if (input.edited !== undefined) { sets.push(`edited = ?${params.length + 1}`); params.push(input.edited ? 1 : 0) }
    if (input.originalValue !== undefined) { sets.push(`original_value = ?${params.length + 1}`); params.push(input.originalValue) }
    if (sets.length === 0) return { ok: false, error: 'no fields to update' }
    params.push(id)
    await getDb().execute(`UPDATE field_values SET ${sets.join(', ')} WHERE id = ?${params.length}`, params)
    const rows = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM field_values WHERE id = ?1', [id]
    )
    if (rows.length === 0) return { ok: false, error: `field_value not found: ${id}` }
    return { ok: true, data: mapFieldValueRow(rows[0]) }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

// Revert a field_value to its pre-edit state (value back to original_value,
// edited cleared, original_value nulled). No-op if there is nothing to restore.
export async function restoreFieldValue(id: string): Promise<DbResult<FieldValue>> {
  try {
    const rows = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM field_values WHERE id = ?1', [id]
    )
    if (rows.length === 0) return { ok: false, error: `field_value not found: ${id}` }
    if (rows[0].original_value == null) return { ok: false, error: 'no original_value to restore' }
    await getDb().execute(
      `UPDATE field_values SET value = original_value, edited = 0, original_value = NULL, updated_at = ?1 WHERE id = ?2`,
      [Date.now(), id]
    )
    const after = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM field_values WHERE id = ?1', [id]
    )
    return { ok: true, data: mapFieldValueRow(after[0]) }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

// Rewrite display_order for the given field_value ids (drag-to-reorder flow).
export async function reorderFieldValues(entries: { id: string; displayOrder: number }[]): Promise<DbResult<void>> {
  try {
    for (const { id, displayOrder } of entries) {
      await getDb().execute('UPDATE field_values SET display_order = ?1 WHERE id = ?2', [displayOrder, id])
    }
    return { ok: true, data: undefined }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function insertFieldValue(input: UpsertFieldValueInput): Promise<DbResult<FieldValue>> {
  try {
    const id = crypto.randomUUID()
    const now = Date.now()
    await getDb().execute(
      `INSERT INTO field_values (id, word_id, field_id, value, source, edited, original_value, display_order, parent_id, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 0, NULL, ?6, ?7, ?8, ?8)`,
      [id, input.wordId, input.fieldId, input.value, input.source,
       input.displayOrder ?? 0, input.parentId ?? null, now]
    )
    return {
      ok: true,
      data: {
        id,
        wordId: input.wordId,
        fieldId: input.fieldId,
        value: input.value,
        source: input.source as FieldSource,
        edited: false,
        originalValue: null,
        displayOrder: input.displayOrder ?? 0,
        parentId: input.parentId ?? null,
        createdAt: now,
        updatedAt: now,
      },
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function getFieldValuesByParent(parentId: string): Promise<DbResult<FieldValue[]>> {
  try {
    const rows = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM field_values WHERE parent_id = ?1 ORDER BY display_order',
      [parentId]
    )
    return {
      ok: true,
      data: rows.map(mapFieldValueRow),
    }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}

export async function deleteFieldValue(id: string): Promise<DbResult<void>> {
  try {
    await getDb().execute(
      'DELETE FROM field_values WHERE id = ?1',
      [id]
    )
    return { ok: true, data: undefined }
  } catch (e: any) {
    return { ok: false, error: e.toString() }
  }
}
