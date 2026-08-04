import { getDb } from './connection'
import type { FieldValue, UpsertFieldValueInput, FieldDefinition, FieldSource } from '../types/field'
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

// Update one existing field_value row by its id (used by the WordWorkbench user-edit flow).
// Targets the exact row, so editing the 2nd+ value of a multi-value field no longer
// overwrites the first, and display_order / parent_id are preserved.
export async function updateFieldValueById(id: string, value: string, source: FieldSource = 'user'): Promise<DbResult<FieldValue>> {
  try {
    const rows = await getDb().select<Record<string, any>[]>(
      'SELECT * FROM field_values WHERE id = ?1', [id]
    )
    if (rows.length === 0) return { ok: false, error: `field_value not found: ${id}` }
    const now = Date.now()
    await getDb().execute(
      `UPDATE field_values SET value = ?1, source = ?2, updated_at = ?3 WHERE id = ?4`,
      [value, source, now, id]
    )
    const r = rows[0]
    return {
      ok: true,
      data: { ...mapFieldValueRow(r), value, source, updatedAt: now },
    }
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
