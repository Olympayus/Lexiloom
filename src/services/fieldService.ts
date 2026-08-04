import * as fieldsDb from '../db/fields'
import type { FieldDefinition, FieldValue, UpsertFieldValueInput, FieldValueContentUpdate } from '../types/field'

let defsCache: FieldDefinition[] | null = null

export async function getDefinitions(): Promise<FieldDefinition[]> {
  if (defsCache) return defsCache
  const result = await fieldsDb.getFieldDefinitions()
  if (result.ok) {
    defsCache = result.data
    return result.data
  }
  return []
}

export function clearDefinitionsCache() {
  defsCache = null
}

// Single insert (no dedup check)
export async function insertValue(input: UpsertFieldValueInput): Promise<FieldValue | null> {
  const result = await fieldsDb.insertFieldValue(input)
  return result.ok ? result.data : null
}

// Add a new empty user field_value for the given word + field (add-field flow).
export async function addFieldValue(wordId: string, fieldId: string): Promise<FieldValue | null> {
  return insertValue({ wordId, fieldId, value: '', source: 'user' })
}

// Batch insert multiple field values (used for dictionary imports)
export async function insertValues(inputs: UpsertFieldValueInput[]): Promise<FieldValue[]> {
  const results: FieldValue[] = []
  for (const input of inputs) {
    const result = await fieldsDb.insertFieldValue(input)
    if (result.ok && result.data) results.push(result.data)
  }
  return results
}

// Update an existing field_value row by its id (used by WordWorkbench user-edit flow).
// Precise by-id targeting fixes editing the 2nd+ value of a multi-value field.
export async function updateValueById(id: string, input: FieldValueContentUpdate): Promise<FieldValue | null> {
  const result = await fieldsDb.updateFieldValueById(id, input)
  return result.ok ? result.data : null
}

// Revert a field_value to its original value (clears edited state).
export async function restoreValue(id: string): Promise<FieldValue | null> {
  const result = await fieldsDb.restoreFieldValue(id)
  return result.ok ? result.data : null
}

// Rewrite display_order for the given field_value ids (drag-to-reorder flow).
export async function reorderValues(entries: { id: string; displayOrder: number }[]): Promise<boolean> {
  const result = await fieldsDb.reorderFieldValues(entries)
  return result.ok
}

export async function getValues(wordId: string): Promise<FieldValue[]> {
  const result = await fieldsDb.getFieldValuesForWord(wordId)
  if (!result.ok) return []

  // Build maps for tree aggregation
  const fvMap = new Map<string, FieldValue>()
  const childrenMap = new Map<string, FieldValue[]>()

  for (const fv of result.data) {
    fvMap.set(fv.id, { ...fv, children: [] })
    if (fv.parentId) {
      if (!childrenMap.has(fv.parentId)) childrenMap.set(fv.parentId, [])
      childrenMap.get(fv.parentId)!.push(fvMap.get(fv.id)!)
    }
  }

  // Attach children to parents
  for (const [parentId, children] of childrenMap) {
    const parent = fvMap.get(parentId)
    if (parent) parent.children = children
  }

  // Return root-level nodes (entries without a parentId)
  return result.data
    .filter(fv => !fv.parentId)
    .map(fv => ({ ...fv, children: childrenMap.get(fv.id) || [] }))
}
